import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'home_screen.dart';

/// Native Visual Scanner - Auto-detects and focuses on the bright sphere
class VisualScannerNative extends StatefulWidget {
  final Function(String sequence) onSequenceDetected;
  final VoidCallback onCancel;

  const VisualScannerNative({
    super.key,
    required this.onSequenceDetected,
    required this.onCancel,
  });

  @override
  State<VisualScannerNative> createState() => _VisualScannerNativeState();
}

class _VisualScannerNativeState extends State<VisualScannerNative> {
  CameraController? _controller;
  bool _isInitialized = false;
  bool _isProcessing = false;

  // Detection state
  List<ColorPair> _capturedFrames = [];
  ColorPair? _lastStableColor;
  List<ColorPair> _colorBuffer = [];
  static const int _stabilityThreshold = 3;
  static const int _sequenceLength = 4;
  
  // Current detection
  String _currentCore = '?';
  String _currentAura = '?';
  Color _coreColor = Colors.grey;
  Color _auraColor = Colors.grey;
  Rect? _sphereRect;
  bool _sphereFound = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) return;

      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.bgra8888,
      );

      await _controller!.initialize();
      
      if (mounted) {
        setState(() => _isInitialized = true);
        _startProcessing();
      }
    } catch (_) {}
  }

  void _startProcessing() {
    _controller?.startImageStream((image) {
      if (!_isProcessing && mounted) {
        _isProcessing = true;
        _analyzeFrame(image);
      }
    });
  }

  void _analyzeFrame(CameraImage image) async {
    try {
      final width = image.width;
      final height = image.height;
      if (image.planes.isEmpty) return;

      final plane = image.planes[0];
      final bytes = plane.bytes;
      final bytesPerRow = plane.bytesPerRow;

      // Find the sphere
      final sphere = _findSphere(bytes, width, height, bytesPerRow);
      
      if (sphere == null) {
        if (mounted) setState(() {
          _sphereFound = false;
          _sphereRect = null;
        });
        return;
      }

      // Update UI
      if (mounted) setState(() {
        _sphereFound = true;
        _sphereRect = Rect.fromLTWH(
          sphere.x / width, sphere.y / height,
          sphere.size / width, sphere.size / height,
        );
      });

      // Extract Core (center)
      final coreSize = (sphere.size * 0.4).toInt();
      final coreX = sphere.x + (sphere.size - coreSize) ~/ 2;
      final coreY = sphere.y + (sphere.size - coreSize) ~/ 2;
      final coreRGB = _sampleRegion(bytes, width, height, bytesPerRow, coreX, coreY, coreSize, coreSize);

      // Extract Aura (corners)
      final edgeSize = (sphere.size * 0.2).toInt();
      final corners = [
        _sampleRegion(bytes, width, height, bytesPerRow, sphere.x, sphere.y, edgeSize, edgeSize),
        _sampleRegion(bytes, width, height, bytesPerRow, sphere.x + sphere.size - edgeSize, sphere.y, edgeSize, edgeSize),
        _sampleRegion(bytes, width, height, bytesPerRow, sphere.x, sphere.y + sphere.size - edgeSize, edgeSize, edgeSize),
        _sampleRegion(bytes, width, height, bytesPerRow, sphere.x + sphere.size - edgeSize, sphere.y + sphere.size - edgeSize, edgeSize, edgeSize),
      ];

      int auraR = 0, auraG = 0, auraB = 0, count = 0;
      for (final c in corners) {
        if (c != null) { auraR += c.r; auraG += c.g; auraB += c.b; count++; }
      }

      if (coreRGB == null || count == 0) return;

      final avgR = auraR ~/ count, avgG = auraG ~/ count, avgB = auraB ~/ count;
      final coreCode = _getDominant(coreRGB.r, coreRGB.g, coreRGB.b);
      final auraCode = _getDominant(avgR, avgG, avgB);

      if (mounted) setState(() {
        _currentCore = coreCode;
        _currentAura = auraCode;
        _coreColor = Color.fromARGB(255, coreRGB.r, coreRGB.g, coreRGB.b);
        _auraColor = Color.fromARGB(255, avgR, avgG, avgB);
      });

      if (coreCode != '?' && auraCode != '?') {
        _handleDetection(ColorPair(core: coreCode, aura: auraCode));
      }
    } finally {
      await Future.delayed(const Duration(milliseconds: 80));
      _isProcessing = false;
    }
  }

  _Sphere? _findSphere(List<int> bytes, int w, int h, int bpr) {
    const grid = 20;
    final cellW = w ~/ grid, cellH = h ~/ grid;
    double best = 0;
    int bx = 0, by = 0;

    for (int gy = 0; gy < grid; gy++) {
      for (int gx = 0; gx < grid; gx++) {
        final x = gx * cellW + cellW ~/ 2;
        final y = gy * cellH + cellH ~/ 2;
        final i = y * bpr + x * 4;
        if (i + 3 >= bytes.length) continue;

        final r = bytes[i + 2], g = bytes[i + 1], b = bytes[i];
        final brightness = (r + g + b) / 3;
        final maxC = max(r, max(g, b)), minC = min(r, min(g, b));
        final sat = maxC > 0 ? (maxC - minC) / maxC : 0.0;
        final score = brightness * (0.5 + sat * 0.5);

        if (score > best) { best = score; bx = x; by = y; }
      }
    }

    if (best < 80) return null;
    final size = (min(w, h) * 0.25).toInt();
    return _Sphere(
      x: (bx - size ~/ 2).clamp(0, w - size),
      y: (by - size ~/ 2).clamp(0, h - size),
      size: size,
    );
  }

  _RGB? _sampleRegion(List<int> bytes, int w, int h, int bpr, int x, int y, int rw, int rh) {
    int tr = 0, tg = 0, tb = 0, c = 0;
    for (int dy = 0; dy < rh; dy += 3) {
      for (int dx = 0; dx < rw; dx += 3) {
        final px = (x + dx).clamp(0, w - 1), py = (y + dy).clamp(0, h - 1);
        final i = py * bpr + px * 4;
        if (i + 3 >= bytes.length) continue;
        final r = bytes[i + 2], g = bytes[i + 1], b = bytes[i];
        if (r + g + b < 60) continue;
        tr += r; tg += g; tb += b; c++;
      }
    }
    return c == 0 ? null : _RGB(tr ~/ c, tg ~/ c, tb ~/ c);
  }

  String _getDominant(int r, int g, int b) {
    if ((r + g + b) / 3 < 40) return '?';
    if (max(r, max(g, b)) - min(r, min(g, b)) < 25) return '?';
    if (r > g && r > b) return 'R';
    if (g > r && g > b) return 'G';
    if (b > r && b > g) return 'B';
    return '?';
  }

  void _handleDetection(ColorPair pair) {
    _colorBuffer.add(pair);
    if (_colorBuffer.length > _stabilityThreshold) _colorBuffer.removeAt(0);

    if (_colorBuffer.length >= _stabilityThreshold &&
        _colorBuffer.every((c) => c.core == pair.core && c.aura == pair.aura)) {
      if (_lastStableColor == null || 
          _lastStableColor!.core != pair.core || 
          _lastStableColor!.aura != pair.aura) {
        _lastStableColor = pair;
        _capturedFrames.add(pair);
        setState(() {});
        if (_capturedFrames.length >= _sequenceLength) _onComplete();
      }
    }
  }

  void _onComplete() {
    _controller?.stopImageStream();
    widget.onSequenceDetected(_capturedFrames.map((p) => '${p.core}${p.aura}').join('-'));
  }

  void _reset() {
    setState(() {
      _capturedFrames = [];
      _lastStableColor = null;
      _colorBuffer = [];
      _sphereFound = false;
      _sphereRect = null;
    });
    if (_controller != null && !_controller!.value.isStreamingImages) _startProcessing();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Camera
                if (_isInitialized && _controller != null)
                  CameraPreview(_controller!)
                else
                  Container(
                    color: NafathColors.cardBackground,
                    child: const Center(child: CircularProgressIndicator(color: NafathColors.teal)),
                  ),

                // Tracking box
                if (_sphereFound && _sphereRect != null)
                  LayoutBuilder(builder: (_, c) {
                    final r = _sphereRect!;
                    return Positioned(
                      left: r.left * c.maxWidth,
                      top: r.top * c.maxHeight,
                      width: r.width * c.maxWidth,
                      height: r.height * c.maxHeight,
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: NafathColors.teal, width: 3),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Container(
                            width: 44, height: 44,
                            decoration: BoxDecoration(
                              color: _coreColor,
                              shape: BoxShape.circle,
                              border: Border.all(color: _auraColor, width: 4),
                            ),
                            child: Center(
                              child: Text(
                                '$_currentCore$_currentAura',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }),

                // Scanning indicator
                if (!_sphereFound)
                  Center(
                    child: Container(
                      width: 150, height: 150,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white24, width: 2),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Center(
                        child: Icon(Icons.filter_center_focus, size: 48, color: Colors.white24),
                      ),
                    ),
                  ),

                // Sequence progress
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black87],
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_sequenceLength, (i) {
                        final done = i < _capturedFrames.length;
                        final p = done ? _capturedFrames[i] : null;
                        return Container(
                          width: 48, height: 48,
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          decoration: BoxDecoration(
                            color: done ? _colorFor(p!.core) : Colors.white12,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: done ? _colorFor(p!.aura) : Colors.white24,
                              width: 3,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              done ? '${p!.core}${p.aura}' : '?',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: widget.onCancel,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: BorderSide(color: NafathColors.textSecondary),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('إلغاء'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _reset,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('إعادة'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: NafathColors.cardBackground,
                  foregroundColor: NafathColors.teal,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Color _colorFor(String c) => c == 'R' ? Colors.red : c == 'G' ? Colors.green : c == 'B' ? Colors.blue : Colors.grey;
}

class ColorPair { final String core, aura; ColorPair({required this.core, required this.aura}); }
class _RGB { final int r, g, b; _RGB(this.r, this.g, this.b); }
class _Sphere { final int x, y, size; _Sphere({required this.x, required this.y, required this.size}); }
