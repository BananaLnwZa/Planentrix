import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/profile.interface.dart';
import 'package:mobile/interfaces/table.interface.dart';
import 'package:mobile/pages/Main/Component/Schedule.dart';
import 'package:mobile/services/table.service.dart';

class FakeTableRepository implements TableRepository {
  int updateCount = 0;
  var items = <ScheduleItem>[
    const ScheduleItem(
      scheduleTimeId: 1,
      scheduleTypeId: 1,
      scheduleTypeName: 'Class',
      subjectId: 'BI101',
      subjectName: 'Business Intelligence',
      scheduleDay: 1,
      startTime: '09:30',
      endTime: '17:00',
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
    updateCount += 1;
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
    expect(find.text('06:00'), findsNothing);
    expect(find.text('09:00'), findsOneWidget);
    expect(find.text('17:00'), findsOneWidget);
    expect(find.byKey(const Key('schedule-block-1')), findsOneWidget);

    await tester.tap(find.byKey(const Key('schedule-block-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('schedule-details-popup')), findsOneWidget);
    expect(find.text('Business Intelligence'), findsWidgets);
    expect(find.byKey(const Key('edit-schedule-button')), findsOneWidget);
    expect(find.byKey(const Key('delete-schedule-button')), findsNothing);
  });

  testWidgets('constraint conflict must be confirmed before schedule update', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTableRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Schedule(
            repository: repository,
            constraint: const UserConstraint(
              constraintId: 1,
              userId: 7,
              dayOff: 1,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('schedule-block-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('edit-schedule-button')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('save-schedule-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('constraint-overlap-warning')), findsOneWidget);
    expect(repository.updateCount, 0);

    await tester.tap(find.byKey(const Key('confirm-constraint-overlap')));
    await tester.pumpAndSettle();
    expect(repository.updateCount, 1);
  });

  testWidgets('schedule hides its grid and add button when it has no items', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTableRepository()..items.clear();
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

    expect(find.byKey(const Key('schedule-header')), findsNothing);
    expect(find.byKey(const Key('schedule-time-list')), findsNothing);
    expect(find.byKey(const Key('add-schedule-button')), findsNothing);
    expect(
      find.text('ยังไม่มีข้อมูลตารางเวลาสำหรับเทอมปัจจุบัน'),
      findsOneWidget,
    );
  });

  testWidgets('schedule range supports times before 06:00 and after 23:00', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTableRepository()
      ..items = const [
        ScheduleItem(
          scheduleTimeId: 3,
          scheduleTypeId: 2,
          scheduleTypeName: 'Review',
          subjectId: 'BI101',
          subjectName: 'Business Intelligence',
          scheduleDay: 2,
          startTime: '05:30',
          endTime: '23:30',
        ),
      ];
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

    expect(find.text('05:00'), findsOneWidget);
    expect(find.text('24:00'), findsOneWidget);
    expect(find.byKey(const Key('schedule-block-3')), findsOneWidget);
  });

  testWidgets(
    'short schedules keep their first block time and show ten hours',
    (tester) async {
      setPhoneSize(tester);
      final repository = FakeTableRepository()
        ..items = const [
          ScheduleItem(
            scheduleTimeId: 4,
            scheduleTypeId: 1,
            scheduleTypeName: 'Class',
            subjectId: 'BI101',
            subjectName: 'Business Intelligence',
            scheduleDay: 1,
            startTime: '09:30',
            endTime: '10:30',
          ),
        ];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: Schedule(repository: repository)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('08:00'), findsNothing);
      expect(find.text('09:00'), findsOneWidget);
      expect(find.text('19:00'), findsOneWidget);
      expect(find.byKey(const Key('schedule-block-4')), findsOneWidget);
    },
  );
}
