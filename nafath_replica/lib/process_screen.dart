import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:http/http.dart';

class ProcessScreen extends StatefulWidget {
  const ProcessScreen({super.key});

  @override
  State<ProcessScreen> createState() => _ProcessScreenState();
}

class _ProcessScreenState extends State<ProcessScreen>
    with TickerProviderStateMixin {
  Request? _request;
  late Future<Request?> _fetcher;
  late Timer _timer;
  late AnimationController _animationController;
  final _timeout = 60;
  late int _countdownSeconds; // Total countdown time
  late Timer _countdownTimer;
  String apiUrl = "http://localhost:8001";

  @override
  void initState() {
    super.initState();
    _fetcher = fetchRequest();
    _timer = Timer.periodic(
      const Duration(seconds: 5), // Runs every 5 seconds
      (timer) async {
        setState(() {
          _fetcher = fetchRequest();
        });
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
        _handleReject(); // Auto-reject when time runs out
      }
    });
  }

  void _handleApprove() {

    _timer.cancel();
    _countdownTimer.cancel();
    _animationController.stop();
    // Add your approve logic here
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Request Approved')));

    post(
      Uri.parse("$apiUrl/api/approval"),
      body: jsonEncode({"status": "approved"}),
      headers: {"Content-Type": "application/json"},
    ).then((value) => repaint());
  }

  void _handleReject() {
    _timer.cancel();
    _countdownTimer.cancel();
    _animationController.stop();
    // Add your reject logic here
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Request Rejected')));
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
    // Cancel existing timers
    _countdownTimer.cancel();
    _animationController.dispose();

    // Reset state
    setState(() {
      _request = null;
      _countdownSeconds = _timeout;
    });

    // Reinitialize animation controller
    _animationController = AnimationController(
      vsync: this,
      duration: Duration(seconds: _countdownSeconds),
    );

    // Restart fetching requests
    _fetcher = fetchRequest();
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      setState(() {
        _fetcher = fetchRequest();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFFDFDFD),
      body: Center(
        child: FutureBuilder(
          future: _fetcher,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              _request = snapshot.data;
              if (_request == null) {
                return const Text(
                  "Waiting for requests",
                  style: TextStyle(fontSize: 18, color: Color(0xFF5DAFA7)),
                );
              } else {
                _timer.cancel();
                // Start countdown when request is received
                if (_animationController.status == AnimationStatus.dismissed) {
                  _startCountdown();
                }
                return Column(
                  children: [
                    // Circular Timer with Text
                    Expanded(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              final size = constraints.maxWidth;
                              return SizedBox(
                                width: size,
                                height: size,
                                child: AnimatedBuilder(
                                  animation: _animationController,
                                  builder: (context, child) {
                                    return CustomPaint(
                                      painter: CircularTimerPainter(
                                        progress: _animationController.value,
                                      ),
                                      child: Center(
                                        child: Padding(
                                          padding: const EdgeInsets.all(60.0),
                                          child: Text(
                                            _request!.description,
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              color: Color(0xFF5DAFA7),
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                    // Approve and Reject Buttons at bottom
                    Padding(
                      padding: const EdgeInsets.only(
                        bottom: 40.0,
                        left: 20,
                        right: 20,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Approve Button
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _handleApprove,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2D9B94),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 50,
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(13),
                                ),
                              ),
                              child: const Text(
                                'Accept',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 20),
                          // Reject Button
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _handleReject,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFE57373),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 50,
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(13),
                                ),
                              ),
                              child: const Text(
                                'Reject',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }
            } else {
              return const Text(
                "Waiting for requests",
                style: TextStyle(fontSize: 18, color: Color(0xFF5DAFA7)),
              );
            }
          },
        ),
      ),
    );
  }

  Future<Request?> fetchRequest() async {
    Map<String, dynamic> responseData;

    final response = await get(
      Uri.parse("$apiUrl/api/request"),
    );

    if (response.statusCode == 200) {
      responseData = jsonDecode(response.body);
      if (responseData.isNotEmpty) {
        return Request(
          description:
              "You have a request from ${responseData['operation_details']['client_name']} to do ${responseData['operation_details']['operation_type']}",
        );
      }
    }

    print("No request found");
    return null;
    // await Future.delayed(const Duration(seconds: 2));
    // bool doReturn = Random().nextBool();
    // print("doReturn $doReturn");
    // return doReturn
    //     ? Request(description: "You have a login request from IAM")
    //     : null;
  }
}

class Request {
  final String description;

  Request({required this.description});
}

class CircularTimerPainter extends CustomPainter {
  final double progress;

  CircularTimerPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final totalDashes = 60; // Number of dashes around the circle
    final dashAngle = (2 * pi) / totalDashes;
    final dashLength = 35.0;
    final dashWidth = 3.0;

    for (int i = 0; i < totalDashes; i++) {
      final angle = -pi / 2 + (i * dashAngle); // Start from top
      final startX = center.dx + (radius - dashLength) * cos(angle);
      final startY = center.dy + (radius - dashLength) * sin(angle);
      final endX = center.dx + radius * cos(angle);
      final endY = center.dy + radius * sin(angle);

      final paint = Paint()
        ..strokeWidth = dashWidth
        ..strokeCap = StrokeCap.round;

      // Calculate if this dash should be green or gray based on progress
      // Progress goes from 0 to 1, we want green to decrease
      final dashProgress = i / totalDashes;
      if (dashProgress > progress) {
        // Green dashes (remaining time)
        paint.color = const Color(0xFF5DAFA7);
      } else {
        // Gray dashes (elapsed time)
        paint.color = const Color(0xFFE0E0E0);
      }

      canvas.drawLine(Offset(startX, startY), Offset(endX, endY), paint);
    }
  }

  @override
  bool shouldRepaint(CircularTimerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
