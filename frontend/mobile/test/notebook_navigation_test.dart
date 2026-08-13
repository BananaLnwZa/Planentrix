import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart' as app;
import 'package:mobile/interfaces/homework.interface.dart';
import 'package:mobile/interfaces/exam.interface.dart';
import 'package:mobile/interfaces/score.interface.dart';
import 'package:mobile/interfaces/time.interface.dart';
import 'package:mobile/interfaces/table.interface.dart';
import 'package:mobile/pages/Homework/Homework.dart';
import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/MainPage.dart';
import 'package:mobile/pages/Score/Score.dart';
import 'package:mobile/pages/Test/Test.dart';
import 'package:mobile/pages/Timer/Timer.dart';
import 'package:mobile/services/term.service.dart';
import 'package:mobile/services/score.service.dart';
import 'package:mobile/services/time.service.dart';
import 'package:mobile/services/homework.service.dart';
import 'package:mobile/services/exam.service.dart';
import 'package:mobile/services/table.service.dart';

class EmptyTermRepository implements TermRepository {
  @override
  Future<CurrentTerm?> getCurrentTerm() async => null;

  @override
  Future<CurrentTerm> createTerm(CreateTermRequest request) async =>
      request.toCurrentTerm(1);

  @override
  Future<void> endCurrentTerm() async {}
}

class EmptyTableRepository implements TableRepository {
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

class EmptyScoreRepository implements ScoreRepository {
  @override
  Future<List<SubjectScore>> getCompletedSubjectScores() async => const [];

  @override
  Future<OverallGradeSummary> getOverallGrade() async =>
      const OverallGradeSummary(
        targetGpa: 0,
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

class EmptyHomeworkRepository implements HomeworkRepository {
  @override
  Future<HomeworkOverview> getHomeworkOverview() async =>
      const HomeworkOverview(
        tasks: [],
        hasCurrentTerm: false,
        hasWorkloads: false,
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
  Future<void> deleteHomework(int workloadId) async =>
      throw UnimplementedError();

  @override
  Future<void> finishHomework(int workloadId) async {}
}

class EmptyExamRepository implements ExamRepository {
  @override
  Future<List<ExamSummary>> getExams() async => const [];

  @override
  Future<ExamDetail> getExamDetail(int examRepositoryId) async =>
      throw UnimplementedError();

  @override
  Future<List<ExamHistoryItem>> getHistory() async => const [];

  @override
  Future<ExamInsights> getInsights() async => const ExamInsights();

  @override
  Future<ExamSubmissionResult> submitExam(
    int examRepositoryId,
    List<ExamAnswer> answers,
  ) async => throw UnimplementedError();
}

class EmptyTimeRepository implements TimeRepository {
  final _term = const TimerTerm(
    termId: 1,
    term: 1,
    semester: '1',
    academicYear: 2569,
  );

  @override
  Future<TimerSetup> getSetup() async => TimerSetup(
    currentTerm: _term,
    subjects: const [],
    studyTypes: const [],
    policy: const TimerPolicy(),
  );

  @override
  Future<ActiveStudySession> getActiveSession() async =>
      const ActiveStudySession();

  @override
  Future<StudyDashboard> getDashboard() async =>
      StudyDashboard(currentTerm: _term, summary: const StudySummary());

  @override
  Future<StudySession> startSession({
    required int scheduleTimeId,
    required int studyTypeId,
  }) => throw UnimplementedError();

  @override
  Future<StudySession> pauseSession(int studyTimeId, int version) =>
      throw UnimplementedError();

  @override
  Future<StudySession> resumeSession(int studyTimeId, int version) =>
      throw UnimplementedError();

  @override
  Future<StudySession> finishSession(int studyTimeId, int version) =>
      throw UnimplementedError();

  @override
  Future<StudySession> heartbeatSession(int studyTimeId, int version) =>
      throw UnimplementedError();

  @override
  Future<StudySession> recoverSession(
    int studyTimeId,
    int version,
    String action,
  ) => throw UnimplementedError();
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
  test('mobile app routes change pages without transition animations', () {
    for (final routeName in [
      '/login',
      '/main',
      '/score',
      '/homework',
      '/timer',
      '/test',
      '/signIn',
    ]) {
      final route = app.generateAppRoute(RouteSettings(name: routeName));
      expect(route, isA<app.InstantMaterialPageRoute<void>>());

      final pageRoute = route! as PageRoute<void>;
      expect(pageRoute.transitionDuration, Duration.zero);
      expect(pageRoute.reverseTransitionDuration, Duration.zero);
    }
  });

  testWidgets('notebook tabs navigate between mobile pages', (tester) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(
        home: MainPage(
          username: 'Nicha',
          userId: 42,
          termRepository: EmptyTermRepository(),
          tableRepository: EmptyTableRepository(),
        ),
        routes: {
          '/main': (_) => MainPage(
            username: 'Nicha',
            userId: 42,
            termRepository: EmptyTermRepository(),
            tableRepository: EmptyTableRepository(),
          ),
          '/score': (_) => ScorePage(repository: EmptyScoreRepository()),
          '/homework': (_) =>
              HomeworkPage(repository: EmptyHomeworkRepository()),
          '/timer': (_) => TimerPage(repository: EmptyTimeRepository()),
          '/test': (_) => TestPage(repository: EmptyExamRepository()),
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('notebook-tab-score')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('notebook-tab-score')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('score-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-homework')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('homework-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-timer')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('timer-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-test')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('test-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-main')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('main-tab-content')), findsOneWidget);
  });
}
