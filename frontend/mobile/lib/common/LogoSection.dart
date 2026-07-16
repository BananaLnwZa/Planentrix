import 'package:flutter/material.dart';

class LogoSection extends StatelessWidget {
  const LogoSection({
    super.key,
    this.width,
    this.height,
    this.padding = const EdgeInsets.only(bottom: 20),
    this.fit = BoxFit.contain,
  });

  final double? width;
  final double? height;
  final EdgeInsetsGeometry padding;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    double responsiveWidth;

    if (screenWidth >= 1024) {
      responsiveWidth = 220;
    } else if (screenWidth >= 768) {
      responsiveWidth = 200;
    } else {
      responsiveWidth = 180;
    }

    return Padding(
      padding: padding,
      child: Image.asset(
        'assets/images/logo.png',
        width: width ?? responsiveWidth,
        height: height,
        fit: fit,
      ),
    );
  }
}
