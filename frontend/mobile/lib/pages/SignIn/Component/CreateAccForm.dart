import 'package:flutter/material.dart';
import '../../../common/AppDatePicker.dart';
import '../../../common/AppDropdown.dart';
import '../../../interfaces/auth.interface.dart';
import '../../../services/auth.service.dart';
import 'Selectgender.dart';

typedef RegistrationOptionsLoader = Future<RegistrationOptions> Function();

class CreateAccountData {
  final String userName;
  final String firstName;
  final String lastName;
  final String email;
  final int departmentId;
  final String userPassword;
  final String? userBirthdate;
  final String? userGender;

  const CreateAccountData({
    required this.userName,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.departmentId,
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
  final RegistrationOptionsLoader? registrationOptionsLoader;

  const CreateAccountForm({super.key, this.registrationOptionsLoader});

  @override
  State<CreateAccountForm> createState() => CreateAccountFormState();
}

class CreateAccountFormState extends State<CreateAccountForm> {
  final TextEditingController usernameController = TextEditingController();
  final TextEditingController firstNameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();

  final TextEditingController passwordController = TextEditingController();

  final TextEditingController confirmPasswordController =
      TextEditingController();

  final TextEditingController birthDateController = TextEditingController();

  String? selectedGender;
  int? selectedFacultyId;
  int? selectedDepartmentId;
  List<FacultyOption> faculties = const [];
  bool _isOptionsLoading = true;
  String? _optionsError;
  String? _formError;
  bool _showPassword = false;
  bool _showConfirmPassword = false;

  String? get validationMessage => _formError;

  static const String _fontFamily = 'Sansation';

  static const Color _accentColor = Color(0xFF9CC5F9);

  static final RegExp _passwordRegex = RegExp(
    r'^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$',
  );

  static final RegExp _emailRegex = RegExp(
    r'^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$',
  );

  FacultyOption? get _selectedFaculty {
    for (final faculty in faculties) {
      if (faculty.facultyId == selectedFacultyId) return faculty;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _loadRegistrationOptions();
  }

  Future<void> _loadRegistrationOptions() async {
    try {
      final loader = widget.registrationOptionsLoader;
      final options = loader == null
          ? await AuthService().getRegistrationOptions()
          : await loader();
      if (!mounted) return;
      setState(() {
        faculties = options.faculties;
        _isOptionsLoading = false;
        _optionsError = faculties.isEmpty
            ? 'ยังไม่มีข้อมูลคณะและสาขา กรุณาติดต่อผู้ดูแลระบบ'
            : null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isOptionsLoading = false;
        _optionsError = '$error';
      });
    }
  }

  CreateAccountData? validateAndGetData() {
    final username = usernameController.text.trim();
    final firstName = firstNameController.text.trim();
    final lastName = lastNameController.text.trim();
    final email = emailController.text.trim();
    final password = passwordController.text;
    final confirmPassword = confirmPasswordController.text;

    if (username.isEmpty) {
      _setFormError('กรุณาป้อนชื่อผู้ใช้');
      return null;
    }
    if (firstName.isEmpty) {
      _setFormError('กรุณาป้อนชื่อ');
      return null;
    }
    if (lastName.isEmpty) {
      _setFormError('กรุณาป้อนนามสกุล');
      return null;
    }
    if (email.isEmpty) {
      _setFormError('กรุณาป้อนอีเมล');
      return null;
    }
    if (!_emailRegex.hasMatch(email)) {
      _setFormError('รูปแบบอีเมลไม่ถูกต้อง');
      return null;
    }
    if (selectedFacultyId == null) {
      _setFormError('กรุณาเลือกคณะ');
      return null;
    }
    if (selectedDepartmentId == null || selectedDepartmentId! <= 0) {
      _setFormError('กรุณาเลือกสาขา');
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
    final birthdate = birthDateController.text.trim();
    _setFormError(null);
    return CreateAccountData(
      userName: username,
      firstName: firstName,
      lastName: lastName,
      email: email,
      departmentId: selectedDepartmentId!,
      userPassword: password,
      userBirthdate: birthdate.isEmpty
          ? null
          : formatBirthDateForApi(birthdate),
      userGender: selectedGender?.toLowerCase(),
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
    firstNameController.dispose();
    lastNameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    birthDateController.dispose();
    super.dispose();
  }

  Future<void> selectBirthDate() async {
    final DateTime now = DateTime.now();

    final DateTime? selectedDate = await showAppDatePicker(
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

  Widget _buildLabel(String text, {bool required = false}) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Row(
        children: [
          Text(
            text,
            style: const TextStyle(
              color: Colors.black87,
              fontFamily: _fontFamily,
              fontWeight: FontWeight.w400,
              fontSize: 14,
            ),
          ),
          if (required)
            const Text(
              ' *',
              style: TextStyle(
                color: Color(0xFFDC2626),
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
        ],
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
        color: const Color(0xEBFFFFFF),
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
            _buildLabel('username', required: true),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-username-field'),
              controller: usernameController,
              style: inputTextStyle,
              textInputAction: TextInputAction.next,
              decoration: _inputDecoration(hintText: 'Enter username'),
            ),

            const SizedBox(height: 18),

            _buildLabel('First name', required: true),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-first-name-field'),
              controller: firstNameController,
              style: inputTextStyle,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.givenName],
              decoration: _inputDecoration(hintText: 'Enter first name'),
            ),

            const SizedBox(height: 18),

            _buildLabel('Last name', required: true),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-last-name-field'),
              controller: lastNameController,
              style: inputTextStyle,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.familyName],
              decoration: _inputDecoration(hintText: 'Enter last name'),
            ),

            const SizedBox(height: 18),

            _buildLabel('Email', required: true),

            const SizedBox(height: 8),

            TextFormField(
              key: const Key('signup-email-field'),
              controller: emailController,
              style: inputTextStyle,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: _inputDecoration(hintText: 'Enter email'),
            ),

            const SizedBox(height: 18),

            _buildLabel('คณะ', required: true),

            const SizedBox(height: 8),

            AppDropdown<int>(
              key: const Key('signup-faculty-field'),
              value: selectedFacultyId,
              hintText: _isOptionsLoading ? 'กำลังโหลด...' : 'เลือกคณะ',
              enabled: !_isOptionsLoading && faculties.isNotEmpty,
              items: faculties
                  .map(
                    (faculty) => AppDropdownItem<int>(
                      value: faculty.facultyId,
                      label: faculty.facultyName,
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() {
                selectedFacultyId = value;
                selectedDepartmentId = null;
              }),
            ),

            const SizedBox(height: 18),

            _buildLabel('สาขา', required: true),

            const SizedBox(height: 8),

            AppDropdown<int>(
              key: const Key('signup-department-field'),
              value: selectedDepartmentId,
              hintText: selectedFacultyId == null
                  ? 'เลือกคณะก่อน'
                  : 'เลือกสาขา',
              enabled:
                  !_isOptionsLoading &&
                  (_selectedFaculty?.departments.isNotEmpty ?? false),
              items:
                  _selectedFaculty?.departments
                      .map(
                        (department) => AppDropdownItem<int>(
                          value: department.departmentId,
                          label: department.departmentName,
                        ),
                      )
                      .toList() ??
                  const [],
              onChanged: (value) =>
                  setState(() => selectedDepartmentId = value),
            ),

            if (_optionsError != null) ...[
              const SizedBox(height: 8),
              Text(
                _optionsError!,
                key: const Key('signup-options-error'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: Color(0xFFE14F79)),
              ),
            ],

            const SizedBox(height: 18),

            /// Password
            _buildLabel('password', required: true),

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
            _buildLabel('Confirm Password', required: true),

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
                        color: Color(0xFFF080A7),
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
