import 'dart:ui';
import 'package:flutter/material.dart';
import 'process_screen.dart';
import 'settings_screen.dart';
import 'fingerprint_screen.dart';

// Nafath color constants
class NafathColors {
  static const Color background = Color(0xFF0D1B2A);
  static const Color cardBackground = Color(0xFF1B2838);
  static const Color teal = Color(0xFF4ECDC4);
  static const Color tealLight = Color(0xFF6EE7DF);
  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Color(0xFF8B9CAF);
}

class HomeScreen extends StatefulWidget {
  final String nationalId;

  const HomeScreen({super.key, required this.nationalId});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 1; // Start with middle tab (Home)

  late List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      SettingsScreen(nationalId: widget.nationalId),
      const ProcessScreen(),
      FingerprintScreen(nationalId: widget.nationalId),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NafathColors.background,
      extendBody: true,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: _buildNafathBottomNav(),
    );
  }

  Widget _buildNafathBottomNav() {
    return Container(
      margin: const EdgeInsets.fromLTRB(24, 0, 24, 34),
      height: 60,
      decoration: BoxDecoration(
        color: NafathColors.cardBackground,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(
            index: 0,
            icon: Icons.settings_outlined,
          ),
          _buildNavItem(
            index: 1,
            icon: Icons.blur_on,
          ),
          _buildNavItem(
            index: 2,
            icon: Icons.fingerprint,
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
  }) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 90,
        height: 60,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            // Top indicator line
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              height: 3,
              width: isSelected ? 60 : 0,
              decoration: BoxDecoration(
                color: NafathColors.teal,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Spacer(),
            Icon(
              icon,
              size: 26,
              color: isSelected ? NafathColors.teal : NafathColors.textSecondary,
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
