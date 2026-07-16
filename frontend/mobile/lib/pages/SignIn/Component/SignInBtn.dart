import 'package:flutter/material.dart';

class SignInButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;

  const SignInButton({super.key, this.text = "Sign In", this.onPressed});

  @override
  State<SignInButton> createState() => _SignInButtonState();
}

class _SignInButtonState extends State<SignInButton> {
  bool isHover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => isHover = true),
      onExit: (_) => setState(() => isHover = false),
      cursor: SystemMouseCursors.click,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 150),
        scale: isHover ? 1.05 : 1,
        child: SizedBox(
          width: 110,
          height: 42,
          child: ElevatedButton(
            onPressed: widget.onPressed,
            style: ElevatedButton.styleFrom(
              elevation: 0,
              backgroundColor: isHover ? const Color(0xFF9CC5F9) : Colors.white,
              foregroundColor: isHover ? Colors.white : Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(50),
                side: BorderSide(color: Colors.grey.shade300),
              ),
              padding: EdgeInsets.zero,
            ),
            child: Text(
              widget.text,
              style: const TextStyle(
                fontFamily: 'Sansation',
                fontWeight: FontWeight.w400,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
