import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/pages/Login/Component/LoginForm.dart';
import 'package:mobile/pages/SignIn/Component/BusyDayModal.dart';
import 'package:mobile/pages/SignIn/SignInPage.dart';

void main() {
  test('busy day times use the 12-hour AM/PM format', () {
    expect(formatBusyDayTime(const TimeOfDay(hour: 0, minute: 5)), '12:05 AM');
    expect(formatBusyDayTime(const TimeOfDay(hour: 9, minute: 30)), '09:30 AM');
    expect(formatBusyDayTime(const TimeOfDay(hour: 12, minute: 0)), '12:00 PM');
    expect(
      formatBusyDayTime(const TimeOfDay(hour: 14, minute: 15)),
      '02:15 PM',
    );

    expect(parseBusyDayTime('09:30 AM'), const TimeOfDay(hour: 9, minute: 30));
    expect(parseBusyDayTime('02:15 PM'), const TimeOfDay(hour: 14, minute: 15));
    expect(parseBusyDayTime('18:45'), const TimeOfDay(hour: 18, minute: 45));
  });

  testWidgets('Sign in uses the Login card surface and Sansation theme', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(360, 640);
    addTearDown(() async {
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    await tester.pumpWidget(
      const MaterialApp(debugShowCheckedModeBanner: false, home: SigninPage()),
    );
    await tester.pump();

    final createAccountFinder = find.byKey(const Key('create-account-card'));
    final constraintFinder = find.byKey(const Key('constraint-card'));

    expect(createAccountFinder, findsOneWidget);
    expect(constraintFinder, findsOneWidget);

    for (final finder in [createAccountFinder, constraintFinder]) {
      final container = tester.widget<Container>(finder);
      final decoration = container.decoration! as BoxDecoration;

      expect(decoration.color, const Color(0xEBFFFFFF));
      expect(decoration.borderRadius, BorderRadius.circular(16));
      expect(decoration.boxShadow, const [
        BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 4)),
      ]);
      expect(container.padding, const EdgeInsets.all(24));
      expect(tester.getRect(finder).left, 20);
      expect(tester.getRect(finder).right, 340);
    }

    final busyDayInput = tester.widget<Container>(
      find.byKey(const Key('busy-day-input')),
    );
    final busyDayDecoration = busyDayInput.decoration! as BoxDecoration;
    final busyDayBorder = busyDayDecoration.border! as Border;

    expect(busyDayDecoration.borderRadius, BorderRadius.circular(25));
    expect(busyDayBorder.top.color, const Color(0x4D000000));
    expect(busyDayBorder.top.width, 1);
    expect(
      tester.getSize(find.byKey(const Key('start-time-field'))).width,
      170,
    );
    expect(tester.getSize(find.byKey(const Key('end-time-field'))).width, 170);

    final signInTheme = Theme.of(tester.element(createAccountFinder));
    expect(signInTheme.textTheme.bodyMedium?.fontFamily, 'Sansation');

    final editableTexts = tester.widgetList<EditableText>(
      find.byType(EditableText),
    );
    expect(editableTexts, isNotEmpty);

    for (final editableText in editableTexts) {
      expect(editableText.style.fontFamily, 'Sansation');
      expect(editableText.style.fontSize, 14);
    }

    final inputDecorators = tester.widgetList<InputDecorator>(
      find.byType(InputDecorator),
    );
    expect(inputDecorators, isNotEmpty);

    for (final inputDecorator in inputDecorators) {
      final decoration = inputDecorator.decoration;
      final enabledBorder = decoration.enabledBorder! as OutlineInputBorder;
      final focusedBorder = decoration.focusedBorder! as OutlineInputBorder;

      expect(decoration.filled, isTrue);
      expect(decoration.fillColor, Colors.white);
      expect(decoration.hintStyle?.fontFamily, 'Sansation');
      expect(decoration.hintStyle?.fontSize, 13);
      expect(enabledBorder.borderRadius, BorderRadius.circular(25));
      expect(enabledBorder.borderSide.color, const Color(0x4D000000));
      expect(focusedBorder.borderSide.color, const Color(0xFF9CC5F9));
    }

    final workTimeButtonFinder = find.byKey(const Key('work-time-morning'));
    final workTimeButton = tester.widget<OutlinedButton>(workTimeButtonFinder);
    final workTimeText = tester.widget<Text>(
      find.descendant(of: workTimeButtonFinder, matching: find.text('เช้า')),
    );

    expect(tester.getSize(workTimeButtonFinder).height, 46);
    expect(
      workTimeButton.style?.side?.resolve(<WidgetState>{})?.color,
      const Color(0x4D000000),
    );
    expect(
      workTimeButton.style?.foregroundColor?.resolve(<WidgetState>{}),
      Colors.black87,
    );
    expect(workTimeText.style?.fontFamily, 'Sansation');
    expect(workTimeText.style?.fontSize, 14);

    for (final label in [
      'username',
      'password',
      'Confirm Password',
      'Birth Date',
      'gender',
    ]) {
      final labelText = tester.widget<Text>(find.text(label));
      expect(labelText.style?.fontWeight, FontWeight.w400);
    }

    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: LoginForm())),
    );
    await tester.pump();

    for (final label in ['username', 'password']) {
      final labelText = tester.widget<Text>(find.text(label));
      expect(labelText.style?.fontWeight, FontWeight.w400);
    }
  });
}
