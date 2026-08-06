import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Score/Score.dart';

void setPhoneSize(WidgetTester tester, Size size) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  testWidgets('GPA card matches the Figma size and position', (tester) async {
    setPhoneSize(tester, const Size(360, 640));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: const ScorePage(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('score-page')), findsOneWidget);
    expect(find.byKey(const Key('gpa-card')), findsOneWidget);
    expect(find.byKey(const Key('gpa-title')), findsOneWidget);
    expect(find.byKey(const Key('gpa-value')), findsOneWidget);
    expect(find.text('2.50/4.00'), findsOneWidget);
    expect(find.byType(SvgPicture), findsNWidgets(2));
    final surface = tester.widget<Container>(
      find.byKey(const Key('gpa-card-surface')),
    );
    final surfaceDecoration = surface.decoration! as BoxDecoration;
    expect(surfaceDecoration.color, Colors.white);
    expect(
      tester.getSize(find.byKey(const Key('gpa-card'))),
      const Size(220, 133),
    );
    expect(
      tester.getTopLeft(find.byKey(const Key('gpa-card'))),
      const Offset(70, 81),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('GPA card fits a compact mobile screen', (tester) async {
    setPhoneSize(tester, const Size(320, 568));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: const ScorePage(),
      ),
    );
    await tester.pumpAndSettle();

    final cardRect = tester.getRect(find.byKey(const Key('gpa-card')));
    expect(cardRect.left, greaterThanOrEqualTo(0));
    expect(cardRect.right, lessThanOrEqualTo(320));
    expect(cardRect.bottom, lessThanOrEqualTo(568));
    expect(tester.takeException(), isNull);
  });
}
