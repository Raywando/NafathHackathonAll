import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'home_screen.dart';
import 'visual_scanner_native.dart';

// Risk assessment result
class RiskResult {
  final int score;
  final String level;
  final List<String> reasons;
  final String assessment;

  RiskResult({
    required this.score,
    required this.level,
    required this.reasons,
    required this.assessment,
  });
}

class ProcessScreen extends StatefulWidget {
  const ProcessScreen({super.key});

  @override
  State<ProcessScreen> createState() => _ProcessScreenState();
}

enum ScreenState { waiting, request, processing, stepUp, autoRejected }

class _ProcessScreenState extends State<ProcessScreen>
    with TickerProviderStateMixin {
  Request? _request;
  late Future<Request?> _fetcher;
  late Timer _timer;
  late AnimationController _animationController;
  final _timeout = 60;
  late int _countdownSeconds;
  late Timer _countdownTimer;
  String apiUrl = "https://medicalai.ngrok.app";
  
  // Risk-based states
  ScreenState _screenState = ScreenState.waiting;
  RiskResult? _riskResult;
  String? _detectedSequence; // Scanned visual sequence
  bool _stepUpVerified = false;

  @override
  void initState() {
    super.initState();
    _fetcher = fetchRequest();
    _timer = Timer.periodic(
      const Duration(seconds: 5),
      (timer) async {
        if (_screenState == ScreenState.waiting) {
        setState(() {
          _fetcher = fetchRequest();
        });
        }
      },
    );
    _countdownSeconds = _timeout;
    _animationController = AnimationController(
      vsync: this,
      duration: Duration(seconds: _countdownSeconds),
    );
  }

  void _startCountdown() {
    _animationController.forward();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdownSeconds > 0) {
        setState(() {
          _countdownSeconds--;
        });
      } else {
        timer.cancel();
        _handleReject();
      }
    });
  }


  void _handleApprove() async {
    _timer.cancel();
    _countdownTimer.cancel();
    _animationController.stop();
    
    // Show processing state
    setState(() {
      _screenState = ScreenState.processing;
    });

    try {
      final response = await post(
      Uri.parse("$apiUrl/api/approval"),
      body: jsonEncode({"status": "approved"}),
      headers: {"Content-Type": "application/json"},
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        
        // Parse risk assessment
        if (responseData['approval_risk'] != null) {
          final riskData = jsonDecode(responseData['approval_risk']);
          final riskScore = riskData['risk_score'] as int? ?? 0;
          
          _riskResult = RiskResult(
            score: riskScore,
            level: riskData['risk_level'] ?? 'UNKNOWN',
            reasons: List<String>.from(riskData['risk_reasons'] ?? []),
            assessment: riskData['overall_assessment'] ?? '',
          );

          // Risk-based decision
          if (riskScore > 80) {
            // HIGH RISK - Auto reject
            setState(() {
              _screenState = ScreenState.autoRejected;
            });
            
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('تم رفض الطلب تلقائياً - درجة المخاطر عالية ($riskScore%)'),
                backgroundColor: Colors.red.shade700,
                behavior: SnackBarBehavior.floating,
                duration: const Duration(seconds: 4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            );
            
            // Wait then go back to waiting
            await Future.delayed(const Duration(seconds: 5));
            repaint();
            
          } else if (riskScore >= 50 && riskScore <= 75) {
            // MEDIUM RISK - Step-up authentication with Visual Scanner
            _detectedSequence = null;
            _stepUpVerified = false;
            
            setState(() {
              _screenState = ScreenState.stepUp;
            });
            
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('مطلوب مسح مرئي - درجة المخاطر متوسطة ($riskScore%)'),
                backgroundColor: Colors.orange.shade700,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            );
            
          } else {
            // LOW RISK - Accept normally
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('تم قبول الطلب بنجاح ✓ (درجة المخاطر: $riskScore%)'),
                backgroundColor: NafathColors.teal,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            );
            
            await Future.delayed(const Duration(milliseconds: 500));
            repaint();
          }
        } else {
          // No risk data - accept normally
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('تم قبول الطلب'),
              backgroundColor: NafathColors.teal,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
          await Future.delayed(const Duration(milliseconds: 500));
          repaint();
        }
      }
    } catch (e) {
      print("Error approving: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('حدث خطأ في معالجة الطلب'),
          backgroundColor: Colors.red.shade400,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      repaint();
    }
  }

  void _handleStepUpVerify() async {
    setState(() {
      _stepUpVerified = true;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('تم التحقق بنجاح ✓'),
        backgroundColor: NafathColors.teal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
    
    await Future.delayed(const Duration(seconds: 2));
    repaint();
  }

  void _handleReject() async {
    _timer.cancel();
    _countdownTimer.cancel();
    _animationController.stop();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('تم رفض الطلب'),
        backgroundColor: Colors.red.shade400,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );

    try {
      await post(
        Uri.parse("$apiUrl/api/approval"),
        body: jsonEncode({"status": "rejected"}),
        headers: {"Content-Type": "application/json"},
      );
    } catch (e) {
      print("Error rejecting: $e");
    }
    
    await Future.delayed(const Duration(milliseconds: 500));
    repaint();
  }

  @override
  void dispose() {
    _timer.cancel();
    _animationController.dispose();
    if (_request != null) {
      _countdownTimer.cancel();
    }
    super.dispose();
  }

  void repaint() {
    _countdownTimer.cancel();
    _animationController.dispose();

    setState(() {
      _request = null;
      _countdownSeconds = _timeout;
      _screenState = ScreenState.waiting;
      _riskResult = null;
      _detectedSequence = null;
      _stepUpVerified = false;
    });

    _animationController = AnimationController(
      vsync: this,
      duration: Duration(seconds: _countdownSeconds),
    );

    _fetcher = fetchRequest();
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (_screenState == ScreenState.waiting) {
      setState(() {
        _fetcher = fetchRequest();
      });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NafathColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const SizedBox(height: 20),
            // Title centered
            const Text(
              'الطلبات',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: NafathColors.teal,
              ),
            ),
            // Content based on state
            Expanded(
              child: _buildContent(),
            ),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (_screenState) {
      case ScreenState.waiting:
        return FutureBuilder(
          future: _fetcher,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              _request = snapshot.data;
              if (_request == null) {
                return _buildWaitingState();
              } else {
                _timer.cancel();
                if (_animationController.status == AnimationStatus.dismissed) {
                  _startCountdown();
                }
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_screenState == ScreenState.waiting && _request != null) {
                    setState(() {
                      _screenState = ScreenState.request;
                    });
                  }
                });
                return _buildRequestState();
              }
            } else {
              return _buildWaitingState();
            }
          },
        );
      case ScreenState.request:
        return _buildRequestState();
      case ScreenState.processing:
        return _buildProcessingState();
      case ScreenState.stepUp:
        return _buildStepUpState();
      case ScreenState.autoRejected:
        return _buildAutoRejectedState();
    }
  }

  Widget _buildWaitingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 280,
            height: 280,
            child: CustomPaint(
              painter: WaitingCirclePainter(),
              child: const Center(
                child: Text(
                  'التطبيق جاهز لاستقبال الطلبات',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: NafathColors.teal,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 100,
            height: 100,
            child: CircularProgressIndicator(
              color: NafathColors.teal,
              strokeWidth: 3,
            ),
          ),
          const SizedBox(height: 30),
          const Text(
            'جاري تحليل المخاطر...',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: NafathColors.teal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Analyzing risk level',
            style: TextStyle(
              fontSize: 14,
              color: NafathColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAutoRejectedState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.red.shade900.withOpacity(0.3),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.red.shade400, width: 3),
              ),
              child: Icon(
                Icons.block,
                size: 60,
                color: Colors.red.shade400,
              ),
            ),
            const SizedBox(height: 30),
            Text(
              'تم الرفض التلقائي',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.red.shade400,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'درجة المخاطر: ${_riskResult?.score}%',
              style: TextStyle(
                fontSize: 18,
                color: Colors.red.shade300,
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: NafathColors.cardBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    'أسباب الرفض:',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: NafathColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_riskResult != null)
                    ...(_riskResult!.reasons.take(2).map((reason) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        '• ${reason.length > 80 ? '${reason.substring(0, 80)}...' : reason}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: NafathColors.textPrimary,
                        ),
                        textAlign: TextAlign.right,
                        textDirection: TextDirection.rtl,
                      ),
                    ))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepUpState() {
    // If already verified, show success
    if (_stepUpVerified) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.green, width: 3),
              ),
              child: const Icon(Icons.check, size: 50, color: Colors.green),
            ),
            const SizedBox(height: 24),
            const Text(
              'تم التحقق بنجاح',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 8),
            if (_detectedSequence != null)
              Text(
                'التسلسل: $_detectedSequence',
                style: TextStyle(
                  fontSize: 14,
                  color: NafathColors.textSecondary,
                ),
              ),
          ],
        ),
      );
    }
    
    // Native Camera Scanner
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.camera_alt, size: 24, color: Colors.orange.shade400),
              const SizedBox(width: 8),
              Text(
                'المسح المرئي',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.orange.shade400,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'درجة المخاطر: ${_riskResult?.score}%',
            style: TextStyle(fontSize: 14, color: NafathColors.textSecondary),
          ),
          const SizedBox(height: 12),
          
          // Native Scanner
          Expanded(
            child: VisualScannerNative(
              onSequenceDetected: _handleSequenceDetected,
              onCancel: repaint,
            ),
          ),
          
          const SizedBox(height: 100),
        ],
      ),
    );
  }
  
  void _handleSequenceDetected(String sequence) async {
    setState(() {
      _detectedSequence = sequence;
      _stepUpVerified = true;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تم التحقق بنجاح ✓ التسلسل: $sequence'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
    
    // TODO: Send sequence to backend for verification
    // await post(Uri.parse('$apiUrl/api/visual/verify'), body: {'sequence': sequence});
    
    await Future.delayed(const Duration(seconds: 2));
    repaint();
  }
  
  Widget _buildRequestState() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
                  children: [
                    Expanded(
                      child: Center(
              child: SizedBox(
                width: 280,
                height: 280,
                                child: AnimatedBuilder(
                                  animation: _animationController,
                                  builder: (context, child) {
                                    return CustomPaint(
                                      painter: CircularTimerPainter(
                                        progress: _animationController.value,
                                      ),
                                      child: Center(
                                        child: Padding(
                          padding: const EdgeInsets.all(40.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _request?.description ?? '',
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                              fontSize: 14,
                                  color: NafathColors.textPrimary,
                                              fontWeight: FontWeight.w500,
                                  height: 1.5,
                                          ),
                                        ),
                              const SizedBox(height: 16),
                              Text(
                                '$_countdownSeconds',
                                style: TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.bold,
                                  color: _countdownSeconds > 10
                                      ? NafathColors.teal
                                      : Colors.red.shade400,
                                ),
                              ),
                              Text(
                                'ثانية',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: NafathColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                                ),
                              ),
                            ),
                          ),
          // Approve and Reject Buttons
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Row(
              children: [
                          // Reject Button
                          Expanded(
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.red.shade900.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextButton(
                              onPressed: _handleReject,
                      child: Text(
                        'رفض',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.red.shade300,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Approve Button
                Expanded(
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: NafathColors.teal,
                      borderRadius: BorderRadius.circular(12),
                                ),
                    child: TextButton(
                      onPressed: _handleApprove,
                              child: const Text(
                        'قبول',
                                style: TextStyle(
                          fontSize: 16,
                                  fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
      ),
    );
  }

  // Map client names to Arabic
  String _getClientNameArabic(String? clientName) {
    final Map<String, String> clientNames = {
      'MINISTRY_OF_JUSTICE': 'وزارة العدل',
      'REAL_ESTATE_REGISTRARS': 'كتابات العدل',
      'MONSHAAT': 'منشآت',
      'STC_BANK': 'بنك STC',
      'STC': 'STC',
      'SAB_BANK': 'بنك ساب',
      'EJAR': 'إيجار',
      'ALRAJHI_BANK': 'بنك الراجحي',
      'MOBILY': 'موبايلي',
      'ALINMA_BANK': 'بنك الإنماء',
    };
    return clientNames[clientName] ?? clientName ?? 'جهة حكومية';
  }

  // Map operation types to Arabic
  String _getOperationTypeArabic(String? operationType) {
    final Map<String, String> operationTypes = {
      'PLATFORM_LOGIN': 'تسجيل الدخول',
      'REGISTER_ACCOUNT': 'تسجيل حساب جديد',
      'ISSUE_POWER_OF_ATTORNEY': 'إصدار وكالة',
      'OPEN_BANK_ACCOUNT': 'فتح حساب بنكي',
      'ISSUE_NEW_SIM': 'إصدار شريحة جديدة',
      'VERIFY_TRUSTED_DEVICE': 'التحقق من الجهاز',
      'VERIFY_LOAN_REQUEST': 'التحقق من طلب تمويل',
    };
    return operationTypes[operationType] ?? operationType ?? 'تسجيل دخول';
  }

  Future<Request?> fetchRequest() async {
    try {
      final response = await get(Uri.parse("$apiUrl/api/request"));

    if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        
        // Check if response has data (not empty or error)
        if (responseData.isNotEmpty && !responseData.containsKey('error')) {
          // Get target national ID from request metadata
          final targetId = responseData['request_metadata']?['target_national_id'] ?? 'مستخدم';
          
          String description;
          if (responseData.containsKey('operation_details') && 
              responseData['operation_details'] != null) {
            final clientName = _getClientNameArabic(
              responseData['operation_details']['client_name']
            );
            final operationType = _getOperationTypeArabic(
              responseData['operation_details']['operation_type']
            );
            description = "لديك طلب من $clientName\nللقيام بـ $operationType";
          } else {
            description = "لديك طلب تحقق من الهوية\nللرقم $targetId";
          }
          
          return Request(description: description);
      }
    }
    } catch (e) {
      print("Error fetching request: $e");
    }

    return null;
  }
}

class Request {
  final String description;

  Request({required this.description});
}

class WaitingCirclePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final totalDashes = 60;
    final dashAngle = (2 * pi) / totalDashes;
    final dashLength = 20.0;
    final dashWidth = 2.5;

    for (int i = 0; i < totalDashes; i++) {
      final angle = -pi / 2 + (i * dashAngle);
      final startX = center.dx + (radius - dashLength) * cos(angle);
      final startY = center.dy + (radius - dashLength) * sin(angle);
      final endX = center.dx + radius * cos(angle);
      final endY = center.dy + radius * sin(angle);

      final paint = Paint()
        ..strokeWidth = dashWidth
        ..strokeCap = StrokeCap.round
        ..color = NafathColors.cardBackground;

      canvas.drawLine(Offset(startX, startY), Offset(endX, endY), paint);
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}

class CircularTimerPainter extends CustomPainter {
  final double progress;

  CircularTimerPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final totalDashes = 60;
    final dashAngle = (2 * pi) / totalDashes;
    final dashLength = 20.0;
    final dashWidth = 2.5;

    for (int i = 0; i < totalDashes; i++) {
      final angle = -pi / 2 + (i * dashAngle);
      final startX = center.dx + (radius - dashLength) * cos(angle);
      final startY = center.dy + (radius - dashLength) * sin(angle);
      final endX = center.dx + radius * cos(angle);
      final endY = center.dy + radius * sin(angle);

      final paint = Paint()
        ..strokeWidth = dashWidth
        ..strokeCap = StrokeCap.round;

      final dashProgress = i / totalDashes;
      if (dashProgress > progress) {
        paint.color = NafathColors.teal;
      } else {
        paint.color = NafathColors.cardBackground;
      }

      canvas.drawLine(Offset(startX, startY), Offset(endX, endY), paint);
    }
  }

  @override
  bool shouldRepaint(CircularTimerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
