import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/exam.interface.dart' show ExamInsights, WeakTopicInsight;
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
    weeklySubjects: const [
      WeeklySubjectStudy(
        subjectId: 'BI101',
        subjectName: 'Business Intelligence',
        totalMinutes: 30,
      ),
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
          ),
        ],
      ),
    ],
  );

  @override
  Future<StudySession> startSession({
    required int scheduleTimeId,
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

class NoCurrentTermTimeRepository extends FakeTimeRepository {
  @override
  Future<TimerSetup> getSetup() async => throw const TimeException(
    'ยังไม่มีเทอมปัจจุบัน',
    code: 'NO_CURRENT_TERM',
  );
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
  testWidgets('timer uses the shared no-term state', (tester) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(
        home: TimerPage(
          repository: NoCurrentTermTimeRepository(),
          weeklyScheduleLoader: () async => null,
          examInsightsLoader: () async => null,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('timer-no-term')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('timer-no-term'))),
      const Size(280, 250),
    );
    expect(find.text('ยังไม่มีเทอมปัจจุบัน'), findsOneWidget);
    expect(
      find.text('กรุณาสร้างเทอมและตารางเรียนก่อนเริ่มจับเวลา'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('timer-error')), findsNothing);
    expect(find.text('ลองอีกครั้ง'), findsNothing);
  });

  testWidgets('timer page shows timer, statistics, and study history', (
    tester,
  ) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: TimerPage(
          repository: FakeTimeRepository(),
          weeklyScheduleLoader: () async => null,
          examInsightsLoader: () async => const ExamInsights(
            weakTopics: [
              WeakTopicInsight(
                scheduleTimeId: 11,
                examRepositoryId: 1,
                examPartId: 1,
                topicName: 'Query planning',
                subjectId: 'BI101',
                subjectName: 'Business Intelligence',
                examName: 'Midterm',
                actualScore: 4,
                maximumScore: 10,
                percentage: 40,
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('timer-panel')), findsOneWidget);
    expect(find.byKey(const Key('study-statistics')), findsOneWidget);
    expect(find.byKey(const Key('study-history')), findsOneWidget);
    expect(find.text('Business Intelligence'), findsOneWidget);
    expect(find.text('08/26'), findsOneWidget);
    expect(find.text('Progress แยกตามวิชาที่แนะนำ'), findsOneWidget);
    expect(find.byKey(const Key('weekly-review-BI101')), findsOneWidget);
    expect(find.text('00 ชม. 30 นาที'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('user can start, pause, and finish a study session', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTimeRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: TimerPage(
          repository: repository,
          weeklyScheduleLoader: () async => null,
          examInsightsLoader: () async => null,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('timer-subject-dropdown')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Business Intelligence').last);
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
