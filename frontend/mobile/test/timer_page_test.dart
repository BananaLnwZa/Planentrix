import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/time.interface.dart';
import 'package:mobile/pages/Timer/Timer.dart';
import 'package:mobile/services/time.service.dart';

class FakeTimeRepository implements TimeRepository {
  String? lastAction;
  StudySession? activeSession;

  final term = const TimerTerm(
    termId: 1,
    term: 1,
    semester: '1',
    academicYear: 2569,
  );

  StudySession session(String status, int version, {int elapsed = 0}) =>
      StudySession(
        studyTimeId: 71,
        scheduleTimeId: 11,
        studyTypeId: 1,
        studyTypeName: 'reading',
        subjectId: 'BI101',
        subjectName: 'Business Intelligence',
        sessionStatus: status,
        version: version,
        elapsedSeconds: elapsed,
      );

  @override
  Future<TimerSetup> getSetup() async => TimerSetup(
    currentTerm: term,
    subjects: const [
      TimerSubject(
        scheduleTimeId: 11,
        subjectId: 'BI101',
        subjectName: 'Business Intelligence',
      ),
    ],
    studyTypes: const [
      StudyType(studyTypeId: 1, studyTypeName: 'reading'),
      StudyType(studyTypeId: 2, studyTypeName: 'practice'),
    ],
    policy: const TimerPolicy(),
  );

  @override
  Future<ActiveStudySession> getActiveSession() async =>
      ActiveStudySession(session: activeSession);

  @override
  Future<StudyDashboard> getDashboard() async => StudyDashboard(
    currentTerm: term,
    summary: const StudySummary(
      currentWeekMinutes: 90,
      averageWeeklyMinutes: 75,
      averageMonthlyMinutes: 300,
      totalTermMinutes: 420,
    ),
    weeks: const [
      StudyWeek(weekNumber: 1, totalMinutes: 60),
      StudyWeek(weekNumber: 2, totalMinutes: 90),
    ],
    history: const [
      MonthlyStudyHistory(
        monthKey: '2026-08',
        totalMinutes: 90,
        sessionCount: 2,
        subjects: [
          SubjectStudyHistory(
            subjectId: 'BI101',
            subjectName: 'Business Intelligence',
            totalMinutes: 90,
            sessionCount: 2,
            methods: {'reading': 60, 'practice': 30},
          ),
        ],
      ),
    ],
  );

  @override
  Future<StudySession> startSession({
    required int scheduleTimeId,
    required int studyTypeId,
  }) async {
    lastAction = 'start';
    activeSession = session('running', 1);
    return activeSession!;
  }

  @override
  Future<StudySession> pauseSession(int studyTimeId, int version) async {
    lastAction = 'pause';
    activeSession = session('paused', version + 1, elapsed: 1);
    return activeSession!;
  }

  @override
  Future<StudySession> resumeSession(int studyTimeId, int version) async {
    lastAction = 'resume';
    activeSession = session('running', version + 1, elapsed: 1);
    return activeSession!;
  }

  @override
  Future<StudySession> finishSession(int studyTimeId, int version) async {
    lastAction = 'finish';
    activeSession = null;
    return session('completed', version + 1, elapsed: 1);
  }

  @override
  Future<StudySession> heartbeatSession(int studyTimeId, int version) async =>
      activeSession ?? session('running', version + 1);

  @override
  Future<StudySession> recoverSession(
    int studyTimeId,
    int version,
    String action,
  ) async {
    lastAction = action;
    activeSession = action == 'continue'
        ? session('running', version + 1)
        : null;
    return activeSession ?? session('completed', version + 1);
  }
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
  testWidgets('timer page shows timer, statistics, and study history', (
    tester,
  ) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: TimerPage(repository: FakeTimeRepository()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('timer-panel')), findsOneWidget);
    expect(find.byKey(const Key('study-statistics')), findsOneWidget);
    expect(find.byKey(const Key('study-history')), findsOneWidget);
    expect(find.text('Business Intelligence'), findsOneWidget);
    expect(find.text('สิงหาคม 2569'), findsOneWidget);
    expect(find.text('อ่านตำรา/เอกสาร 01 ชม. 00 นาที'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('user can start, pause, and finish a study session', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTimeRepository();
    await tester.pumpWidget(
      MaterialApp(home: TimerPage(repository: repository)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('timer-subject-dropdown')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Business Intelligence').last);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('timer-study-type-dropdown')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('อ่านตำรา/เอกสาร').last);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('timer-start-button')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(repository.lastAction, 'start');
    expect(find.byKey(const Key('timer-pause-button')), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    expect(find.byKey(const Key('timer-clock')), findsOneWidget);
    await tester.tap(find.byKey(const Key('timer-pause-button')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(repository.lastAction, 'pause');
    expect(find.byKey(const Key('timer-resume-button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('timer-finish-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('finish-session-popup')), findsOneWidget);
    await tester.tap(find.byKey(const Key('finish-session-confirm')));
    await tester.pumpAndSettle();

    expect(repository.lastAction, 'finish');
    expect(find.byKey(const Key('timer-start-button')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
