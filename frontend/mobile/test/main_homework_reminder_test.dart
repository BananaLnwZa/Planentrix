import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/homework.interface.dart';
import 'package:mobile/interfaces/table.interface.dart';
import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/MainPage.dart';
import 'package:mobile/pages/Main/Component/BehaviorSummary.dart';
import 'package:mobile/services/homework.service.dart';
import 'package:mobile/services/table.service.dart';
import 'package:mobile/services/term.service.dart';

class _EmptyTermRepository extends TermRepository {
  final CurrentTerm? currentTerm;
  int acknowledgements = 0;

  _EmptyTermRepository({this.currentTerm});

  @override
  Future<CurrentTerm?> getCurrentTerm() async => currentTerm;

  @override
  Future<CurrentTerm> createTerm(CreateTermRequest request) async =>
      request.toCurrentTerm(1);

  @override
  Future<void> endCurrentTerm() async {}

  @override
  Future<bool> acknowledgeMidtermFollowup() async {
    acknowledgements++;
    return true;
  }
}

class _EmptyTableRepository implements TableRepository {
  @override
  Future<CurrentSchedule?> getCurrentSchedule() async => null;

  @override
  Future<ScheduleItem> getScheduleDetail(int scheduleTimeId) async =>
      throw UnimplementedError();

  @override
  Future<List<ScheduleSubject>> getCurrentTermSubjects() async => const [];

  @override
  Future<void> addSchedule(AddScheduleInput input) async {}

  @override
  Future<void> updateSchedule(
    int scheduleTimeId,
    UpdateScheduleInput input,
  ) async {}

  @override
  Future<void> deleteSchedule(int scheduleTimeId) async {}
}

class _HomeworkRepository implements HomeworkRepository {
  final List<HomeworkTaskData> tasks;

  const _HomeworkRepository(this.tasks);

  @override
  Future<HomeworkOverview> getHomeworkOverview() async => HomeworkOverview(
    tasks: tasks,
    hasCurrentTerm: true,
    hasWorkloads: tasks.isNotEmpty,
  );

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
  Future<void> deleteHomework(int workloadId) async {}

  @override
  Future<void> finishHomework(int workloadId) async {}
}

HomeworkTaskData _task(DateTime deadline) => HomeworkTaskData(
  workloadId: 21,
  scheduleTimeId: 9,
  workloadTypeId: 3,
  workloadTypeName: 'assignment',
  subjectId: 'BI101',
  subject: 'Business Intelligence',
  assignment: 'Dashboard Analysis',
  deadline: deadline,
  dueDate: '22/08/26',
  dueTime: '19:00',
);

void _setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 800);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

Widget _mainPage(
  List<HomeworkTaskData> tasks, {
  Future<TermWorkflow?> Function()? workflowLoader,
  _EmptyTermRepository? termRepository,
  Future<BehaviorSummaryData> Function()? behaviorSummaryLoader,
}) => MaterialApp(
  home: MainPage(
    username: 'Nicha',
    userId: 42,
    logoutAction: () async {},
    termRepository: termRepository ?? _EmptyTermRepository(),
    tableRepository: _EmptyTableRepository(),
    homeworkRepository: _HomeworkRepository(tasks),
    workflowLoader: workflowLoader,
    behaviorSummaryLoader: behaviorSummaryLoader,
  ),
  routes: {'/homework': (_) => const Scaffold(body: Text('Homework page'))},
);

void main() {
  testWidgets('main page shows the final three-week exam notice', (
    tester,
  ) async {
    _setPhoneSize(tester);
    await tester.pumpWidget(
      _mainPage(
        const [],
        workflowLoader: () async => const TermWorkflow(phase: 'final_3w'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('exam-flow-notice')), findsOneWidget);
    expect(find.text('เตรียมสอบปลายภาค · 3 สัปดาห์'), findsOneWidget);
  });

  testWidgets('post-midterm reminder is acknowledged once on mobile', (
    tester,
  ) async {
    _setPhoneSize(tester);
    final terms = _EmptyTermRepository();
    await tester.pumpWidget(
      _mainPage(
        const [],
        termRepository: terms,
        workflowLoader: () async => const TermWorkflow(
          phase: 'midterm_post',
          midtermFollowupPending: true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('midterm-followup-popup')), findsOneWidget);
    await tester.tap(find.text('ไว้ก่อน'));
    await tester.pumpAndSettle();
    expect(terms.acknowledgements, 1);
    expect(find.byKey(const Key('midterm-followup-popup')), findsNothing);
  });

  testWidgets('post-final replaces schedule with summary and hides tabs', (
    tester,
  ) async {
    _setPhoneSize(tester);
    final terms = _EmptyTermRepository(
      currentTerm: CurrentTerm(
        termId: 5,
        yearLevel: '2',
        term: '1',
        academicYear: '2569',
        endFinal: DateTime(2026, 10, 1),
      ),
    );
    await tester.pumpWidget(
      _mainPage(
        const [],
        termRepository: terms,
        workflowLoader: () async =>
            const TermWorkflow(phase: 'final_post', postFinal: true),
        behaviorSummaryLoader: () async => const BehaviorSummaryData(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('behavior-summary')), findsOneWidget);
    expect(find.byKey(const Key('notebook-tabs')), findsNothing);
    expect(find.byKey(const Key('schedule-0')), findsNothing);
    await tester.tap(find.byKey(const Key('current-term-card')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('end-term-button')), findsOneWidget);
  });

  testWidgets('term and active alerts share one compact row', (tester) async {
    _setPhoneSize(tester);
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1, 19);
    await tester.pumpWidget(_mainPage([_task(tomorrow)]));
    await tester.pumpAndSettle();

    final student = find.byKey(const Key('student-card'));
    final reminder = find.byKey(const Key('main-notification-card'));
    final term = find.byKey(const Key('term-card'));

    expect(reminder, findsOneWidget);
    expect(find.byKey(const Key('compact-term-header')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('compact-term-header'))).height,
      36,
    );
    expect(
      tester.getBottomLeft(student).dy,
      lessThan(tester.getTopLeft(reminder).dy),
    );
    expect(
      tester.getTopLeft(reminder).dy,
      closeTo(tester.getTopLeft(term).dy, 0.1),
    );
    expect(
      tester.getSize(reminder).height,
      closeTo(tester.getSize(term).height, 0.1),
    );
    expect(
      tester.getTopLeft(reminder).dx,
      greaterThan(tester.getTopLeft(term).dx),
    );
    expect(
      tester.getSize(reminder).width,
      greaterThan(tester.getSize(term).width),
    );

    await tester.tap(find.byKey(const Key('main-notification-button')));
    await tester.pumpAndSettle();

    final popup = find.byKey(const Key('main-notification-popup'));
    expect(popup, findsOneWidget);
    expect(
      find.descendant(of: popup, matching: find.text('Business Intelligence')),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: popup,
        matching: find.textContaining('Dashboard Analysis'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('notification card stays empty before the day-before window', (
    tester,
  ) async {
    _setPhoneSize(tester);
    await tester.pumpWidget(
      _mainPage([_task(DateTime.now().add(const Duration(days: 2)))]),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('main-notification-card')), findsOneWidget);
    expect(find.text('ยังไม่มีรายการที่ต้องแจ้งเตือน'), findsOneWidget);

    await tester.tap(find.byKey(const Key('main-notification-button')));
    await tester.pump();
    expect(find.byKey(const Key('main-notification-popup')), findsNothing);
  });
}
