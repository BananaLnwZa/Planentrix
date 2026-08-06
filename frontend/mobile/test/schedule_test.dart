import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Main/Component/Schedule.dart';

void setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 640);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  testWidgets('schedule matches the web grid and fits a small phone', (
    tester,
  ) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Padding(padding: EdgeInsets.all(20), child: Schedule()),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('schedule')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('schedule'))),
      const Size(320, 420),
    );
    expect(find.text('Time'), findsOneWidget);
    for (final day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(find.text(day), findsOneWidget);
    }
    expect(find.text('6 AM'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.byKey(const Key('schedule-time-5-am')),
      220,
      scrollable: find.byType(Scrollable),
    );
    expect(find.byKey(const Key('schedule-time-5-am')), findsOneWidget);
  });
}
