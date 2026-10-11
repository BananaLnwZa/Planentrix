import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/auth.interface.dart';
import 'package:mobile/pages/Login/SessionGate.dart';

void main() {
  testWidgets('stored session opens the app without showing login', (
    tester,
  ) async {
    final completer = Completer<UserSession?>();
    await tester.pumpWidget(
      MaterialApp(
        home: SessionGate(
          sessionLoader: () => completer.future,
          authenticatedBuilder: (_) => const Scaffold(body: Text('Main page')),
          unauthenticatedBuilder: (_) =>
              const Scaffold(body: Text('Login page')),
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    completer.complete(
      UserSession(
        userId: 7,
        username: 'student',
        role: 'user',
        accessToken: 'access',
        refreshToken: 'refresh',
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Main page'), findsOneWidget);
    expect(find.text('Login page'), findsNothing);
  });

  testWidgets('missing or expired session opens login', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SessionGate(
          sessionLoader: () async => null,
          authenticatedBuilder: (_) => const Scaffold(body: Text('Main page')),
          unauthenticatedBuilder: (_) =>
              const Scaffold(body: Text('Login page')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Login page'), findsOneWidget);
    expect(find.text('Main page'), findsNothing);
  });
}
