import 'package:flutter/material.dart';
import 'pages/Homework/Homework.dart';
import 'pages/Login/LogInPage.dart';
import 'pages/Main/MainPage.dart';
import 'pages/Score/Score.dart';
import 'pages/SignIn/SignInPage.dart';
import 'pages/Test/Test.dart';
import 'pages/Timer/Timer.dart';

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
        '/score': (context) => const ScorePage(),
        '/homework': (context) => const HomeworkPage(),
        '/timer': (context) => const TimerPage(),
        '/test': (context) => const TestPage(),
        '/signIn': (context) => const SigninPage(),
      },
    );
  }
}
