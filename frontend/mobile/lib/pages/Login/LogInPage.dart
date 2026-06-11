import 'package:flutter/material.dart';
import '../../common/LogoSection.dart';
import './Component/LoginForm.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    final bool mobile = screenWidth < 600;

    return Scaffold(
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
                  child: IntrinsicHeight(
                    child: Column(
                      children: [
                        const SizedBox(height: 40),

                        /// LOGO
                        const LogoSection(),

                        const SizedBox(height: 32),

                        /// LOGIN CARD
                        Center(
                          child: Container(
                            width: mobile ? double.infinity : 420,
                            margin: EdgeInsets.symmetric(
                              horizontal: mobile ? 20 : 0,
                            ),
                            child: const LoginForm(),
                          ),
                        ),

                        const Spacer(),

                        /// FOOTER
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Text(
                            'Bananya.Inc ©',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 12,
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
      ),
    );
  }
}