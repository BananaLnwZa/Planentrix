import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Homework/Homework.dart';

void setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 640);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  testWidgets('homework page matches the grouped Figma layout', (tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(const MaterialApp(home: HomeworkPage()));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('homework-page')), findsOneWidget);
    expect(find.byKey(const Key('homework-add-button')), findsOneWidget);
    expect(find.text('ส่งพรุ่งนี้'), findsOneWidget);
    expect(find.text('12 มี.ค 2569'), findsOneWidget);
    expect(find.text('16 มี.ค 2569'), findsOneWidget);
    expect(find.text('ล่าช้า'), findsOneWidget);
    expect(find.byKey(const Key('homework-task-0-0')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-1-0')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-1-1')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-2-0')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-3-0')), findsOneWidget);
    expect(find.text('Homework'), findsOneWidget);

    expect(
      tester.getTopLeft(find.byKey(const Key('notebook-cover-homework'))),
      const Offset(16, 20),
    );
    expect(
      tester.getTopLeft(find.byKey(const Key('notebook-paper-homework'))),
      const Offset(27, 31),
    );
    expect(
      tester.getSize(find.byKey(const Key('notebook-paper-homework'))),
      const Size(306, 556),
    );
    expect(
      tester.getTopLeft(find.byKey(const Key('notebook-tabs'))),
      const Offset(44, 588),
    );
    expect(tester.takeException(), isNull);
  });
}
