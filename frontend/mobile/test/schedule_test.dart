import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/table.interface.dart';
import 'package:mobile/pages/Main/Component/Schedule.dart';
import 'package:mobile/services/table.service.dart';

class FakeTableRepository implements TableRepository {
  var items = <ScheduleItem>[
    const ScheduleItem(
      scheduleTimeId: 1,
      scheduleTypeId: 1,
      scheduleTypeName: 'Class',
      subjectId: 'BI101',
      subjectName: 'Business Intelligence',
      scheduleDay: 1,
      startTime: '08:00',
      endTime: '10:00',
      classroom: 'SC101',
    ),
  ];

  @override
  Future<CurrentSchedule?> getCurrentSchedule() async => CurrentSchedule(
    currentTerm: const ScheduleTerm(
      termId: 1,
      term: 1,
      academicYear: 3,
      semester: '2569',
    ),
    items: [...items],
  );

  @override
  Future<ScheduleItem> getScheduleDetail(int scheduleTimeId) async =>
      items.firstWhere((item) => item.scheduleTimeId == scheduleTimeId);

  @override
  Future<List<ScheduleSubject>> getCurrentTermSubjects() async => const [
    ScheduleSubject(subjectId: 'BI101', subjectName: 'Business Intelligence'),
  ];

  @override
  Future<void> addSchedule(AddScheduleInput input) async {
    items.add(
      ScheduleItem(
        scheduleTimeId: 2,
        scheduleTypeId: input.scheduleTypeId,
        scheduleTypeName: 'Review',
        subjectId: input.subjectId,
        subjectName: 'Business Intelligence',
        scheduleDay: input.scheduleDay,
        startTime: input.startTime,
        endTime: input.endTime,
      ),
    );
  }

  @override
  Future<void> updateSchedule(
    int scheduleTimeId,
    UpdateScheduleInput input,
  ) async {
    items = items
        .map(
          (item) => item.scheduleTimeId == scheduleTimeId
              ? item.copyWith(
                  scheduleDay: input.scheduleDay,
                  startTime: input.startTime,
                  endTime: input.endTime,
                  classroom: input.classroom,
                  note: input.note,
                )
              : item,
        )
        .toList();
  }

  @override
  Future<void> deleteSchedule(int scheduleTimeId) async {
    items.removeWhere((item) => item.scheduleTimeId == scheduleTimeId);
  }
}

void setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 640);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  testWidgets('schedule loads web data blocks and opens detail popup', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTableRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Schedule(repository: repository),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('schedule')), findsOneWidget);
    expect(tester.getSize(find.byKey(const Key('schedule'))).width, 320);
    expect(find.text('เวลา'), findsOneWidget);
    for (final day in ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']) {
      expect(find.text(day), findsOneWidget);
    }
    expect(find.text('6 AM'), findsOneWidget);
    expect(find.byKey(const Key('schedule-block-1')), findsOneWidget);

    await tester.tap(find.byKey(const Key('schedule-block-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('schedule-details-popup')), findsOneWidget);
    expect(find.text('Business Intelligence'), findsWidgets);
    expect(find.byKey(const Key('edit-schedule-button')), findsOneWidget);
    expect(find.byKey(const Key('delete-schedule-button')), findsNothing);
  });
}
