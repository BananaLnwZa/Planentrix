import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Main/MainPage.dart';

void main() {
  testWidgets('logout returns to login and removes the main page', (
    tester,
  ) async {
    final completer = Completer<void>();

    await tester.pumpWidget(
      MaterialApp(
        home: MainPage(
          username: 'student',
          userId: 1,
          logoutAction: () => completer.future,
        ),
        routes: {
          '/login': (_) =>
              const Scaffold(body: Center(child: Text('Login destination'))),
        },
      ),
    );

    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('main-tab-content')), findsOneWidget);

    await tester.tap(find.byKey(const Key('student-card')));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('student-card-popup')), findsOneWidget);

    await tester.tap(find.byKey(const Key('popup-logout-button')));
    await tester.pump();

    expect(
      find.descendant(
        of: find.byKey(const Key('popup-logout-button')),
        matching: find.byType(CircularProgressIndicator),
      ),
      findsOneWidget,
    );

    completer.complete();
    await tester.pumpAndSettle();

    expect(find.text('Login destination'), findsOneWidget);
    expect(find.byType(MainPage), findsNothing);
  });
}
