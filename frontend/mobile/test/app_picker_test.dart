import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/common/AppDropdown.dart';
import 'package:mobile/common/AppDatePicker.dart';
import 'package:mobile/common/AppDateTimePicker.dart';
import 'package:mobile/common/AppTimePicker.dart';

void main() {
  testWidgets('custom dropdown stays attached while its page scrolls', (
    tester,
  ) async {
    final scrollController = ScrollController();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListView(
            controller: scrollController,
            children: [
              const SizedBox(height: 120),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: AppDropdown<int>(
                  value: 1,
                  items: const [
                    AppDropdownItem(
                      value: 1,
                      label: 'One',
                      optionKey: Key('scroll-dropdown-option'),
                    ),
                    AppDropdownItem(value: 2, label: 'Two'),
                  ],
                  onChanged: (_) {},
                ),
              ),
              const SizedBox(height: 800),
            ],
          ),
        ),
      ),
    );

    await tester.tap(find.byType(AppDropdown<int>));
    await tester.pumpAndSettle();
    final fieldBefore = tester.getTopLeft(find.byType(AppDropdown<int>)).dy;
    final optionBefore = tester
        .getTopLeft(find.byKey(const Key('scroll-dropdown-option')))
        .dy;

    scrollController.jumpTo(70);
    await tester.pump();

    final fieldAfter = tester.getTopLeft(find.byType(AppDropdown<int>)).dy;
    final optionAfter = tester
        .getTopLeft(find.byKey(const Key('scroll-dropdown-option')))
        .dy;
    expect(fieldBefore - fieldAfter, closeTo(70, 0.1));
    expect(optionBefore - optionAfter, closeTo(70, 0.1));
  });

  testWidgets('long custom dropdown can scroll to every option', (
    tester,
  ) async {
    var value = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: StatefulBuilder(
              builder: (context, setState) => SizedBox(
                width: 160,
                child: AppDropdown<int>(
                  value: value,
                  items: List.generate(
                    60,
                    (index) => AppDropdownItem(
                      value: index,
                      label: index.toString().padLeft(2, '0'),
                      optionKey: Key('long-option-$index'),
                    ),
                  ),
                  onChanged: (next) => setState(() => value = next!),
                  maxMenuHeight: 240,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byType(AppDropdown<int>));
    await tester.pumpAndSettle();
    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable));
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, greaterThan(0));
    scrollable.position.jumpTo(scrollable.position.maxScrollExtent);
    await tester.pump();
    await tester.tap(find.byKey(const Key('long-option-59')));
    await tester.pumpAndSettle();

    expect(value, 59);
  });

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
    final yearSelector = tester.widget<AppDropdown<int>>(
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
        .widgetList<AppDropdown<int>>(find.byType(AppDropdown<int>))
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
