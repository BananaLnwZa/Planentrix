import 'package:flutter/material.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  final TextEditingController usernameController = TextEditingController();

  final TextEditingController passwordController = TextEditingController();

  bool isLoading = false;
  bool isSignUpActive = false;

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
    });

    await Future<void>.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    setState(() {
      isLoading = false;
    });

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Login Success')));
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

  InputDecoration _inputDecoration(String hintText) {
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

                    const SizedBox(height: 36),

                    _fieldLabel('username'),

                    const SizedBox(height: 8),

                    TextFormField(
                      key: const Key('username-field'),
                      controller: usernameController,
                      style: inputTextStyle,
                      textInputAction: TextInputAction.next,
                      decoration: _inputDecoration('enter username'),
                      validator: _validateUsername,
                    ),

                    const SizedBox(height: 20),

                    _fieldLabel('password'),

                    const SizedBox(height: 8),

                    TextFormField(
                      key: const Key('password-field'),
                      controller: passwordController,
                      obscureText: true,
                      style: inputTextStyle,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) {
                        if (!isLoading) {
                          login();
                        }
                      },
                      decoration: _inputDecoration('enter password'),
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
