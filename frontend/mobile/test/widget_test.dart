import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Login/LogInPage.dart';

bool _sansationLoaded = false;

Widget buildLoginApp({double keyboardInset = 0}) {
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
    home: const RepaintBoundary(key: Key('login-golden'), child: LoginPage()),
    routes: {
      '/signIn': (_) =>
          const Scaffold(body: Center(child: Text('Sign up destination'))),
    },
  );
}

Future<void> setTestSize(WidgetTester tester, Size size) async {
  tester.view.devicePixelRatio = 1;
  await tester.binding.setSurfaceSize(size);
}

Future<void> pumpLogin(WidgetTester tester, {double keyboardInset = 0}) async {
  if (!_sansationLoaded) {
    final fontLoader = FontLoader('Sansation')
      ..addFont(rootBundle.load('assets/fonts/Sansation-Light.ttf'));
    await fontLoader.load();
    _sansationLoaded = true;
  }

  await tester.pumpWidget(buildLoginApp(keyboardInset: keyboardInset));
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
      expect(cardSize.width, lessThanOrEqualTo(300));
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

  testWidgets('valid login keeps the existing loading and success behavior', (
    tester,
  ) async {
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      await tester.binding.setSurfaceSize(null);
    });
    await setTestSize(tester, const Size(360, 640));
    await pumpLogin(tester);

    await tester.enterText(find.byKey(const Key('username-field')), 'student');
    await tester.enterText(
      find.byKey(const Key('password-field')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    await tester.pump();

    expect(find.text('Login Success'), findsOneWidget);
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
