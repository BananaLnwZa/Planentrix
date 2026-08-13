import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/auth.interface.dart' show RegisterRequest;
import 'package:mobile/pages/Login/Component/LoginForm.dart';
import 'package:mobile/pages/SignIn/Component/BusyDay.dart';
import 'package:mobile/pages/SignIn/Component/BusyDayModal.dart';
import 'package:mobile/pages/SignIn/Component/Constraint.dart';
import 'package:mobile/pages/SignIn/Component/CreateAccForm.dart';
import 'package:mobile/pages/SignIn/Component/CustomDayDropdown.dart';
import 'package:mobile/pages/SignIn/SignInPage.dart';
import 'package:mobile/services/auth.service.dart' show AuthException;

void main() {
  test('busy day times use the 24-hour HH:mm format', () {
    expect(formatBusyDayTime(const TimeOfDay(hour: 0, minute: 5)), '00:05');
    expect(formatBusyDayTime(const TimeOfDay(hour: 9, minute: 30)), '09:30');
    expect(formatBusyDayTime(const TimeOfDay(hour: 12, minute: 0)), '12:00');
    expect(formatBusyDayTime(const TimeOfDay(hour: 14, minute: 15)), '14:15');

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
      130,
    );
    expect(tester.getSize(find.byKey(const Key('end-time-field'))).width, 130);

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

    expect(find.byKey(const Key('work-time-morning')), findsNothing);
    expect(find.text('เลือกช่วงเวลาทำงาน'), findsNothing);

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

  test('converts sign-up form values to backend formats', () {
    expect(dayNameToNumber('Monday'), 1);
    expect(dayNameToNumber('Sunday'), 7);
    expect(busyDayNameToNumber('Mon'), 1);
    expect(busyDayNameToNumber('Sun'), 7);
    expect(durationToMinutes('2', '30'), 150);
    expect(durationToMinutes('', '45'), 45);
    expect(convertDisplayTimeTo24Hour('06:00 PM'), '18:00');
    expect(convertDisplayTimeTo24Hour('12:05 AM'), '00:05');
    expect(formatBirthDateForApi('31/12/2000'), '2000-12-31');
  });

  testWidgets('password eye buttons toggle password visibility', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: SingleChildScrollView(child: CreateAccountForm())),
      ),
    );

    EditableText passwordField() => tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const Key('signup-password-field')),
        matching: find.byType(EditableText),
      ),
    );
    EditableText confirmPasswordField() => tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const Key('signup-confirm-password-field')),
        matching: find.byType(EditableText),
      ),
    );

    expect(passwordField().obscureText, isTrue);
    expect(confirmPasswordField().obscureText, isTrue);

    await tester.tap(find.byKey(const Key('signup-password-visibility')));
    await tester.pump();
    expect(passwordField().obscureText, isFalse);
    expect(confirmPasswordField().obscureText, isTrue);

    await tester.tap(
      find.byKey(const Key('signup-confirm-password-visibility')),
    );
    await tester.pump();
    expect(confirmPasswordField().obscureText, isFalse);
  });

  testWidgets('submits the same complete registration payload as web', (
    tester,
  ) async {
    RegisterRequest? capturedRequest;

    await tester.pumpWidget(
      MaterialApp(
        home: SigninPage(
          registerAction: (request) async {
            capturedRequest = request;
          },
        ),
        routes: {
          '/login': (_) =>
              const Scaffold(body: Center(child: Text('Login destination'))),
        },
      ),
    );

    final accountState = tester.state<CreateAccountFormState>(
      find.byType(CreateAccountForm),
    );
    accountState.usernameController.text = 'student';
    accountState.passwordController.text = 'Password@123';
    accountState.confirmPasswordController.text = 'Password@123';
    accountState.birthDateController.text = '31/12/2000';
    accountState.selectedGender = 'Female';

    final constraintState = tester.state<ConstraintState>(
      find.byType(Constraint),
    );
    constraintState.selectedDay = 'Sunday';
    constraintState.workHourController.text = '2';
    constraintState.workMinuteController.text = '30';
    constraintState.breakHourController.text = '0';
    constraintState.breakMinuteController.text = '45';
    constraintState.startTimeController.text = '06:00 PM';
    constraintState.endTimeController.text = '08:00 PM';
    final busyDayState = tester.state<BusyDayState>(find.byType(BusyDay));
    busyDayState.items.add(
      const BusyDayItem(
        id: 'busy-1',
        day: 'Mon',
        start: '09:00 AM',
        end: '10:30 AM',
      ),
    );

    final submitButton = find.byKey(const Key('signup-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(capturedRequest, isNotNull);
    expect(capturedRequest!.toJson(), {
      'user_name': 'student',
      'user_password': 'Password@123',
      'user_birthdate': '2000-12-31',
      'user_gender': 'female',
      'day_off': 7,
      'continuous_working_duration': 150,
      'break': 45,
      'start_time': '18:00',
      'end_time': '20:00',
      'time_preference': null,
      'busy_days': [
        {'day': 1, 'start': '09:00', 'end': '10:30'},
      ],
    });
    expect(find.byKey(const Key('signup-success-dialog')), findsOneWidget);

    await tester.tap(find.byKey(const Key('signup-success-confirm')));
    await tester.pumpAndSettle();

    expect(find.text('Login destination'), findsOneWidget);
    expect(find.byType(SigninPage), findsNothing);
  });

  testWidgets('shows the same account validation alerts as web', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(home: SigninPage(registerAction: (_) async {})),
    );

    final submitButton = find.byKey(const Key('signup-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(find.text('กรุณาป้อนชื่อผู้ใช้'), findsAtLeastNWidgets(2));
    expect(find.byKey(const Key('signup-account-error')), findsOneWidget);
    expect(find.byKey(const Key('signup-error-dialog')), findsOneWidget);
  });

  testWidgets('confirm password must match and shows an error popup', (
    tester,
  ) async {
    var registerCalled = false;
    await tester.pumpWidget(
      MaterialApp(
        home: SigninPage(
          registerAction: (_) async {
            registerCalled = true;
          },
        ),
      ),
    );

    final accountState = tester.state<CreateAccountFormState>(
      find.byType(CreateAccountForm),
    );
    accountState.usernameController.text = 'student';
    accountState.passwordController.text = 'Password@123';
    accountState.confirmPasswordController.text = 'Different@123';
    accountState.selectedGender = 'Female';

    final submitButton = find.byKey(const Key('signup-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(registerCalled, isFalse);
    expect(find.text('รหัสผ่านไม่ตรงกัน'), findsAtLeastNWidgets(2));
    expect(find.byKey(const Key('signup-error-dialog')), findsOneWidget);

    await tester.tap(find.byKey(const Key('signup-error-confirm')));
    await tester.pumpAndSettle();
    expect(find.byType(SigninPage), findsOneWidget);
  });

  testWidgets('duplicate username from backend is shown in Thai popup', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SigninPage(
          registerAction: (_) async {
            throw const AuthException('Username already exists');
          },
        ),
      ),
    );

    final accountState = tester.state<CreateAccountFormState>(
      find.byType(CreateAccountForm),
    );
    accountState.usernameController.text = 'existinguser';
    accountState.passwordController.text = 'Password@123';
    accountState.confirmPasswordController.text = 'Password@123';
    accountState.selectedGender = 'Female';

    final submitButton = find.byKey(const Key('signup-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(
      find.text('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'),
      findsAtLeastNWidgets(2),
    );
    expect(find.byKey(const Key('signup-error-dialog')), findsOneWidget);
    expect(find.byKey(const Key('signup-success-dialog')), findsNothing);

    await tester.tap(find.byKey(const Key('signup-error-confirm')));
    await tester.pumpAndSettle();
    expect(find.byType(SigninPage), findsOneWidget);
  });

  testWidgets('shows the same constraint time validation alerts as web', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(home: SigninPage(registerAction: (_) async {})),
    );

    final accountState = tester.state<CreateAccountFormState>(
      find.byType(CreateAccountForm),
    );
    accountState.usernameController.text = 'student';
    accountState.passwordController.text = 'Password@123';
    accountState.confirmPasswordController.text = 'Password@123';
    accountState.selectedGender = 'Female';

    final constraintState = tester.state<ConstraintState>(
      find.byType(Constraint),
    );
    constraintState.startTimeController.text = '06:00 PM';

    final submitButton = find.byKey(const Key('signup-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(
      find.text('กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุดให้ครบ'),
      findsAtLeastNWidgets(2),
    );
    expect(find.byKey(const Key('constraint-error')), findsOneWidget);
    expect(find.byKey(const Key('signup-error-dialog')), findsOneWidget);
  });

  testWidgets('work start time must be earlier than end time', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: SigninPage(registerAction: (_) async {})),
    );

    final accountState = tester.state<CreateAccountFormState>(
      find.byType(CreateAccountForm),
    );
    accountState.usernameController.text = 'student';
    accountState.passwordController.text = 'Password@123';
    accountState.confirmPasswordController.text = 'Password@123';
    accountState.selectedGender = 'Female';

    final constraintState = tester.state<ConstraintState>(
      find.byType(Constraint),
    );
    constraintState.startTimeController.text = '08:00 PM';
    constraintState.endTimeController.text = '06:00 PM';

    final submitButton = find.byKey(const Key('signup-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(
      find.text('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด'),
      findsAtLeastNWidgets(2),
    );
    expect(find.byKey(const Key('constraint-error')), findsOneWidget);
    expect(find.byKey(const Key('signup-error-dialog')), findsOneWidget);

    for (final key in const ['start-time-field', 'end-time-field']) {
      final inputDecorator = tester.widget<InputDecorator>(
        find.descendant(
          of: find.byKey(Key(key)),
          matching: find.byType(InputDecorator),
        ),
      );
      final enabledBorder =
          inputDecorator.decoration.enabledBorder! as OutlineInputBorder;
      expect(enabledBorder.borderSide.color, const Color(0xFFB3261E));
    }
  });

  testWidgets('Friday and Saturday dropdown colors are swapped', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: CustomDayDropdown(value: null, onChanged: (_) {})),
      ),
    );

    await tester.tap(find.byType(CustomDayDropdown));
    await tester.pumpAndSettle();

    final friday = find.byKey(const Key('day-dropdown-option-Friday'));
    final saturday = find.byKey(const Key('day-dropdown-option-Saturday'));

    BoxDecoration decorationOf(Finder option) {
      return tester.widget<Container>(option).decoration! as BoxDecoration;
    }

    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: Offset.zero);
    await mouse.moveTo(tester.getCenter(friday));
    await tester.pumpAndSettle();
    expect(decorationOf(friday).border!.top.color, const Color(0xFF71B7E4));

    await mouse.moveTo(tester.getCenter(saturday));
    await tester.pumpAndSettle();
    expect(decorationOf(saturday).border!.top.color, const Color(0xFFD8B8E8));
    await mouse.removePointer();
  });

  testWidgets('busy day modal matches web day colors and interaction states', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BusyDayModal(
            editItem: const BusyDayEditItem(
              id: 'busy-1',
              day: 'Mon',
              start: '09:00 AM',
              end: '10:00 AM',
            ),
            onConfirm: (_, _, _) {},
          ),
        ),
      ),
    );

    final monday = find.byKey(const Key('busy-day-option-Mon'));
    final sunday = find.byKey(const Key('busy-day-option-Sun'));

    BoxDecoration decorationOf(Finder button) {
      final container = tester.widget<AnimatedContainer>(
        find.descendant(of: button, matching: find.byType(AnimatedContainer)),
      );
      return container.decoration! as BoxDecoration;
    }

    expect(decorationOf(monday).color, const Color(0xFFFDE68A));
    expect(decorationOf(monday).border!.top.color, Colors.transparent);
    expect(decorationOf(sunday).color, const Color(0xFFFECDD3));
    expect(decorationOf(sunday).border!.top.color, Colors.transparent);

    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: Offset.zero);
    await mouse.moveTo(tester.getCenter(sunday));
    await tester.pumpAndSettle();

    expect(decorationOf(sunday).border!.top.color, const Color(0xFFFB7185));
    final hoveredOpacity = tester.widget<AnimatedOpacity>(
      find.ancestor(of: sunday, matching: find.byType(AnimatedOpacity)),
    );
    expect(hoveredOpacity.opacity, 0.8);

    await mouse.down(tester.getCenter(sunday));
    await tester.pump();
    final pressedOpacity = tester.widget<AnimatedOpacity>(
      find.ancestor(of: sunday, matching: find.byType(AnimatedOpacity)),
    );
    expect(pressedOpacity.opacity, 0.7);
    await mouse.up();
    await mouse.removePointer();
    await tester.pumpAndSettle();

    expect(decorationOf(sunday).border!.top.color, Colors.transparent);
    expect(decorationOf(sunday).boxShadow, hasLength(1));
    expect(
      tester.getSize(find.byKey(const Key('busy-start-time-field'))).width,
      125,
    );
    expect(
      tester.getSize(find.byKey(const Key('busy-end-time-field'))).width,
      125,
    );
  });

  testWidgets('busy day modal shows the same time validation as web', (
    tester,
  ) async {
    var confirmed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BusyDayModal(
            editItem: const BusyDayEditItem(
              id: 'busy-1',
              day: 'Mon',
              start: '08:00 PM',
              end: '06:00 PM',
            ),
            onConfirm: (_, _, _) {
              confirmed = true;
            },
          ),
        ),
      ),
    );

    await tester.tap(find.byType(OutlinedButton));
    await tester.pump();

    expect(confirmed, isFalse);
    expect(find.text('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด'), findsOneWidget);
    expect(find.byKey(const Key('busy-day-time-error')), findsOneWidget);
  });
}
