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

Route<dynamic>? generateAppRoute(RouteSettings settings) {
  final WidgetBuilder? builder;

  switch (settings.name) {
    case '/login':
      builder = (_) => const LoginPage();
    case '/main':
      builder = (_) => const MainPage();
    case '/score':
      builder = (_) => const ScorePage();
    case '/homework':
      builder = (_) => const HomeworkPage();
    case '/timer':
      builder = (_) => const TimerPage();
    case '/test':
      builder = (_) => const TestPage();
    case '/signIn':
      builder = (_) => const SigninPage();
    default:
      builder = null;
  }

  if (builder == null) return null;

  return InstantMaterialPageRoute<void>(builder: builder, settings: settings);
}

class InstantMaterialPageRoute<T> extends MaterialPageRoute<T> {
  InstantMaterialPageRoute({required super.builder, super.settings});

  @override
  Duration get transitionDuration => Duration.zero;

  @override
  Duration get reverseTransitionDuration => Duration.zero;

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,

      theme: ThemeData(fontFamily: 'Sansation'),

      home: const LoginPage(),
      onGenerateRoute: generateAppRoute,
    );
  }
}
