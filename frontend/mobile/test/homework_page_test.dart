import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/common/HomeworkTimeFormat.dart';
import 'package:mobile/interfaces/homework.interface.dart';
import 'package:mobile/interfaces/score.interface.dart';
import 'package:mobile/pages/Homework/Component/HomeworkSectionHeader.dart';
import 'package:mobile/pages/Homework/Component/SubmitHomeworkButton.dart';
import 'package:mobile/pages/Homework/Homework.dart';
import 'package:mobile/pages/Score/Score.dart';
import 'package:mobile/services/homework.service.dart';
import 'package:mobile/services/score.service.dart';

List<HomeworkTaskData> sampleTasks() => [
  HomeworkTaskData(
    workloadId: 1,
    scheduleTimeId: 11,
    workloadTypeId: 3,
    workloadTypeName: 'assignment',
    subjectId: 'CS101',
    subject: 'Numerical Method',
    assignment: 'แบบฝึกหัด 2',
    deadline: DateTime(2026, 5, 4, 17),
    dueDate: '4/5/2569',
    dueTime: '17:00',
    note: 'ทบทวนบทที่ 2',
  ),
  HomeworkTaskData(
    workloadId: 2,
    scheduleTimeId: 12,
    workloadTypeId: 3,
    workloadTypeName: 'assignment',
    subjectId: 'CS102',
    subject: 'Web Programing',
    assignment: 'แบบฝึกหัด 1',
    deadline: DateTime(2026, 5, 12, 17),
    dueDate: '12/5/2569',
    dueTime: '17:00',
  ),
  HomeworkTaskData(
    workloadId: 3,
    scheduleTimeId: 11,
    workloadTypeId: 3,
    workloadTypeName: 'assignment',
    subjectId: 'CS101',
    subject: 'Numerical Method',
    assignment: 'แบบฝึกหัด 4',
    deadline: DateTime(2026, 5, 12, 17),
    dueDate: '12/5/2569',
    dueTime: '17:00',
  ),
  HomeworkTaskData(
    workloadId: 4,
    scheduleTimeId: 11,
    workloadTypeId: 3,
    workloadTypeName: 'assignment',
    subjectId: 'CS101',
    subject: 'Numerical Method',
    assignment: 'แบบฝึกหัด 5',
    deadline: DateTime(2026, 5, 16, 17),
    dueDate: '16/5/2569',
    dueTime: '17:00',
  ),
  HomeworkTaskData(
    workloadId: 5,
    scheduleTimeId: 11,
    workloadTypeId: 3,
    workloadTypeName: 'assignment',
    subjectId: 'CS101',
    subject: 'Numerical Method',
    assignment: 'งานล่าช้า',
    deadline: DateTime(2026, 5, 2, 15),
    dueDate: '2/5/2569',
    dueTime: '15:00',
  ),
];

class FakeHomeworkRepository implements HomeworkRepository {
  final List<HomeworkTaskData> tasks;
  final List<int> finishedIds = [];
  final List<int> updatedIds = [];
  final List<int> deletedIds = [];

  FakeHomeworkRepository([List<HomeworkTaskData>? tasks]) : tasks = [...?tasks];

  @override
  Future<List<HomeworkTaskData>> getPendingHomework() async => [...tasks];

  @override
  Future<List<HomeworkSubject>> getSubjects() async => const [
    HomeworkSubject(
      scheduleTimeId: 11,
      subjectId: 'CS101',
      subjectName: 'Numerical Method',
      teacherName: 'Teacher',
    ),
  ];

  @override
  Future<HomeworkTaskData> createHomework(CreateHomeworkInput input) async {
    final task = HomeworkTaskData(
      workloadId: 99,
      scheduleTimeId: input.subject.scheduleTimeId,
      workloadTypeId: input.type.id,
      workloadTypeName: input.type.name,
      subjectId: input.subject.subjectId,
      subject: input.subject.subjectName,
      assignment: input.assignment,
      deadline: input.deadline,
      dueDate:
          '${input.deadline.day}/${input.deadline.month}/${input.deadline.year + 543}',
      dueTime: formatHomeworkDisplayTime(input.deadline),
    );
    tasks.add(task);
    return task;
  }

  @override
  Future<HomeworkTaskData> updateHomework(
    HomeworkTaskData task,
    UpdateHomeworkInput input,
  ) async {
    final index = tasks.indexWhere(
      (item) => item.workloadId == task.workloadId,
    );
    final updated = tasks[index].copyWith(
      assignment: input.assignment,
      deadline: input.deadline,
      note: input.note,
    );
    tasks[index] = updated;
    updatedIds.add(task.workloadId);
    return updated;
  }

  @override
  Future<void> deleteHomework(int workloadId) async {
    deletedIds.add(workloadId);
    tasks.removeWhere((task) => task.workloadId == workloadId);
  }

  @override
  Future<void> finishHomework(int workloadId) async {
    finishedIds.add(workloadId);
    tasks.removeWhere((task) => task.workloadId == workloadId);
  }
}

class SharedHomeworkScoreRepository
    implements HomeworkRepository, ScoreRepository {
  bool isFinished = false;

  final task = HomeworkTaskData(
    workloadId: 91,
    scheduleTimeId: 51,
    workloadTypeId: 3,
    workloadTypeName: 'assignment',
    subjectId: 'CS501',
    subject: 'Mobile Development',
    assignment: 'งานเชื่อมหน้า',
    deadline: DateTime(2026, 5, 4, 17),
    dueDate: '4/5/2569',
    dueTime: '17:00',
  );

  @override
  Future<List<HomeworkTaskData>> getPendingHomework() async =>
      isFinished ? [] : [task];

  @override
  Future<List<HomeworkSubject>> getSubjects() async => const [];

  @override
  Future<HomeworkTaskData> createHomework(CreateHomeworkInput input) async =>
      throw UnimplementedError();

  @override
  Future<HomeworkTaskData> updateHomework(
    HomeworkTaskData task,
    UpdateHomeworkInput input,
  ) async => throw UnimplementedError();

  @override
  Future<void> deleteHomework(int workloadId) async =>
      throw UnimplementedError();

  @override
  Future<void> finishHomework(int workloadId) async {
    expect(workloadId, task.workloadId);
    isFinished = true;
  }

  @override
  Future<List<SubjectScore>> getCompletedSubjectScores() async => [
    SubjectScore(
      scheduleTimeId: 51,
      subjectId: 'CS501',
      subjectName: 'Mobile Development',
      credits: 3,
      teacherName: 'Teacher',
      targetScore: 3.5,
      workloads: isFinished
          ? const [
              WorkloadScore(
                workloadId: 91,
                workloadName: 'งานเชื่อมหน้า',
                workloadTypeId: 3,
                workloadTypeName: 'assignment',
                workloadStatus: 1,
              ),
            ]
          : const [],
    ),
  ];

  @override
  Future<OverallGradeSummary> getOverallGrade() async =>
      const OverallGradeSummary(
        targetGpa: 3.5,
        actualGpa: 0,
        grade: 'F',
        percent: 0,
        maximumGpa: 4,
      );

  @override
  Future<void> saveTargetGrades(Map<int, String> goals) async {}

  @override
  Future<void> saveWorkloadScore(
    int workloadId,
    WorkloadScoreInput input,
  ) async {}
}

void setPhoneSize(WidgetTester tester, [Size size = const Size(360, 640)]) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  test('homework uses 24-hour time for display and backend payloads', () {
    final deadline = DateTime(2026, 5, 4, 17, 5, 9);

    expect(formatHomeworkDisplayTime(deadline), '17:05');
    expect(formatHomeworkApiTime(deadline), '17:05:09');
    expect(
      HomeworkTaskData.fromJson({
        'deadline_date': '2026-05-04',
        'deadline_time': '17:05:09',
      }).dueTime,
      '17:05',
    );
  });

  test('homework keeps the calendar date returned by the pending API', () {
    final task = HomeworkTaskData.fromJson({
      'deadline_date': '2026-05-04',
      'deadline_time': '17:05:09',
    });

    expect(task.deadline, DateTime(2026, 5, 4, 17, 5));
    expect(task.dueDate, '4/5/2569');
  });

  test('homework types use the IDs defined by the backend database', () {
    expect(
      {for (final type in homeworkTypeOptions) type.name: type.id},
      const {
        'midterm': 1,
        'final': 2,
        'assignment': 3,
        'quiz': 4,
        'project': 5,
      },
    );
  });

  testWidgets('homework page matches the grouped Figma layout', (tester) async {
    setPhoneSize(tester);
    final repository = FakeHomeworkRepository(sampleTasks());
    var addPressed = false;
    HomeworkTaskData? submittedTask;

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: repository,
          now: () => DateTime(2026, 5, 3, 12),
          onAddHomework: () => addPressed = true,
          onSubmitHomework: (task) => submittedTask = task,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('homework-page')), findsOneWidget);
    expect(find.byKey(const Key('homework-add-button')), findsOneWidget);
    expect(
      tester.getCenter(find.byKey(const Key('homework-add-label'))).dy,
      closeTo(
        tester.getCenter(find.byKey(const Key('homework-add-button'))).dy,
        1.5,
      ),
    );
    expect(find.text('ส่งพรุ่งนี้'), findsOneWidget);
    expect(find.text('12 พ.ค. 2569'), findsOneWidget);
    expect(find.text('16 พ.ค. 2569'), findsOneWidget);
    expect(find.text('ล่าช้า'), findsOneWidget);
    expect(find.byKey(const Key('homework-task-0-0')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-1-0')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-1-1')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-2-0')), findsOneWidget);
    expect(find.byKey(const Key('homework-task-3-0')), findsOneWidget);

    final tomorrowHeader = tester.widget<HomeworkSectionHeader>(
      find.byKey(const Key('homework-group-0')),
    );
    final dateHeader = tester.widget<HomeworkSectionHeader>(
      find.byKey(const Key('homework-group-1')),
    );
    final overdueHeader = tester.widget<HomeworkSectionHeader>(
      find.byKey(const Key('homework-group-3')),
    );
    expect(tomorrowHeader.type, HomeworkSectionType.tomorrow);
    expect(dateHeader.type, HomeworkSectionType.date);
    expect(overdueHeader.type, HomeworkSectionType.overdue);

    await tester.tap(find.byKey(const Key('homework-add-button')));
    expect(addPressed, isTrue);

    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: Offset.zero);
    await mouse.moveTo(
      tester.getCenter(find.byKey(const Key('homework-add-button'))),
    );
    await tester.pumpAndSettle();
    final hoveredButton = tester.widget<AnimatedContainer>(
      find.byKey(const Key('homework-add-button')),
    );
    final hoveredDecoration = hoveredButton.decoration! as BoxDecoration;
    expect(hoveredDecoration.color, const Color(0xFFE29DC7));
    expect(
      DefaultTextStyle.of(tester.element(find.text('เพิ่มงาน'))).style.color,
      Colors.white,
    );
    await mouse.removePointer();

    final firstSubmitButton = find.descendant(
      of: find.byKey(const Key('homework-task-0-0')),
      matching: find.byType(SubmitHomeworkButton),
    );
    final submitLabel = find.descendant(
      of: firstSubmitButton,
      matching: find.byKey(const Key('homework-submit-label')),
    );
    final submitCheck = find.descendant(
      of: firstSubmitButton,
      matching: find.byKey(const Key('homework-submit-check')),
    );
    expect(submitLabel, findsOneWidget);
    expect(submitCheck, findsOneWidget);
    expect(
      tester.getCenter(submitCheck).dx,
      greaterThan(tester.getCenter(submitLabel).dx),
    );
    await tester.tap(firstSubmitButton);
    await tester.pumpAndSettle();
    expect(repository.finishedIds, [1]);
    expect(submittedTask?.assignment, 'แบบฝึกหัด 2');
    expect(find.text('แบบฝึกหัด 2'), findsNothing);

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

  testWidgets('homework components remain inside a compact phone', (
    tester,
  ) async {
    setPhoneSize(tester, const Size(320, 568));

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: FakeHomeworkRepository(sampleTasks()),
          now: () => DateTime(2026, 5, 3, 12),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final cover = tester.getRect(
      find.byKey(const Key('notebook-cover-homework')),
    );
    final addButton = tester.getRect(
      find.byKey(const Key('homework-add-button')),
    );
    final firstTask = tester.getRect(
      find.byKey(const Key('homework-task-0-0')),
    );
    expect(addButton.left, greaterThanOrEqualTo(cover.left));
    expect(addButton.right, lessThanOrEqualTo(cover.right));
    expect(firstTask.left, greaterThanOrEqualTo(cover.left));
    expect(firstTask.right, lessThanOrEqualTo(cover.right));
    expect(tester.takeException(), isNull);
  });

  testWidgets('tapping a homework card opens its details popup', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeHomeworkRepository(sampleTasks());

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: repository,
          now: () => DateTime(2026, 5, 3, 12),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final taskCard = find.byKey(const Key('homework-task-0-0'));
    final taskRect = tester.getRect(taskCard);
    await tester.tapAt(Offset(taskRect.left + 8, taskRect.center.dy));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('homework-details-popup')), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const Key('homework-details-subject')),
        matching: find.text('Numerical Method'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byKey(const Key('homework-details-type')),
        matching: find.text('assignment'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byKey(const Key('homework-details-name')),
        matching: find.text('แบบฝึกหัด 2'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byKey(const Key('homework-details-deadline')),
        matching: find.text('4/5/2569 17:00'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byKey(const Key('homework-details-note')),
        matching: find.text('ทบทวนบทที่ 2'),
      ),
      findsOneWidget,
    );
    expect(find.byKey(const Key('delete-homework-button')), findsOneWidget);
    expect(find.byKey(const Key('edit-homework-button')), findsOneWidget);
    expect(find.byKey(const Key('delete-homework-icon')), findsOneWidget);
    expect(find.byKey(const Key('edit-homework-icon')), findsOneWidget);

    await tester.tap(find.byKey(const Key('edit-homework-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('homework-details-popup')), findsOneWidget);
    expect(find.byKey(const Key('homework-edit-name-field')), findsOneWidget);
    expect(
      find.byKey(const Key('homework-edit-deadline-field')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('homework-edit-note-field')), findsOneWidget);
    expect(
      find.byKey(const Key('save-homework-changes-button')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('delete-homework-button')), findsNothing);
    expect(find.byKey(const Key('edit-homework-button')), findsNothing);
    expect(tester.takeException(), isNull, reason: 'after entering edit mode');

    await tester.enterText(
      find.byKey(const Key('homework-edit-name-field')),
      'แบบฝึกหัด 2 แก้ไข',
    );
    await tester.enterText(
      find.byKey(const Key('homework-edit-note-field')),
      'โน้ตที่แก้ไขแล้ว',
    );
    expect(tester.takeException(), isNull, reason: 'after editing text');
    await tester.tap(find.byKey(const Key('save-homework-changes-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('homework-details-popup')), findsNothing);
    expect(repository.updatedIds, [1]);
    expect(find.text('แบบฝึกหัด 2 แก้ไข'), findsOneWidget);
    expect(repository.finishedIds, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('delete button removes the homework from the page', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeHomeworkRepository(sampleTasks());

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: repository,
          now: () => DateTime(2026, 5, 3, 12),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final taskCard = find.byKey(const Key('homework-task-0-0'));
    final taskRect = tester.getRect(taskCard);
    await tester.tapAt(Offset(taskRect.left + 8, taskRect.center.dy));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('delete-homework-button')));
    await tester.pumpAndSettle();

    expect(repository.deletedIds, [1]);
    expect(find.byKey(const Key('homework-details-popup')), findsNothing);
    expect(find.text('แบบฝึกหัด 2'), findsNothing);
    expect(repository.finishedIds, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('add button opens the Figma homework popup', (tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: FakeHomeworkRepository(),
          now: () => DateTime(2026, 5, 3, 12),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('homework-add-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('add-homework-popup')), findsOneWidget);
    expect(find.byKey(const Key('homework-subject-field')), findsOneWidget);
    expect(find.byKey(const Key('homework-name-field')), findsOneWidget);
    expect(find.byKey(const Key('homework-deadline-field')), findsOneWidget);
    expect(find.byKey(const Key('homework-note-field')), findsOneWidget);
    for (final type in homeworkTypeOptions) {
      expect(find.byKey(Key('homework-type-${type.id}')), findsOneWidget);
    }

    const normalColors = {
      4: Color(0xFFC5DBAA),
      2: Color(0xE6FFE7AB),
      1: Color(0xE6B3F7EF),
      5: Color(0xE6FA86A3),
      3: Color(0xE6EECDF9),
    };
    const hoverColors = {
      4: Color(0xFFA5BE85),
      2: Color(0xE6F6D481),
      1: Color(0xFF74DBD0),
      5: Color(0xFFD45A78),
      3: Color(0xE6D19EE2),
    };
    for (final entry in normalColors.entries) {
      final surface = tester.widget<AnimatedContainer>(
        find.byKey(Key('homework-type-surface-${entry.key}')),
      );
      expect((surface.decoration! as BoxDecoration).color, entry.value);
    }

    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: Offset.zero);
    for (final entry in hoverColors.entries) {
      await mouse.moveTo(
        tester.getCenter(find.byKey(Key('homework-type-${entry.key}'))),
      );
      await tester.pumpAndSettle();
      final surface = tester.widget<AnimatedContainer>(
        find.byKey(Key('homework-type-surface-${entry.key}')),
      );
      expect((surface.decoration! as BoxDecoration).color, entry.value);
    }
    await mouse.removePointer();

    await tester.tap(find.byKey(const Key('save-homework-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('add-homework-validation')), findsOneWidget);
    expect(find.byKey(const Key('add-homework-popup')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('add homework allows selecting a past deadline', (tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: FakeHomeworkRepository(),
          now: () => DateTime(2026, 5, 3, 12),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('homework-add-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('homework-deadline-field')));
    await tester.pumpAndSettle();

    final picker = tester.widget<DatePickerDialog>(
      find.byType(DatePickerDialog),
    );
    expect(picker.firstDate, DateTime(2000));
    expect(picker.firstDate.isBefore(DateTime.now()), isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('submitted homework moves from Homework to its Score subject', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = SharedHomeworkScoreRepository();

    await tester.pumpWidget(
      MaterialApp(
        home: HomeworkPage(
          repository: repository,
          now: () => DateTime(2026, 5, 3, 12),
        ),
        routes: {
          '/homework': (_) => HomeworkPage(
            repository: repository,
            now: () => DateTime(2026, 5, 3, 12),
          ),
          '/score': (_) => ScorePage(repository: repository),
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('งานเชื่อมหน้า'), findsOneWidget);
    await tester.tap(find.byType(SubmitHomeworkButton));
    await tester.pumpAndSettle();
    expect(find.text('งานเชื่อมหน้า'), findsNothing);

    await tester.tap(find.byKey(const Key('notebook-tab-score')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('score-page')), findsOneWidget);
    expect(find.text('Mobile Development'), findsWidgets);
    expect(find.text('งานเชื่อมหน้า'), findsOneWidget);
    expect(find.byKey(const Key('score-entry-91')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
