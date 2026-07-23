import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Login/Component/LoginForm.dart';
import 'package:mobile/pages/Login/LogInPage.dart';
import 'package:mobile/services/auth.service.dart';

bool _sansationLoaded = false;

Widget buildLoginApp({double keyboardInset = 0, LoginAction? loginAction}) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    builder: (context, child) {
      final mediaQuery = MediaQuery.of(context);
      return MediaQuery(
        data: mediaQuery.copyWith(
          viewInsets: EdgeInsets.only(bottom: keyboardInset),
        ),
        child: child!,
      );
    },
    home: RepaintBoundary(
      key: const Key('login-golden'),
      child: LoginPage(
        loginAction: loginAction ?? (username, password) async {},
      ),
    ),
    routes: {
      '/signIn': (_) =>
          const Scaffold(body: Center(child: Text('Sign up destination'))),
      '/main': (_) =>
          const Scaffold(body: Center(child: Text('Main destination'))),
    },
  );
}

Future<void> setTestSize(WidgetTester tester, Size size) async {
  tester.view.devicePixelRatio = 1;
  await tester.binding.setSurfaceSize(size);
}

Future<void> pumpLogin(
  WidgetTester tester, {
  double keyboardInset = 0,
  LoginAction? loginAction,
}) async {
  if (!_sansationLoaded) {
    final fontLoader = FontLoader('Sansation')
      ..addFont(rootBundle.load('assets/fonts/Sansation-Light.ttf'));
    await fontLoader.load();
    _sansationLoaded = true;
  }

  await tester.pumpWidget(
    buildLoginApp(keyboardInset: keyboardInset, loginAction: loginAction),
  );
  final context = tester.element(find.byType(LoginPage));
  await tester.runAsync(() async {
    await precacheImage(const AssetImage('assets/images/bg.png'), context);
    await precacheImage(const AssetImage('assets/images/logo.png'), context);
  });
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('matches the 360x640 Figma baseline', (tester) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));

    await pumpLogin(tester);

    await expectLater(
      find.byKey(const Key('login-golden')),
      matchesGoldenFile('goldens/login_360x640.png'),
    );
  });

  testWidgets('lays out without overflow on supported phone sizes', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });

    for (final size in const [Size(320, 568), Size(390, 844)]) {
      await setTestSize(tester, size);
      await pumpLogin(tester);

      expect(tester.takeException(), isNull);
      final cardSize = tester.getSize(find.byKey(const Key('login-card')));
      expect(cardSize.width, lessThanOrEqualTo(size.width - 40));
    }
  });

  testWidgets('validation errors expand the card without overflow', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    await pumpLogin(tester);

    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    expect(find.text('Username is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('login-card'))).height,
      greaterThan(300),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('password eye button toggles password visibility', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    await pumpLogin(tester);

    EditableText passwordField() => tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const Key('password-field')),
        matching: find.byType(EditableText),
      ),
    );

    expect(passwordField().obscureText, isTrue);
    expect(find.byKey(const Key('login-password-icon-show')), findsOneWidget);

    await tester.tap(find.byKey(const Key('login-password-visibility')));
    await tester.pump();

    expect(passwordField().obscureText, isFalse);
    expect(find.byKey(const Key('login-password-icon-hide')), findsOneWidget);

    await tester.tap(find.byKey(const Key('login-password-visibility')));
    await tester.pump();
    expect(passwordField().obscureText, isTrue);
  });

  testWidgets('minimum-length validation messages match web login', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    await pumpLogin(tester);

    await tester.enterText(find.byKey(const Key('username-field')), 'ab');
    await tester.enterText(find.byKey(const Key('password-field')), '1234567');
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    expect(find.text('Username must be at least 3 characters'), findsOneWidget);
    expect(find.text('Password must be at least 8 characters'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('content remains reachable when the keyboard is open', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(320, 568));
    await pumpLogin(tester, keyboardInset: 260);

    await tester.ensureVisible(find.byKey(const Key('password-field')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('password-field')));
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('sign-up-link')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('sign-up-link')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('valid login shows loading and opens the main page', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    final completer = Completer<void>();
    await pumpLogin(
      tester,
      loginAction: (username, password) => completer.future,
    );

    await tester.enterText(find.byKey(const Key('username-field')), 'student');
    await tester.enterText(
      find.byKey(const Key('password-field')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    completer.complete();
    await tester.pumpAndSettle();

    expect(find.text('Main destination'), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
  });

  testWidgets('shows the backend validation message when login fails', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    await pumpLogin(
      tester,
      loginAction: (username, password) async {
        throw const AuthException('Invalid username or password');
      },
    );

    await tester.enterText(find.byKey(const Key('username-field')), 'student');
    await tester.enterText(
      find.byKey(const Key('password-field')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-error')), findsOneWidget);
    expect(find.text('Invalid username or password'), findsOneWidget);
  });

  testWidgets('Sign up opens the existing registration route', (tester) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    await pumpLogin(tester);

    await tester.ensureVisible(find.byKey(const Key('sign-up-link')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('sign-up-link')));
    await tester.pumpAndSettle();

    expect(find.text('Sign up destination'), findsOneWidget);
  });
}
