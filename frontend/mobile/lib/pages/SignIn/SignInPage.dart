import 'package:flutter/material.dart';

import '../../common/LogoSection.dart';
import '../../interfaces/auth.interface.dart';
import '../../services/auth.service.dart';
import './Component/Constraint.dart';
import './Component/CreateAccForm.dart';
import './Component/SignInBtn.dart';

typedef RegisterAction = Future<void> Function(RegisterRequest request);

class SigninPage extends StatefulWidget {
  final RegisterAction? registerAction;

  const SigninPage({super.key, this.registerAction});

  @override
  State<SigninPage> createState() => _SigninPageState();
}

class _SigninPageState extends State<SigninPage> {
  final GlobalKey<CreateAccountFormState> _createAccountKey =
      GlobalKey<CreateAccountFormState>();
  final GlobalKey<ConstraintState> _constraintKey =
      GlobalKey<ConstraintState>();

  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _register() async {
    if (_isLoading) return;

    final accountData = _createAccountKey.currentState?.validateAndGetData();
    final constraintData = _constraintKey.currentState?.validateAndGetData();
    if (accountData == null || constraintData == null) {
      final validationMessage = accountData == null
          ? _createAccountKey.currentState?.validationMessage ??
                'กรุณาตรวจสอบข้อมูลบัญชี'
          : _constraintKey.currentState?.validationMessage ??
                'กรุณาตรวจสอบข้อมูล Constraint';
      setState(() {
        _errorMessage = validationMessage;
      });
      await _showErrorDialog(validationMessage);
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final request = RegisterRequest(
      userName: accountData.userName,
      userPassword: accountData.userPassword,
      userBirthdate: accountData.userBirthdate,
      userGender: accountData.userGender,
      dayOff: constraintData.dayOff,
      continuousWorkingDuration: constraintData.continuousWorkingDuration,
      breakTime: constraintData.breakTime,
      startTime: constraintData.startTime,
      endTime: constraintData.endTime,
      busyDays: constraintData.busyDays.isEmpty
          ? null
          : constraintData.busyDays,
    );

    try {
      final action = widget.registerAction;
      if (action != null) {
        await action(request);
      } else {
        await AuthService().register(request);
      }

      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      await _showSuccessDialog();
    } on AuthException catch (error) {
      if (!mounted) return;
      final message = _friendlyRegistrationMessage(error.message);
      setState(() {
        _isLoading = false;
        _errorMessage = message;
      });
      await _showErrorDialog(message);
    } catch (_) {
      if (!mounted) return;
      const message = 'เกิดข้อผิดพลาดในการสร้างบัญชี กรุณาลองใหม่อีกครั้ง';
      setState(() {
        _isLoading = false;
        _errorMessage = message;
      });
      await _showErrorDialog(message);
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String _friendlyRegistrationMessage(String message) {
    final normalized = message.trim().toLowerCase();

    if (normalized.contains('username already exists')) {
      return 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น';
    }
    if (normalized.contains('username must contain')) {
      return 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว ใช้ตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้น และต้องมีตัวอักษรอย่างน้อย 1 ตัว';
    }
    if (normalized.contains('password must be 8+ chars')) {
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว';
    }

    return message;
  }

  Future<void> _showErrorDialog(String message) async {
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          key: const Key('signup-error-dialog'),
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          contentPadding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline,
                color: Color(0xFFDC2626),
                size: 56,
              ),
              const SizedBox(height: 16),
              const Text(
                'สร้างบัญชีไม่สำเร็จ',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.black54, fontSize: 14),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                key: const Key('signup-error-confirm'),
                onPressed: () => Navigator.of(dialogContext).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(128, 42),
                ),
                child: const Text('ตกลง'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showSuccessDialog() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          key: const Key('signup-success-dialog'),
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          contentPadding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle_outline,
                color: Colors.green,
                size: 56,
              ),
              const SizedBox(height: 16),
              const Text(
                'สร้างบัญชีสำเร็จ',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'บัญชีของคุณพร้อมใช้งานแล้ว',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.black54, fontSize: 14),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                key: const Key('signup-success-confirm'),
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  Navigator.of(
                    context,
                  ).pushNamedAndRemoveUntil('/login', (route) => false);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9CC5F9),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(128, 42),
                ),
                child: const Text('ตกลง'),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final bool mobile = screenWidth < 600;
    final baseTheme = Theme.of(context);

    return Theme(
      data: baseTheme.copyWith(
        textTheme: baseTheme.textTheme.apply(fontFamily: 'Sansation'),
        primaryTextTheme: baseTheme.primaryTextTheme.apply(
          fontFamily: 'Sansation',
        ),
      ),
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/bg.png'),
              fit: BoxFit.cover,
            ),
          ),
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: Column(
                      children: [
                        const SizedBox(height: 40),
                        const LogoSection(),
                        const SizedBox(height: 24),
                        if (_errorMessage != null) ...[
                          Container(
                            key: const Key('signup-error'),
                            width: mobile ? double.infinity : 400,
                            margin: const EdgeInsets.symmetric(horizontal: 20),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Color(0xFFB91C1C),
                                fontFamily: 'Sansation',
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        Container(
                          width: mobile ? double.infinity : 400,
                          margin: const EdgeInsets.symmetric(horizontal: 20),
                          child: CreateAccountForm(key: _createAccountKey),
                        ),
                        const SizedBox(height: 24),
                        Container(
                          width: mobile ? double.infinity : 400,
                          margin: const EdgeInsets.symmetric(horizontal: 20),
                          child: Constraint(key: _constraintKey),
                        ),
                        const SizedBox(height: 24),
                        SignInButton(
                          onPressed: _register,
                          isLoading: _isLoading,
                          text: _isLoading ? 'กำลังบันทึก...' : 'Sign In',
                        ),
                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
