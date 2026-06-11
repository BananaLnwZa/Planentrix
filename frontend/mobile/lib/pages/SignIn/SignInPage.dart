import 'package:flutter/material.dart';
import '../../common/LogoSection.dart';
import './Component/CreateAccForm.dart';
import './Component/Constraint.dart';
import './Component/SignInBtn.dart';

class SigninPage extends StatelessWidget {
  const SigninPage({super.key});

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

                        const SizedBox(height: 24),

                        /// CREATE ACCOUNT
                        Container(
                          width: mobile ? double.infinity : 450,
                          margin: const EdgeInsets.symmetric(
                            horizontal: 16,
                          ),
                          padding: const EdgeInsets.all(24),
                          child: const CreateAccForm(),
                        ),

                        const SizedBox(height: 24),

                        /// CONSTRAINT
                        Container(
                          width: mobile ? double.infinity : 450,
                          margin: const EdgeInsets.symmetric(
                            horizontal: 16,
                          ),
                          padding: const EdgeInsets.all(24),
                          child: const Constraint(),
                        ),

                        const SizedBox(height: 24),

                        /// SIGN IN BUTTON
                        SignInButton(
                          onPressed: () {},
                        ),

                        const SizedBox(height: 40),
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