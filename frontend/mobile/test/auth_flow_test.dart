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
          logoutAction: () => completer.future,
        ),
        routes: {
          '/login': (_) =>
              const Scaffold(body: Center(child: Text('Login destination'))),
        },
      ),
    );

    expect(find.text('Welcome, student'), findsOneWidget);

    await tester.tap(find.byKey(const Key('logout-button')));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    completer.complete();
    await tester.pumpAndSettle();

    expect(find.text('Login destination'), findsOneWidget);
    expect(find.byType(MainPage), findsNothing);
  });
}
