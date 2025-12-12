import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'home_screen.dart';

class SettingsScreen extends StatefulWidget {
  final String nationalId;

  const SettingsScreen({super.key, required this.nationalId});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  int _selectedTheme = 2; // 0: light, 1: dark, 2: system
  int _selectedLanguage = 0; // 0: Arabic, 1: English

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NafathColors.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 20),
                // Title centered
                const Text(
                  'الإعدادات',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: NafathColors.teal,
                  ),
                ),
                const SizedBox(height: 30),
                
                // المظهر (Appearance) Section
                _buildSectionTitle('المظهر'),
                const SizedBox(height: 12),
                _buildSettingsCard([
                  _buildRadioTile(
                    icon: Icons.light_mode_outlined,
                    title: 'الوضع الفاتح',
                    value: 0,
                    groupValue: _selectedTheme,
                    onChanged: (val) => setState(() => _selectedTheme = val!),
                  ),
                  _buildDivider(),
                  _buildRadioTile(
                    icon: Icons.dark_mode_outlined,
                    title: 'الوضع الداكن',
                    value: 1,
                    groupValue: _selectedTheme,
                    onChanged: (val) => setState(() => _selectedTheme = val!),
                  ),
                  _buildDivider(),
                  _buildRadioTile(
                    icon: Icons.settings_suggest_outlined,
                    title: 'إعدادات النظام',
                    value: 2,
                    groupValue: _selectedTheme,
                    onChanged: (val) => setState(() => _selectedTheme = val!),
                    isSelected: true,
                  ),
                ]),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Text(
                      'عند تفعيل خاصية إعدادات النظام سيستخدم التطبيق ألوان النظام الحالية',
                      style: TextStyle(
                        fontSize: 12,
                        color: NafathColors.textSecondary,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // اللغة (Language) Section
                _buildSectionTitle('اللغة'),
                const SizedBox(height: 12),
                _buildSettingsCard([
                  _buildLanguageTile(
                    flag: '🇸🇦',
                    title: 'العربية',
                    value: 0,
                    groupValue: _selectedLanguage,
                    onChanged: (val) => setState(() => _selectedLanguage = val!),
                  ),
                  _buildDivider(),
                  _buildLanguageTile(
                    flag: '🇺🇸',
                    title: 'English',
                    value: 1,
                    groupValue: _selectedLanguage,
                    onChanged: (val) => setState(() => _selectedLanguage = val!),
                  ),
                ]),
                
                const SizedBox(height: 24),
                
                // التواصل (Contact) Section
                _buildSectionTitle('التواصل'),
                const SizedBox(height: 12),
                _buildContactCard(
                  icon: Icons.phone_outlined,
                  title: '8001221111',
                  subtitle: 'وقت الاستجابة: 60 ثانية',
                  titleColor: NafathColors.teal,
                ),
                const SizedBox(height: 8),
                _buildContactCard(
                  icon: Icons.mail_outline,
                  title: 'Support@nic.gov.sa',
                  subtitle: 'وقت الاستجابة: 60 دقيقة',
                  titleColor: NafathColors.teal,
                ),
                const SizedBox(height: 8),
                _buildContactCard(
                  icon: Icons.close, // X icon for Twitter
                  title: '@NIC_Care',
                  subtitle: 'وقت الاستجابة: 120 دقيقة',
                  titleColor: NafathColors.teal,
                ),
                
                const SizedBox(height: 16),
                Text(
                  'جميع القنوات متاحة على مدار ٢٤ / ٧ لمساعدتكم',
                  style: TextStyle(
                    fontSize: 13,
                    color: NafathColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'الوقت المتوقع لمعالجة البلاغات (١٥) يوم',
                  style: TextStyle(
                    fontSize: 13,
                    color: NafathColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 24),
                
                // لمعرفة المزيد (Learn More) Section
                _buildSectionTitle('لمعرفة المزيد'),
                const SizedBox(height: 12),
                _buildSettingsCard([
                  _buildInfoTile(icon: Icons.info_outline, title: 'عن تطبيق نفاذ'),
                  _buildDivider(),
                  _buildInfoTile(icon: Icons.help_outline, title: 'الأسئلة الشائعة'),
                  _buildDivider(),
                  _buildInfoTile(icon: Icons.shield_outlined, title: 'سياسة الخصوصية'),
                  _buildDivider(),
                  _buildInfoTile(icon: Icons.menu_book_outlined, title: 'دليل المستخدم'),
                  _buildDivider(),
                  _buildInfoTile(icon: Icons.description_outlined, title: 'اتفاقية مستوى الخدمة'),
                  _buildDivider(),
                  _buildInfoTile(icon: Icons.article_outlined, title: 'بنود الاتصال'),
                ]),
                
                const SizedBox(height: 24),
                
                // Logout Button
                _buildLogoutButton(context),
                
                const SizedBox(height: 20),
                
                // Version
                Text(
                  '12.4',
                  style: TextStyle(
                    fontSize: 14,
                    color: NafathColors.textSecondary,
                  ),
                ),
                
                const SizedBox(height: 120),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Align(
      alignment: Alignment.centerRight,
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: NafathColors.textSecondary,
        ),
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: NafathColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildRadioTile({
    required IconData icon,
    required String title,
    required int value,
    required int groupValue,
    required ValueChanged<int?> onChanged,
    bool isSelected = false,
  }) {
    final selected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Radio button
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? NafathColors.teal : NafathColors.textSecondary,
                  width: 2,
                ),
              ),
              child: selected
                  ? Center(
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: NafathColors.teal,
                        ),
                      ),
                    )
                  : null,
            ),
            const Spacer(),
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                color: NafathColors.textPrimary,
              ),
            ),
            const SizedBox(width: 12),
            Icon(
              icon,
              size: 24,
              color: NafathColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageTile({
    required String flag,
    required String title,
    required int value,
    required int groupValue,
    required ValueChanged<int?> onChanged,
  }) {
    final selected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Radio button
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? NafathColors.teal : NafathColors.textSecondary,
                  width: 2,
                ),
              ),
              child: selected
                  ? Center(
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: NafathColors.teal,
                        ),
                      ),
                    )
                  : null,
            ),
            const Spacer(),
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                color: NafathColors.textPrimary,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              flag,
              style: const TextStyle(fontSize: 24),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color titleColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NafathColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: 28,
            color: NafathColors.teal,
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: titleColor,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 13,
                  color: NafathColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String title,
  }) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Icon(
              icon,
              size: 24,
              color: NafathColors.teal,
            ),
            const Spacer(),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                color: NafathColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(
      height: 1,
      color: NafathColors.textSecondary.withOpacity(0.2),
      indent: 16,
      endIndent: 16,
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: NafathColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
            (route) => false,
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.logout,
                size: 24,
                color: Colors.red.shade400,
              ),
              const Spacer(),
              Text(
                'تسجيل الخروج',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.red.shade400,
                ),
              ),
              const SizedBox(width: 16),
            ],
          ),
        ),
      ),
    );
  }
}
