import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/profile.interface.dart';
import 'package:mobile/interfaces/table.interface.dart';
import 'package:mobile/interfaces/recommendation.interface.dart';
import 'package:mobile/pages/Main/Component/Schedule.dart';
import 'package:mobile/services/recommendation.service.dart';
import 'package:mobile/services/table.service.dart';

class FakeAcceptedRecommendationRepository implements RecommendationRepository {
  int updateCount = 0;

  final block = const WeeklyScheduleBlock(
    weeklyBlockId: 7,
    recommendationId: 3,
    subjectId: 'BI101',
    subjectName: 'Business Intelligence',
    scheduleTypeId: 2,
    scheduleTypeName: 'Review',
    scheduleTypeCode: 'review',
    scheduledDate: '2026-10-12',
    startTime: '13:00',
    endTime: '14:00',
    source: 'rule_based',
    isUserModified: false,
  );

  @override
  Future<AcceptedWeeklySchedule> getWeeklySchedule({String? weekStart}) async =>
      AcceptedWeeklySchedule(
        weekStart: '2026-10-12',
        weekEnd: '2026-10-18',
        acceptedRecommendation: const WeeklyRecommendation(
          recommendationId: 3,
          userId: 1,
          termId: 1,
          version: 1,
          weekStart: '2026-10-12',
          weekEnd: '2026-10-18',
          triggerType: 'weekend',
          status: 'accepted',
        ),
        weeklyBlocks: [block],
      );

  @override
  Future<WeeklyRecommendation?> getLatest({String? weekStart}) async => null;
  @override
  Future<WeeklyRecommendation> accept(int recommendationId) =>
      throw UnimplementedError();
  @override
  Future<WeeklyRecommendation> addBlock(
    int recommendationId,
    WeeklyBlockInput input,
  ) => throw UnimplementedError();
  @override
  Future<WeeklyRecommendation> updateBlock(
    int recommendationId,
    int weeklyBlockId,
    WeeklyBlockInput input,
  ) {
    updateCount += 1;
    throw UnimplementedError();
  }

  @override
  Future<WeeklyRecommendation> deleteBlock(
    int recommendationId,
    int weeklyBlockId,
  ) => throw UnimplementedError();
}

class FakeTableRepository implements TableRepository {
  int updateCount = 0;
  var items = <ScheduleItem>[
    const ScheduleItem(
      scheduleTimeId: 1,
      scheduleTypeId: 0,
      scheduleTypeName: 'Class',
      scheduleTypeCode: 'class',
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

Future<void> tapVisibleScheduleBlock(WidgetTester tester, String key) async {
  final block = find.byKey(Key(key));
  final scroll = find.byKey(const Key('schedule-horizontal-scroll'));
  final left = tester.getTopLeft(block).dx;
  if (left > 220) {
    await tester.drag(scroll, Offset(120 - left, 0));
    await tester.pumpAndSettle();
  }
  final rect = tester.getRect(block);
  await tester.tapAt(Offset(rect.left + 18, rect.center.dy));
}

void main() {
  testWidgets('accepted weekly block opens read-only details', (tester) async {
    setPhoneSize(tester);
    final recommendations = FakeAcceptedRecommendationRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Schedule(
            repository: FakeTableRepository(),
            recommendationRepository: recommendations,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tapVisibleScheduleBlock(tester, 'schedule-block--7');
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('weekly-block-details-popup')), findsOneWidget);
    expect(find.text('ทบทวน'), findsOneWidget);
    expect(find.text('Business Intelligence'), findsWidgets);
    expect(find.text('13:00 – 14:00 น.'), findsOneWidget);
    expect(find.text('รายละเอียดบล็อกเวลา'), findsNothing);
    expect(
      find.text('ตารางนี้ยืนยันใช้งานแล้ว สามารถดูรายละเอียดได้อย่างเดียว'),
      findsNothing,
    );
    expect(find.byKey(const Key('recommendation-adjust-button')), findsNothing);
    expect(find.byKey(const Key('edit-schedule-button')), findsNothing);
    expect(recommendations.updateCount, 0);
  });

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
    expect(find.text('วัน'), findsOneWidget);
    for (final day in ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']) {
      expect(find.text(day), findsOneWidget);
    }
    expect(
      tester.getTopLeft(find.text('อ.')).dy,
      greaterThan(tester.getTopLeft(find.text('จ.')).dy),
    );
    expect(find.text('06:00'), findsNothing);
    expect(find.text('09:00'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('10:00')).dx,
      greaterThan(tester.getTopLeft(find.text('09:00')).dx),
    );
    expect(find.text('17:00'), findsOneWidget);
    expect(find.byKey(const Key('schedule-block-1')), findsOneWidget);
    final classBlock = find.descendant(
      of: find.byKey(const Key('schedule-block-1')),
      matching: find.byType(Material),
    );
    expect(
      tester.widget<Material>(classBlock.first).color,
      const Color(0xFFDDF1C9),
    );
    final horizontalScroll = tester.widget<SingleChildScrollView>(
      find.byKey(const Key('schedule-horizontal-scroll')),
    );
    expect(horizontalScroll.scrollDirection, Axis.horizontal);
    final timeBefore = tester.getTopLeft(find.text('09:00')).dx;
    final dayBefore = tester.getTopLeft(find.text('ศ.')).dx;
    await tester.drag(
      find.byKey(const Key('schedule-horizontal-scroll')),
      const Offset(-180, 0),
    );
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.text('09:00')).dx, lessThan(timeBefore));
    expect(tester.getTopLeft(find.text('ศ.')).dx, dayBefore);
    await tester.drag(
      find.byKey(const Key('schedule-horizontal-scroll')),
      const Offset(180, 0),
    );
    await tester.pumpAndSettle();

    await tapVisibleScheduleBlock(tester, 'schedule-block-1');
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

    await tapVisibleScheduleBlock(tester, 'schedule-block-1');
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

  testWidgets('read-only exam schedule shows details without edit action', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTableRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: Schedule(repository: repository, readOnly: true)),
      ),
    );
    await tester.pumpAndSettle();

    await tapVisibleScheduleBlock(tester, 'schedule-block-1');
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('schedule-details-popup')), findsOneWidget);
    expect(find.byKey(const Key('edit-schedule-button')), findsNothing);
    expect(find.text('ปิด'), findsOneWidget);
    expect(repository.updateCount, 0);
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
    await tapVisibleScheduleBlock(tester, 'schedule-block-3');
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('edit-schedule-button')), findsNothing);
    expect(find.text('ปิด'), findsOneWidget);
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
