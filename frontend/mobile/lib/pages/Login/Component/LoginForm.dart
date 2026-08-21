import 'package:flutter/material.dart';

import '../../../services/auth.service.dart';
import '../../../services/homework_reminder.service.dart';

typedef LoginAction = Future<void> Function(String username, String password);

class LoginForm extends StatefulWidget {
  final LoginAction? loginAction;

  const LoginForm({super.key, this.loginAction});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  final TextEditingController usernameController = TextEditingController();

  final TextEditingController passwordController = TextEditingController();

  bool isLoading = false;
  bool isSignUpActive = false;
  bool _showPassword = false;
  String? loginError;

  static const String _fontFamily = 'Sansation';
  static const Color _accentColor = Color(0xFF9CC5F9);

  @override
  void dispose() {
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> login() async {
    final currentState = _formKey.currentState;

    if (currentState == null || !currentState.validate()) {
      return;
    }

    setState(() {
      isLoading = true;
      loginError = null;
    });

    try {
      final action = widget.loginAction;
      if (action != null) {
        await action(usernameController.text.trim(), passwordController.text);
      } else {
        await AuthService().login(
          usernameController.text.trim(),
          passwordController.text,
        );
        await HomeworkReminderService.instance.requestPermissions();
      }

      if (!mounted) return;

      Navigator.of(context).pushNamedAndRemoveUntil('/main', (route) => false);
    } on AuthException catch (error) {
      if (!mounted) return;
      setState(() {
        loginError = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        loginError = 'Login failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  void _clearLoginError() {
    if (loginError == null || !mounted) return;
    setState(() {
      loginError = null;
    });
  }

  String? _validateUsername(String? value) {
    final text = value?.trim() ?? '';

    if (text.isEmpty) {
      return 'Username is required';
    }

    if (text.length < 3) {
      return 'Username must be at least 3 characters';
    }

    return null;
  }

  String? _validatePassword(String? value) {
    final text = value ?? '';

    if (text.isEmpty) {
      return 'Password is required';
    }

    if (text.length < 8) {
      return 'Password must be at least 8 characters';
    }

    return null;
  }

  OutlineInputBorder _border({Color color = const Color(0x4D000000)}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: BorderSide(color: color, width: 1),
    );
  }

  InputDecoration _inputDecoration(String hintText, {Widget? suffixIcon}) {
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
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      suffixIcon: suffixIcon,
      border: _border(),
      enabledBorder: _border(),
      focusedBorder: _border(color: _accentColor),
      errorBorder: _border(color: const Color(0xFFB3261E)),
      focusedErrorBorder: _border(color: const Color(0xFFB3261E)),
      errorStyle: const TextStyle(
        color: Color(0xFFB3261E),
        fontFamily: _fontFamily,
        fontWeight: FontWeight.w300,
        fontSize: 11,
      ),
      errorMaxLines: 2,
    );
  }

  Widget _fieldLabel(String label) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.black87,
          fontFamily: _fontFamily,
          fontWeight: FontWeight.w400,
          fontSize: 14,
        ),
      ),
    );
  }

  ButtonStyle _loginButtonStyle() {
    bool isActive(Set<WidgetState> states) {
      return states.contains(WidgetState.hovered) ||
          states.contains(WidgetState.pressed) ||
          states.contains(WidgetState.focused);
    }

    return ButtonStyle(
      elevation: const WidgetStatePropertyAll(0),
      padding: const WidgetStatePropertyAll(EdgeInsets.zero),
      minimumSize: const WidgetStatePropertyAll(Size(110, 42)),
      maximumSize: const WidgetStatePropertyAll(Size(110, 42)),
      animationDuration: const Duration(milliseconds: 180),
      backgroundColor: WidgetStateProperty.resolveWith<Color>((states) {
        if (states.contains(WidgetState.disabled)) {
          return Colors.grey.shade200;
        }

        return isActive(states) ? _accentColor : Colors.white;
      }),
      foregroundColor: WidgetStateProperty.resolveWith<Color>((states) {
        return isActive(states) ? Colors.white : Colors.black87;
      }),
      side: WidgetStateProperty.resolveWith<BorderSide>((states) {
        return BorderSide(
          color: isActive(states) ? _accentColor : Colors.grey.shade300,
        );
      }),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
      ),
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
      textStyle: const WidgetStatePropertyAll(
        TextStyle(
          fontFamily: _fontFamily,
          fontWeight: FontWeight.w400,
          fontSize: 14,
        ),
      ),
    );
  }

  void _setSignUpActive(bool value) {
    if (!mounted || isSignUpActive == value) {
      return;
    }

    setState(() {
      isSignUpActive = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.sizeOf(context).width;

    final bool mobile = screenWidth < 600;

    const inputTextStyle = TextStyle(
      color: Colors.black,
      fontFamily: _fontFamily,
      fontWeight: FontWeight.w300,
      fontSize: 14,
    );

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final double availableWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : screenWidth;

        final double formWidth = mobile
            ? availableWidth
            : availableWidth.clamp(320.0, 400.0);

        return Center(
          child: SizedBox(
            width: formWidth,
            child: Container(
              key: const Key('login-card'),
              width: double.infinity,
              constraints: const BoxConstraints(minHeight: 420, maxWidth: 400),
              padding: EdgeInsets.symmetric(
                horizontal: mobile ? 24 : 50,
                vertical: mobile ? 32 : 40,
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
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Log in',
                      style: TextStyle(
                        color: Colors.black,
                        fontFamily: _fontFamily,
                        fontWeight: FontWeight.w400,
                        fontSize: mobile ? 24 : 32,
                      ),
                    ),

                    if (loginError != null) ...[
                      const SizedBox(height: 20),
                      Container(
                        key: const Key('login-error'),
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFEBEE),
                          border: Border.all(color: const Color(0xFFB3261E)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          loginError!,
                          style: const TextStyle(
                            color: Color(0xFFB3261E),
                            fontFamily: _fontFamily,
                            fontWeight: FontWeight.w300,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 36),

                    _fieldLabel('username'),

                    const SizedBox(height: 8),

                    TextFormField(
                      key: const Key('username-field'),
                      controller: usernameController,
                      style: inputTextStyle,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => _clearLoginError(),
                      autovalidateMode: AutovalidateMode.onUserInteraction,
                      decoration: _inputDecoration('Enter username'),
                      validator: _validateUsername,
                    ),

                    const SizedBox(height: 20),

                    _fieldLabel('password'),

                    const SizedBox(height: 8),

                    TextFormField(
                      key: const Key('password-field'),
                      controller: passwordController,
                      obscureText: !_showPassword,
                      style: inputTextStyle,
                      textInputAction: TextInputAction.done,
                      onChanged: (_) => _clearLoginError(),
                      autovalidateMode: AutovalidateMode.onUserInteraction,
                      onFieldSubmitted: (_) {
                        if (!isLoading) {
                          login();
                        }
                      },
                      decoration: _inputDecoration(
                        'Enter password',
                        suffixIcon: IconButton(
                          key: const Key('login-password-visibility'),
                          tooltip: _showPassword
                              ? 'Hide password'
                              : 'Show password',
                          onPressed: () {
                            setState(() {
                              _showPassword = !_showPassword;
                            });
                          },
                          icon: _PasswordVisibilityIcon(
                            passwordIsVisible: _showPassword,
                          ),
                        ),
                      ),
                      validator: _validatePassword,
                    ),

                    const SizedBox(height: 32),

                    SizedBox(
                      width: 110,
                      height: 42,
                      child: ElevatedButton(
                        key: const Key('login-button'),
                        onPressed: isLoading ? null : login,
                        style: _loginButtonStyle(),
                        child: isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  color: Colors.black54,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Login'),
                      ),
                    ),

                    const SizedBox(height: 36),

                    Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        const Text(
                          "Don't have an account? | ",
                          style: TextStyle(
                            color: Colors.black54,
                            fontFamily: _fontFamily,
                            fontWeight: FontWeight.w300,
                            fontSize: 13,
                          ),
                        ),
                        MouseRegion(
                          cursor: SystemMouseCursors.click,
                          onEnter: (_) => _setSignUpActive(true),
                          onExit: (_) => _setSignUpActive(false),
                          child: GestureDetector(
                            key: const Key('sign-up-link'),
                            behavior: HitTestBehavior.opaque,
                            onTapDown: (_) => _setSignUpActive(true),
                            onTapCancel: () => _setSignUpActive(false),
                            onTapUp: (_) => _setSignUpActive(false),
                            onTap: () {
                              Navigator.pushNamed(context, '/signIn');
                            },
                            child: Text(
                              'Sign up',
                              style: TextStyle(
                                color: isSignUpActive
                                    ? _accentColor
                                    : Colors.black54,
                                decoration: TextDecoration.underline,
                                decorationColor: isSignUpActive
                                    ? _accentColor
                                    : Colors.black54,
                                fontFamily: _fontFamily,
                                fontWeight: FontWeight.w300,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PasswordVisibilityIcon extends StatelessWidget {
  final bool passwordIsVisible;

  const _PasswordVisibilityIcon({required this.passwordIsVisible});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: Key(
        passwordIsVisible
            ? 'login-password-icon-hide'
            : 'login-password-icon-show',
      ),
      width: 21,
      height: 21,
      child: CustomPaint(
        painter: _PasswordVisibilityPainter(
          drawSlash: passwordIsVisible,
          color: Colors.grey.shade500,
        ),
      ),
    );
  }
}

class _PasswordVisibilityPainter extends CustomPainter {
  final bool drawSlash;
  final Color color;

  const _PasswordVisibilityPainter({
    required this.drawSlash,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final eyePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final eye = Path()
      ..moveTo(1.5, center.dy)
      ..quadraticBezierTo(center.dx, 3.5, size.width - 1.5, center.dy)
      ..quadraticBezierTo(center.dx, size.height - 3.5, 1.5, center.dy)
      ..close();

    canvas.drawPath(eye, eyePaint);
    canvas.drawCircle(center, 3, eyePaint);

    if (drawSlash) {
      final slashStart = Offset(3, 3);
      final slashEnd = Offset(size.width - 3, size.height - 3);
      canvas.drawLine(
        slashStart,
        slashEnd,
        Paint()
          ..color = Colors.white
          ..strokeWidth = 3.8
          ..strokeCap = StrokeCap.round,
      );
      canvas.drawLine(slashStart, slashEnd, eyePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _PasswordVisibilityPainter oldDelegate) {
    return drawSlash != oldDelegate.drawSlash || color != oldDelegate.color;
  }
}
