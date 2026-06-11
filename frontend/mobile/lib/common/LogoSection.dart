import 'package:flutter/material.dart';

class LogoSection extends StatelessWidget {
  const LogoSection({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    double logoWidth;

    if (screenWidth >= 1024) {
      logoWidth = 220;
    } else if (screenWidth >= 768) {
      logoWidth = 200;
    } else {
      logoWidth = 180;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Image.asset(
        'assets/images/logo.png',
        width: logoWidth,
        fit: BoxFit.contain,
      ),
    );
  }
}