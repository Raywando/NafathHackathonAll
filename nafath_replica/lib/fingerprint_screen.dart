import 'package:flutter/material.dart';
import 'home_screen.dart';

class FingerprintScreen extends StatelessWidget {
  final String nationalId;

  const FingerprintScreen({super.key, required this.nationalId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NafathColors.background,
      body: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              // Title centered
              const Text(
                'الخدمات',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: NafathColors.teal,
                ),
              ),
              const SizedBox(height: 8),
              // Welcome message
              Text(
                'مرحباً بك، عبدالله المقيطيب',
                style: TextStyle(
                  fontSize: 16,
                  color: NafathColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              // National ID badge row
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'رقم الهوية الخاص بك',
                    style: TextStyle(
                      fontSize: 14,
                      color: NafathColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: NafathColors.cardBackground,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      nationalId,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: NafathColors.textPrimary,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              // Services section title
              Align(
                alignment: Alignment.centerRight,
                child: const Text(
                  'خدمات نفاذ',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: NafathColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Service cards
              _buildServiceCard(
                icon: Icons.location_on_outlined,
                title: 'التحقق المكاني',
                subtitle: 'تحقق من هويتك عند المنافذ الحدودية',
                onTap: () {},
              ),
              const SizedBox(height: 12),
              _buildServiceCard(
                icon: Icons.history,
                title: 'سجل العمليات',
                subtitle: 'استعرض عملياتك السابقة، حالتها و تاريخها',
                onTap: () {},
              ),
              const Spacer(),
              const SizedBox(height: 120),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NafathColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: NafathColors.teal.withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: NafathColors.teal.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                size: 26,
                color: NafathColors.teal,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: NafathColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: NafathColors.textSecondary,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
