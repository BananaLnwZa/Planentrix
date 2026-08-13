import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/exam.interface.dart';
import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Test/Test.dart';
import 'package:mobile/services/exam.service.dart';
import 'package:mobile/services/term.service.dart';

class FakeExamRepository implements ExamRepository {
  int? submittedExamId;
  List<ExamAnswer>? submittedAnswers;
  bool submitted = false;

  final exams = const [
    ExamSummary(
      examRepositoryId: 1,
      scheduleTimeId: 11,
      subjectId: 'CS101',
      subjectName: 'Numerical Method',
      examName: 'แบบทดสอบบทที่ 1',
      totalScore: 100,
      totalQuestion: 2,
      timeLimitMinutes: 30,
    ),
    ExamSummary(
      examRepositoryId: 2,
      scheduleTimeId: 12,
      subjectId: 'CS102',
      subjectName: 'Programming',
      examName: 'Basic Programming',
      totalScore: 5,
      totalQuestion: 1,
      timeLimitMinutes: 15,
    ),
  ];

  @override
  Future<List<ExamSummary>> getExams() async => submitted
      ? exams.where((exam) => exam.examRepositoryId != 1).toList()
      : exams;

  @override
  Future<ExamDetail> getExamDetail(int examRepositoryId) async {
    final summary = exams.firstWhere(
      (exam) => exam.examRepositoryId == examRepositoryId,
    );
    return ExamDetail(
      summary: summary,
      questions: const [
        ExamQuestion(
          questionId: 101,
          order: 1,
          text: '2 + 2 เท่ากับเท่าไร',
          score: 50,
          partName: 'ปรนัย',
          choices: [
            ExamChoice(choiceId: 1001, order: 1, text: '3'),
            ExamChoice(choiceId: 1002, order: 2, text: '4'),
          ],
        ),
        ExamQuestion(
          questionId: 102,
          order: 2,
          text: '3 + 3 เท่ากับเท่าไร',
          score: 50,
          partName: 'ปรนัย',
          choices: [
            ExamChoice(choiceId: 1003, order: 1, text: '6'),
            ExamChoice(choiceId: 1004, order: 2, text: '7'),
          ],
        ),
      ],
    );
  }

  @override
  Future<List<ExamHistoryItem>> getHistory() async => [
    const ExamHistoryItem(
      historyId: 90,
      examRepositoryId: 1,
      subjectId: 'CS101',
      examName: 'แบบทดสอบเก่า',
      subjectName: 'Numerical Method',
      actualScore: 70,
      maximumScore: 100,
      examDate: null,
      weakTopics: [
        ExamHistoryWeakTopic(topicName: 'Data Warehouse', percentage: 65),
        ExamHistoryWeakTopic(topicName: 'ETL', percentage: 30),
      ],
    ),
    const ExamHistoryItem(
      historyId: 89,
      examRepositoryId: 2,
      subjectId: 'CS102',
      examName: 'Programming Checkpoint',
      subjectName: 'Programming',
      actualScore: 4,
      maximumScore: 5,
      examDate: null,
    ),
    if (submitted)
      const ExamHistoryItem(
        historyId: 91,
        examRepositoryId: 1,
        subjectId: 'CS101',
        examName: 'แบบทดสอบบทที่ 1',
        subjectName: 'Numerical Method',
        actualScore: 100,
        maximumScore: 100,
        examDate: null,
        weakTopics: [
          ExamHistoryWeakTopic(topicName: 'สมการเชิงเส้น', percentage: 40),
        ],
      ),
  ];

  @override
  Future<ExamInsights> getInsights() async {
    if (!submitted) return const ExamInsights();
    return ExamInsights(
      weakTopics: const [
        WeakTopicInsight(
          scheduleTimeId: 11,
          examRepositoryId: 1,
          examPartId: 501,
          topicName: 'สมการเชิงเส้น',
          subjectId: 'CS101',
          subjectName: 'Numerical Method',
          examName: 'แบบทดสอบบทที่ 1',
          actualScore: 20,
          maximumScore: 50,
          percentage: 40,
          studyTypeId: 2,
          studyTypeName: 'Practice',
        ),
      ],
      nextCheckpoints: [
        ExamCheckpointInsight(
          scheduleTimeId: 11,
          examRepositoryId: 1,
          examName: 'แบบทดสอบบทที่ 1',
          subjectId: 'CS101',
          subjectName: 'Numerical Method',
          nextCheckpointAt: DateTime.now().add(const Duration(days: 7)),
          intervalWeeks: 1,
          weakTopicCount: 1,
          reviewMinutesDelta: 20,
          reviewScheduleTypeId: 2,
        ),
      ],
    );
  }

  @override
  Future<ExamSubmissionResult> submitExam(
    int examRepositoryId,
    List<ExamAnswer> answers,
  ) async {
    submittedExamId = examRepositoryId;
    submittedAnswers = answers;
    submitted = true;
    return const ExamSubmissionResult(
      historyId: 91,
      actualScore: 100,
      maximumScore: 100,
      correctAnswers: 2,
      totalQuestions: 2,
      checkpointIntervalWeeks: 1,
      weakTopicCount: 1,
      reviewMinutesDelta: 20,
    );
  }
}

class NoCurrentTermRepository implements TermRepository {
  @override
  Future<CurrentTerm?> getCurrentTerm() async => null;

  @override
  Future<CurrentTerm> createTerm(CreateTermRequest request) async =>
      throw UnimplementedError();

  @override
  Future<void> endCurrentTerm() async => throw UnimplementedError();
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
  testWidgets('test page uses the shared no-term state', (tester) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(
        home: TestPage(
          repository: FakeExamRepository(),
          termRepository: NoCurrentTermRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('test-no-term')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('test-no-term'))),
      const Size(280, 250),
    );
    expect(find.text('ยังไม่มีเทอมปัจจุบัน'), findsOneWidget);
    expect(
      find.text('กรุณาสร้างเทอมและตารางเรียนก่อนทำแบบทดสอบ'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('test-error')), findsNothing);
    expect(find.byKey(const Key('test-home-content')), findsNothing);
  });

  testWidgets('test page shows subjects, exams, and score history', (
    tester,
  ) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(home: TestPage(repository: FakeExamRepository())),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('test-page')), findsOneWidget);
    expect(find.byKey(const Key('test-subject-tabs')), findsOneWidget);
    expect(find.byKey(const Key('exam-card-1')), findsOneWidget);
    expect(find.byKey(const Key('exam-card-2')), findsNothing);
    expect(find.byKey(const Key('exam-history-section')), findsOneWidget);
    expect(find.byKey(const Key('exam-history-subject-tabs')), findsOneWidget);
    expect(find.byKey(const Key('exam-history-90')), findsOneWidget);
    expect(find.byKey(const Key('exam-history-89')), findsNothing);
    expect(find.text('รอบ'), findsOneWidget);
    expect(find.text('คะแนน'), findsOneWidget);
    expect(find.text('เรื่องที่อ่อน'), findsOneWidget);
    expect(find.text('1'), findsOneWidget);
    expect(find.text('ETL'), findsOneWidget);
    expect(find.text('Data Warehouse'), findsNothing);
    expect(find.text('70/100'), findsOneWidget);

    await tester.tap(find.byKey(const Key('exam-history-subject-tab-CS102')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('exam-history-90')), findsNothing);
    expect(find.byKey(const Key('exam-history-89')), findsOneWidget);
    expect(find.text('4/5'), findsOneWidget);

    await tester.drag(
      find.byKey(const Key('test-subject-tabs')),
      const Offset(-150, 0),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('test-subject-tab-CS102')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('exam-card-1')), findsNothing);
    expect(find.byKey(const Key('exam-card-2')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('user can complete and submit an exam', (tester) async {
    setPhoneSize(tester);
    final repository = FakeExamRepository();
    await tester.pumpWidget(
      MaterialApp(home: TestPage(repository: repository)),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull, reason: 'initial exam list');

    await tester.tap(find.byKey(const Key('exam-card-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('exam-details-popup')), findsOneWidget);
    expect(tester.takeException(), isNull, reason: 'exam details popup');
    await tester.tap(find.byKey(const Key('start-exam-button')));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byKey(const Key('exam-runner')), findsOneWidget);
    expect(find.byKey(const Key('exam-question-101')), findsOneWidget);
    expect(tester.takeException(), isNull, reason: 'first exam question');

    await tester.tap(find.byKey(const Key('next-question-button')));
    await tester.pump();
    expect(find.byKey(const Key('answer-required-warning')), findsOneWidget);
    final warningText = tester.widget<Text>(
      find.byKey(const Key('answer-required-warning')),
    );
    expect(warningText.style?.color, const Color(0xFFD94F64));
    expect(
      tester.getTopLeft(find.byKey(const Key('answer-required-warning'))).dy,
      greaterThan(
        tester.getBottomLeft(find.byKey(const Key('exam-choice-1002'))).dy,
      ),
    );
    expect(find.byKey(const Key('exam-question-101')), findsOneWidget);
    expect(find.byKey(const Key('exam-question-102')), findsNothing);

    await tester.tap(find.byKey(const Key('exam-choice-1002')));
    await tester.pump();
    expect(find.byKey(const Key('answer-required-warning')), findsNothing);
    await tester.tap(find.byKey(const Key('next-question-button')));
    await tester.pump();
    expect(find.byKey(const Key('exam-question-102')), findsOneWidget);
    expect(tester.takeException(), isNull, reason: 'second exam question');

    await tester.tap(find.byKey(const Key('submit-exam-button')));
    await tester.pump();
    expect(find.byKey(const Key('answer-required-warning')), findsOneWidget);
    expect(find.byKey(const Key('submit-exam-popup')), findsNothing);
    expect(find.byKey(const Key('exam-question-102')), findsOneWidget);

    await tester.tap(find.byKey(const Key('exam-choice-1003')));
    await tester.tap(find.byKey(const Key('submit-exam-button')));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('submit-exam-popup')), findsOneWidget);
    expect(tester.takeException(), isNull, reason: 'submit popup');
    await tester.tap(find.byKey(const Key('confirm-submit-exam-button')));
    await tester.pumpAndSettle();

    expect(repository.submittedExamId, 1);
    expect(repository.submittedAnswers?.map((answer) => answer.choiceId), [
      1002,
      1003,
    ]);
    expect(find.byKey(const Key('exam-result-popup')), findsOneWidget);
    expect(find.text('100/100'), findsOneWidget);
    expect(tester.takeException(), isNull, reason: 'result popup');
    await tester.tap(find.byKey(const Key('close-exam-result-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('exam-runner')), findsNothing);
    expect(find.byKey(const Key('exam-history-91')), findsOneWidget);
    expect(find.byKey(const Key('exam-card-1')), findsNothing);
    expect(
      find.byKey(const Key('subject-review-feedback-CS101')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('weak-topic-section')), findsOneWidget);
    expect(find.byKey(const Key('review-method-section')), findsOneWidget);
    expect(find.byKey(const Key('checkpoint-section')), findsOneWidget);
    expect(find.text('ทำโจทย์/ฝึกปฏิบัติ'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('test page fits a compact phone', (tester) async {
    setPhoneSize(tester, const Size(320, 568));
    await tester.pumpWidget(
      MaterialApp(home: TestPage(repository: FakeExamRepository())),
    );
    await tester.pumpAndSettle();

    final paper = tester.getRect(find.byKey(const Key('notebook-paper-test')));
    expect(paper.left, greaterThanOrEqualTo(0));
    expect(paper.right, lessThanOrEqualTo(320));
    expect(tester.takeException(), isNull);
  });
}
