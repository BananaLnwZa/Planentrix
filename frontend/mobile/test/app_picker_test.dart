import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/common/AppDatePicker.dart';
import 'package:mobile/common/AppDateTimePicker.dart';
import 'package:mobile/common/AppTimePicker.dart';

void main() {
  testWidgets('custom date picker uses the pink themed calendar', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => showAppDatePicker(
              context: context,
              initialDate: DateTime(2026, 8, 13),
              firstDate: DateTime(2000),
              lastDate: DateTime(2030),
            ),
            child: const Text('open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('app-date-picker-dialog')), findsOneWidget);
    expect(find.byType(CalendarDatePicker), findsOneWidget);
    final calendarContext = tester.element(find.byType(CalendarDatePicker));
    final calendarLocalizations = MaterialLocalizations.of(calendarContext);
    expect(calendarLocalizations.firstDayOfWeekIndex, 0);
    expect(calendarLocalizations.narrowWeekdays, const [
      'อา.',
      'จ.',
      'อ.',
      'พ.',
      'พฤ.',
      'ศ.',
      'ส.',
    ]);
    final yearSelector = tester.widget<DropdownButton<int>>(
      find.byKey(const Key('app-year-selector')),
    );
    expect(yearSelector.value, 2026);
    expect(yearSelector.items, hasLength(31));
    final calendar = tester.widget<CalendarDatePicker>(
      find.byType(CalendarDatePicker),
    );
    expect(calendar.firstDate, DateTime(2026));
    expect(calendar.lastDate, DateTime(2026, 12, 31));
    final icon = tester.widget<Icon>(find.byIcon(Icons.calendar_month_rounded));
    expect(icon.color, appDatePickerColor);
  });

  testWidgets('custom time picker exposes only 24-hour values', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => showAppTimePicker(
              context: context,
              initialTime: const TimeOfDay(hour: 18, minute: 45),
            ),
            child: const Text('open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('app-time-picker-dialog')), findsOneWidget);
    expect(find.text('18:45'), findsOneWidget);
    expect(find.textContaining('AM'), findsNothing);
    expect(find.textContaining('PM'), findsNothing);

    final selectors = tester
        .widgetList<DropdownButton<int>>(find.byType(DropdownButton<int>))
        .toList();
    expect(selectors, hasLength(2));
    expect(selectors.first.items, hasLength(24));
    expect(selectors.last.items, hasLength(60));
  });

  testWidgets('custom date-time picker combines date and 24-hour time', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => showAppDateTimePicker(
              context: context,
              initialDateTime: DateTime(2026, 8, 13, 18, 45),
              firstDate: DateTime(2000),
              lastDate: DateTime(2030),
            ),
            child: const Text('open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('app-date-time-picker-dialog')),
      findsOneWidget,
    );
    expect(find.text('13/08/2026 18:45'), findsOneWidget);
    expect(find.byKey(const Key('app-year-selector')), findsOneWidget);
    final icon = tester.widget<Icon>(find.byIcon(Icons.calendar_month_rounded));
    expect(icon.color, appDateTimePickerColor);
    expect(find.textContaining('AM'), findsNothing);
    expect(find.textContaining('PM'), findsNothing);
  });
}
