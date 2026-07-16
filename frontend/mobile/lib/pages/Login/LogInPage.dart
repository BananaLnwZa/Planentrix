import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../common/LogoSection.dart';
import './Component/LoginForm.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final MediaQueryData mediaQuery =
        MediaQuery.of(context);

    final bool keyboardIsOpen =
        mediaQuery.viewInsets.bottom > 0;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Stack(
        fit: StackFit.expand,
        children: [
          /// พื้นหลัง
          Image.asset(
            'assets/images/bg.png',
            fit: BoxFit.cover,
          ),

          /// Gradient ทับพื้นหลัง
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x66E4EFF5),
                  Color(0x66BCDFF2),
                ],
              ),
            ),
          ),

          SafeArea(
            child: LayoutBuilder(
              builder: (
                BuildContext context,
                BoxConstraints constraints,
              ) {
                final double cardWidth = math.min(
                  400,
                  math.max(
                    0,
                    constraints.maxWidth - 40,
                  ),
                );

                final double topSpacing = keyboardIsOpen
                    ? 16
                    : math.max(
                        16,
                        63 - mediaQuery.padding.top,
                      );

                return SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: EdgeInsets.only(
                    bottom: keyboardIsOpen
                        ? mediaQuery.viewInsets.bottom + 16
                        : 0,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                      ),
                      child: Column(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          /// เนื้อหาด้านบน
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                height: topSpacing,
                              ),

                              const LogoSection(
                                width: 146,
                                height: 151,
                                padding: EdgeInsets.zero,
                                fit: BoxFit.contain,
                              ),

                              const SizedBox(height: 32),

                              Center(
                                child: SizedBox(
                                  width: cardWidth,
                                  child: const LoginForm(),
                                ),
                              ),

                              const SizedBox(height: 32),
                            ],
                          ),

                          /// Footer
                          if (!keyboardIsOpen)
                            const Padding(
                              padding: EdgeInsets.only(
                                bottom: 16,
                              ),
                              child: Text(
                                'Bananya.Inc ©',
                                key: Key('login-footer'),
                                style: TextStyle(
                                  color: Colors.white,
                                  fontFamily: 'Sansation',
                                  fontWeight: FontWeight.w400,
                                  fontSize: 9,
                                  height: 1.1,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}