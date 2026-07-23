import 'package:flutter/material.dart';
import 'Selectgender.dart';

class CreateAccountData {
  final String userName;
  final String userPassword;
  final String? userBirthdate;
  final String userGender;

  const CreateAccountData({
    required this.userName,
    required this.userPassword,
    required this.userBirthdate,
    required this.userGender,
  });
}

String? formatBirthDateForApi(String value) {
  final parts = value.trim().split('/');
  if (parts.length != 3) return null;

  final day = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);
  final year = int.tryParse(parts[2]);
  if (day == null || month == null || year == null) return null;

  final date = DateTime(year, month, day);
  if (date.year != year || date.month != month || date.day != day) return null;

  return '${year.toString().padLeft(4, '0')}-'
      '${month.toString().padLeft(2, '0')}-'
      '${day.toString().padLeft(2, '0')}';
}

class CreateAccountForm extends StatefulWidget {
  const CreateAccountForm({super.key});

  @override
  State<CreateAccountForm> createState() => CreateAccountFormState();
}

class CreateAccountFormState extends State<CreateAccountForm> {
  final TextEditingController usernameController = TextEditingController();

  final TextEditingController passwordController = TextEditingController();

  final TextEditingController confirmPasswordController =
      TextEditingController();

  final TextEditingController birthDateController = TextEditingController();

  String? selectedGender;
  String? _formError;
  bool _showPassword = false;
  bool _showConfirmPassword = false;

  String? get validationMessage => _formError;

  static const String _fontFamily = 'Sansation';

  static const Color _accentColor = Color(0xFF9CC5F9);

  static final RegExp _passwordRegex = RegExp(
    r'^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$',
  );

  CreateAccountData? validateAndGetData() {
    final username = usernameController.text.trim();
    final password = passwordController.text;
    final confirmPassword = confirmPasswordController.text;

    if (username.isEmpty) {
      _setFormError('กรุณาป้อนชื่อผู้ใช้');
      return null;
    }
    if (password.isEmpty) {
      _setFormError('กรุณาป้อนรหัสผ่าน');
      return null;
    }
    if (!_passwordRegex.hasMatch(password)) {
      _setFormError(
        'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษ'
        'กับอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว',
      );
      return null;
    }
    if (password != confirmPassword) {
      _setFormError('รหัสผ่านไม่ตรงกัน');
      return null;
    }
    if (selectedGender == null) {
      _setFormError('กรุณาเลือกเพศ');
      return null;
    }

    final birthdate = birthDateController.text.trim();
    _setFormError(null);
    return CreateAccountData(
      userName: username,
      userPassword: password,
      userBirthdate: birthdate.isEmpty
          ? null
          : formatBirthDateForApi(birthdate),
      userGender: selectedGender!.toLowerCase(),
    );
  }

  void _setFormError(String? message) {
    if (!mounted) return;
    setState(() {
      _formError = message;
    });
  }

  @override
  void dispose() {
    usernameController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    birthDateController.dispose();
    super.dispose();
  }

  Future<void> selectBirthDate() async {
    final DateTime now = DateTime.now();

    final DateTime? selectedDate = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 18, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
    );

    if (selectedDate == null || !mounted) {
      return;
    }

    setState(() {
      birthDateController.text =
          '${selectedDate.day.toString().padLeft(2, '0')}/'
          '${selectedDate.month.toString().padLeft(2, '0')}/'
          '${selectedDate.year}';
    });
  }

  /// ขอบของช่อง Input
  OutlineInputBorder _inputBorder({Color color = const Color(0x4D000000)}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: BorderSide(color: color, width: 1),
    );
  }

  /// ดีไซน์ช่อง Input แบบเดียวกับหน้า Login
  InputDecoration _inputDecoration({
    required String hintText,
    Widget? suffixIcon,
    EdgeInsetsGeometry? contentPadding,
  }) {
    return InputDecoration(
      hintText: hintText,

      hintStyle: const TextStyle(
        color: Color(0x80000000),
        fontFamily: _fontFamily,
        fontWeight: FontWeight.w300,
        fontSize: 13,
      ),

      filled: true,
      fillColor: Colors.white,

      isDense: true,

      contentPadding:
          contentPadding ??
          const EdgeInsets.symmetric(horizontal: 20, vertical: 14),

      suffixIcon: suffixIcon,

      border: _inputBorder(),

      enabledBorder: _inputBorder(),

      focusedBorder: _inputBorder(color: _accentColor),

      errorBorder: _inputBorder(color: const Color(0xFFB3261E)),

      focusedErrorBorder: _inputBorder(color: const Color(0xFFB3261E)),

      errorStyle: const TextStyle(
        color: Color(0xFFB3261E),
        fontFamily: _fontFamily,
        fontWeight: FontWeight.w300,
        fontSize: 11,
      ),

      errorMaxLines: 2,
    );
  }

  Widget _buildLabel(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.black87,
          fontFamily: _fontFamily,
          fontWeight: FontWeight.w400,
          fontSize: 14,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.sizeOf(context).width;

    final bool mobile = screenWidth < 600;

    final double horizontalPadding = mobile ? 24 : 40;

    const TextStyle inputTextStyle = TextStyle(
      color: Colors.black,
      fontFamily: _fontFamily,
      fontWeight: FontWeight.w300,
      fontSize: 14,
    );

    return Container(
      key: const Key('create-account-card'),

      width: double.infinity,

      constraints: const BoxConstraints(maxWidth: 500, minHeight: 420),

      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: mobile ? 24 : 40,
      ),

      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.92),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),

      child: Form(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Create Account',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.black,
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w400,
                fontSize: mobile ? 24 : 32,
              ),
            ),

            SizedBox(height: mobile ? 24 : 32),

            if (_formError != null) ...[
              Container(
                key: const Key('signup-account-error'),
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _formError!,
                  style: const TextStyle(
                    color: Color(0xFFDC2626),
                    fontFamily: _fontFamily,
                    fontWeight: FontWeight.w300,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            /// Username
            _buildLabel('username'),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-username-field'),
              controller: usernameController,
              style: inputTextStyle,
              textInputAction: TextInputAction.next,
              decoration: _inputDecoration(hintText: 'Enter username'),
            ),

            const SizedBox(height: 18),

            /// Password
            _buildLabel('password'),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-password-field'),
              controller: passwordController,
              obscureText: !_showPassword,
              style: inputTextStyle,
              textInputAction: TextInputAction.next,
              decoration: _inputDecoration(
                hintText: 'Enter password',
                suffixIcon: IconButton(
                  key: const Key('signup-password-visibility'),
                  tooltip: _showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน',
                  onPressed: () {
                    setState(() {
                      _showPassword = !_showPassword;
                    });
                  },
                  icon: Icon(
                    _showPassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: Colors.grey.shade500,
                    size: 21,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 6),

            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษ',
                style: TextStyle(
                  color: Color(0xFF9CA3AF),
                  fontFamily: _fontFamily,
                  fontWeight: FontWeight.w300,
                  fontSize: 11,
                ),
              ),
            ),

            const SizedBox(height: 18),

            /// Confirm Password
            _buildLabel('Confirm Password'),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-confirm-password-field'),
              controller: confirmPasswordController,
              obscureText: !_showConfirmPassword,
              style: inputTextStyle,
              textInputAction: TextInputAction.done,
              decoration: _inputDecoration(
                hintText: 'Confirm password',
                suffixIcon: IconButton(
                  key: const Key('signup-confirm-password-visibility'),
                  tooltip: _showConfirmPassword
                      ? 'ซ่อนรหัสผ่านยืนยัน'
                      : 'แสดงรหัสผ่านยืนยัน',
                  onPressed: () {
                    setState(() {
                      _showConfirmPassword = !_showConfirmPassword;
                    });
                  },
                  icon: Icon(
                    _showConfirmPassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: Colors.grey.shade500,
                    size: 21,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 18),

            /// Birth Date
            _buildLabel('Birth Date'),

            const SizedBox(height: 8),

            Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: mobile ? screenWidth * 0.50 : 210,

                child: TextFormField(
                  key: const Key('signup-birthdate-field'),
                  controller: birthDateController,

                  readOnly: true,

                  onTap: selectBirthDate,

                  style: inputTextStyle.copyWith(color: Colors.grey.shade600),

                  decoration: _inputDecoration(
                    hintText: 'dd/mm/yyyy',

                    contentPadding: const EdgeInsets.only(
                      left: 18,
                      right: 4,
                      top: 14,
                      bottom: 14,
                    ),

                    suffixIcon: IconButton(
                      onPressed: selectBirthDate,
                      icon: const Icon(
                        Icons.calendar_month,
                        size: 21,
                        color: Color(0xFFFFB9DF),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 18),

            /// Select Gender
            Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: mobile ? screenWidth * 0.50 : 210,

                child: SelectGender(
                  value: selectedGender,
                  onChanged: (gender) {
                    setState(() {
                      selectedGender = gender;
                    });
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
