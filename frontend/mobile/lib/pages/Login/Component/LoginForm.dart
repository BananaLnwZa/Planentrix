import 'package:flutter/material.dart';
import '../../SignIn/SignInPage.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController usernameController =
      TextEditingController();

  final TextEditingController passwordController =
      TextEditingController();

  bool isLoading = false;
  bool isHoveringSignIn = false;

  Future<void> login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      isLoading = true;
    });

    await Future.delayed(
      const Duration(seconds: 1),
    );

    setState(() {
      isLoading = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Login Success"),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    final bool mobile = screenWidth < 600;

    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: BorderSide(
        color: Colors.grey.shade300,
      ),
    );

    return Container(
      width: mobile ? double.infinity : 400,
      padding: EdgeInsets.symmetric(
        horizontal: mobile ? 24 : 50,
        vertical: mobile ? 32 : 40,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.92),
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
              "LogIn",
              style: TextStyle(
                fontSize: mobile ? 24 : 32,
                fontWeight: FontWeight.w500,
                color: Colors.black87,
              ),
            ),

            const SizedBox(height: 40),

            /// USERNAME
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "username",
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                ),
              ),
            ),

            const SizedBox(height: 8),

            TextFormField(
            controller: usernameController,
            decoration: InputDecoration(
              hintText: "enter username",
              hintStyle: TextStyle(
                color: Colors.grey.shade400,
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 14,
              ),

              enabledBorder: inputBorder,
              focusedBorder: inputBorder,
              errorBorder: inputBorder,
              focusedErrorBorder: inputBorder,

              errorStyle: const TextStyle(
                color: Colors.red,
                fontSize: 12,
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return "Username is required";
              }

              if (value.length < 3) {
                return "Username must be at least 3 characters";
              }

              return null;
            },
          ),

            const SizedBox(height: 20),

            /// PASSWORD
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "password",
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                ),
              ),
            ),

            const SizedBox(height: 8),

            TextFormField(
            controller: passwordController,
            obscureText: true,
            decoration: InputDecoration(
              hintText: "enter password",
              hintStyle: TextStyle(
                color: Colors.grey.shade400,
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 14,
              ),

              enabledBorder: inputBorder,
              focusedBorder: inputBorder,
              errorBorder: inputBorder,
              focusedErrorBorder: inputBorder,

              errorStyle: const TextStyle(
                color: Colors.red,
                fontSize: 12,
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return "Password is required";
              }

              if (value.length < 8) {
                return "Password must be at least 8 characters";
              }

              return null;
            },
          ),
            const SizedBox(height: 32),

            /// LOGIN BUTTON
            SizedBox(
              width: 110,
              height: 42,
              child: ElevatedButton(
                onPressed: isLoading ? null : login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black87,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(50),
                    side: BorderSide(
                      color: Colors.grey.shade300,
                    ),
                  ),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child:
                            CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        "Login",
                        style: TextStyle(
                          fontSize: 14,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 36),

            Wrap(
              alignment: WrapAlignment.center,
              children: [
                Text(
                  "Don't have an account? | ",
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade700,
                  ),
                ),
                MouseRegion(
                  cursor: SystemMouseCursors.click,
                  onEnter: (_) {
                    setState(() {
                      isHoveringSignIn = true;
                    });
                  },
                  onExit: (_) {
                    setState(() {
                      isHoveringSignIn = false;
                    });
                  },
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pushNamed(
                        context,
                        "/signIn",
                      );
                    },
                    child: AnimatedDefaultTextStyle(
                      duration: const Duration(
                        milliseconds: 150,
                      ),
                      style: TextStyle(
                        fontSize: 13,
                        decoration:
                            TextDecoration.underline,
                        color: isHoveringSignIn
                            ? const Color(0xFF9CC5F9)
                            : Colors.grey.shade600,
                      ),
                      child: const Text(
                        "Sign in",
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}