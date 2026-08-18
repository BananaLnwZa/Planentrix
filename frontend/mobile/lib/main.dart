import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
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

  ThemeData _buildTheme() {
    final baseTheme = ThemeData(fontFamily: 'Sansation');
    final textTheme = baseTheme.textTheme;
    return baseTheme.copyWith(
      textTheme: textTheme.copyWith(
        headlineLarge: textTheme.headlineLarge?.copyWith(
          fontSize: 19,
          fontWeight: FontWeight.w600,
        ),
        headlineMedium: textTheme.headlineMedium?.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
        headlineSmall: textTheme.headlineSmall?.copyWith(
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
        titleLarge: textTheme.titleLarge?.copyWith(
          fontSize: 19,
          fontWeight: FontWeight.w600,
        ),
        titleMedium: textTheme.titleMedium?.copyWith(
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
        titleSmall: textTheme.titleSmall?.copyWith(
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: textTheme.bodyLarge?.copyWith(fontSize: 14),
        bodyMedium: textTheme.bodyMedium?.copyWith(fontSize: 12),
        bodySmall: textTheme.bodySmall?.copyWith(fontSize: 10),
        labelLarge: textTheme.labelLarge?.copyWith(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        labelMedium: textTheme.labelMedium?.copyWith(
          fontSize: 10.5,
          fontWeight: FontWeight.w500,
        ),
        labelSmall: textTheme.labelSmall?.copyWith(fontSize: 9),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      locale: const Locale('en', 'GB'),
      supportedLocales: const [Locale('en', 'GB')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: _buildTheme(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
      home: const LoginPage(),
      onGenerateRoute: generateAppRoute,
    );
  }
}
