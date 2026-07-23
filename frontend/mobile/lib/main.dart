import 'package:flutter/material.dart';
import 'pages/Login/LogInPage.dart';
import 'pages/Main/MainPage.dart';
import 'pages/SignIn/SignInPage.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,

      theme: ThemeData(fontFamily: 'Sansation'),

      home: const LoginPage(),

      routes: {
        '/login': (context) => const LoginPage(),
        '/main': (context) => const MainPage(),
        '/signIn': (context) => const SigninPage(),
      },
    );
  }
}
