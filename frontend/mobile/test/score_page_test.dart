import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/score.interface.dart';
import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Score/Score.dart';
import 'package:mobile/services/score.service.dart';

class FakeScoreRepository implements ScoreRepository {
  final Map<int, String> savedGrades = {};
  int? savedWorkloadId;
  WorkloadScoreInput? savedScore;
  double actualGpa = 2.5;

  @override
  Future<List<SubjectScore>> getCompletedSubjectScores() async => [
    SubjectScore(
      scheduleTimeId: 11,
      subjectId: 'O410213-1',
      subjectName: 'Numerical Methods',
      credits: 3,
      teacherName: 'ชื่อ นามสกุล',
      targetScore: 4,
      targetGradeCode: 'A',
      targetMinimumPercentage: 85,
      gradingSchemeType: 'instructor_subject',
      gradeBoundaries: const [
        GradeBoundary(gradeCode: 'A', minimumPercentage: 85),
        GradeBoundary(gradeCode: 'B+', minimumPercentage: 78),
        GradeBoundary(gradeCode: 'F', minimumPercentage: 0),
      ],
      workloads: const [
        WorkloadScore(
          workloadId: 1,
          workloadName: 'เขียนโค้ดหน้า login',
          workloadTypeId: 4,
          workloadTypeCode: 'quiz',
          workloadTypeName: 'แบบทดสอบ',
          workloadStatus: 1,
          actualScore: 0,
          maxScore: 10,
        ),
        WorkloadScore(
          workloadId: 2,
          workloadName: 'เขียนรายงาน',
          workloadTypeId: 5,
          workloadTypeCode: 'project',
          workloadTypeName: 'โครงงาน',
          workloadStatus: 1,
          actualScore: 5,
          maxScore: 10,
        ),
        WorkloadScore(
          workloadId: 3,
          workloadName: 'แบบฝึกหัด 1',
          workloadTypeId: 3,
          workloadTypeCode: 'assignment',
          workloadTypeName: 'งานที่ได้รับมอบหมาย',
          workloadStatus: 1,
        ),
      ],
    ),
    const SubjectScore(
      scheduleTimeId: 12,
      subjectId: 'O410214-1',
      subjectName: 'Programming',
      credits: 3,
      teacherName: 'อาจารย์ทดสอบ',
      targetScore: 3.5,
      targetGradeCode: 'B+',
      targetMinimumPercentage: 78,
      gradingSchemeType: 'instructor_subject',
      gradeBoundaries: [
        GradeBoundary(gradeCode: 'A', minimumPercentage: 85),
        GradeBoundary(gradeCode: 'B+', minimumPercentage: 78),
        GradeBoundary(gradeCode: 'F', minimumPercentage: 0),
      ],
      workloads: [],
    ),
  ];

  @override
  Future<OverallGradeSummary> getOverallGrade() async => OverallGradeSummary(
    targetGpa: 3.75,
    actualGpa: actualGpa,
    grade: 'C+',
    percent: 65,
    maximumGpa: 4,
  );

  @override
  Future<void> saveTargetGrades(Map<int, String> goals) async {
    savedGrades.addAll(goals);
  }

  @override
  Future<void> saveWorkloadScore(
    int workloadId,
    WorkloadScoreInput input,
  ) async {
    savedWorkloadId = workloadId;
    savedScore = input;
    actualGpa = 3;
  }
}

class MissingGoalScoreRepository extends FakeScoreRepository {
  @override
  Future<List<SubjectScore>> getCompletedSubjectScores() async => const [
    SubjectScore(
      scheduleTimeId: 21,
      subjectId: 'CS101',
      subjectName: 'Programming',
      credits: 3,
      teacherName: 'Teacher One',
      targetScore: null,
      gradingSchemeType: 'instructor_subject',
      gradeBoundaries: [
        GradeBoundary(gradeCode: 'A', minimumPercentage: 85),
        GradeBoundary(gradeCode: 'B+', minimumPercentage: 78),
      ],
      workloads: [],
    ),
    SubjectScore(
      scheduleTimeId: 22,
      subjectId: 'CS102',
      subjectName: 'Data Structures',
      credits: 1,
      teacherName: 'Teacher Two',
      targetScore: null,
      gradingSchemeType: 'subject_default',
      gradeBoundaries: [
        GradeBoundary(gradeCode: 'A', minimumPercentage: 80),
        GradeBoundary(gradeCode: 'B+', minimumPercentage: 75),
      ],
      workloads: [],
    ),
  ];
}

class NoCurrentTermScoreRepository extends FakeScoreRepository {
  @override
  Future<List<SubjectScore>> getCompletedSubjectScores() async {
    throw const NoCurrentTermScoreException();
  }
}

void setPhoneSize(WidgetTester tester, Size size) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  test('grade boundaries follow the published instructor thresholds', () {
    const published = <GradeBoundary>[
      GradeBoundary(gradeCode: 'A', minimumPercentage: 85),
      GradeBoundary(gradeCode: 'B+', minimumPercentage: 78),
      GradeBoundary(gradeCode: 'B', minimumPercentage: 70),
      GradeBoundary(gradeCode: 'F', minimumPercentage: 0),
    ];
    const boundaries = <(double, String)>[
      (100, 'A'),
      (85, 'A'),
      (84.99, 'B+'),
      (78, 'B+'),
      (77.99, 'B'),
      (70, 'B'),
      (69.99, 'F'),
      (0, 'F'),
    ];

    for (final entry in boundaries) {
      expect(
        gradeFromPercent(entry.$1, published),
        entry.$2,
        reason: 'คะแนน ${entry.$1} ต้องได้เกรด ${entry.$2}',
      );
    }
  });

  test('score models show completed work and calculate a consistent grade', () {
    final subject = SubjectScore.fromJson({
      'schedule_time_id': 1,
      'subject_id': 'CS101',
      'subject_name': 'Programming',
      'credits': 3,
      'teacher_name': 'Teacher',
      'target_score': 4,
      'target_grade': 'A',
      'target_minimum_percentage': 85,
      'grading_scheme': {
        'scheme_type': 'instructor_subject',
        'boundaries': [
          {'grade_code': 'A', 'minimum_percentage': 85},
          {'grade_code': 'B+', 'minimum_percentage': 78},
          {'grade_code': 'F', 'minimum_percentage': 0},
        ],
      },
      'workloads': [
        {
          'workload_id': 1,
          'workload_name': 'Completed',
          'workload_type_id': 4,
          'workload_type_name': 'quiz',
          'workload_status': 1,
          'actual_score': 8,
          'max_score': 10,
        },
        {
          'workload_id': 2,
          'workload_name': 'Pending',
          'workload_type_id': 4,
          'workload_type_name': 'quiz',
          'workload_status': 0,
        },
      ],
    });

    expect(subject.workloads, hasLength(1));
    expect(subject.progressPercent, closeTo(8 / 85 * 100, 0.01));
    expect(subject.actualGrade, 'B+');
    expect(subject.targetGrade, 'A');
    expect(subject.pointsNeeded, 77);
  });

  test(
    'subject progress uses the target grade score and caps at 100 percent',
    () {
      const subject = SubjectScore(
        scheduleTimeId: 1,
        subjectId: 'CS101',
        subjectName: 'Programming',
        credits: 3,
        teacherName: 'Teacher',
        targetScore: 3,
        targetGradeCode: 'B',
        targetMinimumPercentage: 70,
        gradeBoundaries: [
          GradeBoundary(gradeCode: 'A', minimumPercentage: 85),
          GradeBoundary(gradeCode: 'B+', minimumPercentage: 78),
          GradeBoundary(gradeCode: 'B', minimumPercentage: 70),
          GradeBoundary(gradeCode: 'F', minimumPercentage: 0),
        ],
        workloads: [
          WorkloadScore(
            workloadId: 1,
            workloadName: 'Quiz',
            workloadTypeId: 4,
            workloadTypeName: 'quiz',
            workloadStatus: 1,
            actualScore: 80,
            maxScore: 100,
          ),
        ],
      );

      expect(subject.targetMinimumPercentage, 70);
      expect(subject.progressPercent, 100);
      expect(subject.actualGrade, 'B+');
    },
  );

  testWidgets('GPA card matches the Figma size and position', (tester) async {
    setPhoneSize(tester, const Size(360, 640));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: ScorePage(
          repository: FakeScoreRepository(),
          workflowLoader: () async =>
              const TermWorkflow(phase: 'final_2w', finalTargetReady: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('score-page')), findsOneWidget);
    expect(find.byKey(const Key('gpa-card')), findsOneWidget);
    expect(find.byKey(const Key('gpa-title')), findsOneWidget);
    expect(find.byKey(const Key('gpa-value')), findsOneWidget);
    expect(find.text('2.50'), findsOneWidget);
    expect(find.text('จากเป้าหมาย 3.75'), findsOneWidget);
    expect(find.byKey(const Key('gpa-gauge')), findsOneWidget);
    expect(find.byKey(const Key('final-score-target-card')), findsOneWidget);
    expect(
      find.textContaining('คำนวณจากคะแนนขั้นต่ำของเกรดเป้าหมาย'),
      findsNothing,
    );
    expect(find.text('ต้องได้เพิ่มอย่างน้อย 80 คะแนน'), findsOneWidget);
    expect(find.byType(CustomPaint), findsWidgets);
    final surface = tester.widget<Container>(find.byKey(const Key('gpa-card')));
    final surfaceDecoration = surface.decoration! as BoxDecoration;
    expect(surfaceDecoration.color, Colors.white);
    final cardSize = tester.getSize(find.byKey(const Key('gpa-card')));
    expect(cardSize.width, inInclusiveRange(275, 285));
    expect(cardSize.height, 190);
    expect(
      tester.getRect(find.byKey(const Key('gpa-card'))).center.dx,
      closeTo(180, 0.1),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('GPA card fits a compact mobile screen', (tester) async {
    setPhoneSize(tester, const Size(320, 568));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: ScorePage(repository: FakeScoreRepository()),
      ),
    );
    await tester.pumpAndSettle();

    final cardRect = tester.getRect(find.byKey(const Key('gpa-card')));
    expect(cardRect.left, greaterThanOrEqualTo(0));
    expect(cardRect.right, lessThanOrEqualTo(320));
    expect(cardRect.bottom, lessThanOrEqualTo(568));
    expect(tester.takeException(), isNull);
  });

  testWidgets('final score target stays hidden until the workflow is ready', (
    tester,
  ) async {
    setPhoneSize(tester, const Size(360, 640));
    await tester.pumpWidget(
      MaterialApp(
        home: ScorePage(
          repository: FakeScoreRepository(),
          workflowLoader: () async => const TermWorkflow(phase: 'final_2w'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('final-score-target-card')), findsNothing);
    expect(find.byKey(const Key('subject-score-section')), findsOneWidget);
  });

  testWidgets('locked workflow hides mobile score entry', (tester) async {
    setPhoneSize(tester, const Size(360, 640));
    await tester.pumpWidget(
      MaterialApp(
        home: ScorePage(
          repository: FakeScoreRepository(),
          workflowLoader: () async => const TermWorkflow(
            phase: 'final_1w',
            workloadLocked: true,
            finalTargetReady: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('final-score-target-card')), findsOneWidget);
    expect(find.byKey(const Key('score-entry-3')), findsNothing);
    expect(find.text('—/—'), findsWidgets);
  });

  testWidgets(
    'subject score components switch tabs and save a workload score',
    (tester) async {
      setPhoneSize(tester, const Size(360, 640));
      final repository = FakeScoreRepository();

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(fontFamily: 'Sansation'),
          home: ScorePage(
            repository: repository,
            workflowLoader: () async =>
                const TermWorkflow(phase: 'final_2w', finalTargetReady: true),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('subject-score-section')), findsOneWidget);
      expect(find.byKey(const Key('subject-tabs')), findsOneWidget);
      expect(find.byKey(const Key('subject-score-card')), findsOneWidget);
      expect(find.byKey(const Key('workload-score-table')), findsOneWidget);
      final subjectCardRect = tester.getRect(
        find.byKey(const Key('subject-score-card')),
      );
      final scoreTableRect = tester.getRect(
        find.byKey(const Key('workload-score-table')),
      );
      expect(scoreTableRect.left, greaterThanOrEqualTo(subjectCardRect.left));
      expect(scoreTableRect.right, lessThanOrEqualTo(subjectCardRect.right));
      expect(find.text('Assignment'), findsOneWidget);
      const expectedTypeColors = {
        1: Color(0xFFC5DBAA),
        2: Color(0xFFFA86A3),
        3: Color(0xFFEECDF9),
      };
      for (final entry in expectedTypeColors.entries) {
        final chip = find.byKey(Key('score-workload-type-${entry.key}'));
        final surface = find.descendant(
          of: chip,
          matching: find.byType(Container),
        );
        expect(
          (tester.widget<Container>(surface).decoration! as BoxDecoration)
              .color,
          entry.value,
        );
      }
      expect(find.text('6%'), findsOneWidget);
      expect(find.text('5/100'), findsOneWidget);
      expect(
        tester.getTopLeft(find.byKey(const Key('subject-tab-0'))).dx,
        closeTo(
          tester.getTopLeft(find.byKey(const Key('subject-score-card'))).dx,
          0.1,
        ),
      );

      await tester.ensureVisible(find.byKey(const Key('subject-tab-1')));
      await tester.tap(find.byKey(const Key('subject-tab-1')));
      await tester.pumpAndSettle();
      expect(find.text('Programming'), findsWidgets);
      expect(find.text('ยังไม่มีงานในวิชานี้'), findsOneWidget);

      await tester.ensureVisible(find.byKey(const Key('subject-tab-0')));
      await tester.tap(find.byKey(const Key('subject-tab-0')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('score-entry-3')));
      expect(find.text('—/—'), findsWidgets);
      await tester.tap(find.byKey(const Key('score-entry-3')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('score-entry-popup')), findsOneWidget);
      await tester.enterText(find.byKey(const Key('actual-score-field')), '80');
      await tester.enterText(
        find.byKey(const Key('maximum-score-field')),
        '90',
      );
      await tester.tap(find.byKey(const Key('save-score-button')));
      await tester.pumpAndSettle();
      expect(find.text('คะแนนสะสมของวิชาต้องไม่เกิน 100'), findsOneWidget);
      expect(repository.savedWorkloadId, isNull);
      expect(find.byKey(const Key('score-entry-popup')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('actual-score-field')), '8');
      await tester.enterText(
        find.byKey(const Key('maximum-score-field')),
        '10',
      );
      await tester.tap(find.byKey(const Key('save-score-button')));
      await tester.pumpAndSettle();

      expect(repository.savedWorkloadId, 3);
      expect(repository.savedScore?.actualScore, 8);
      expect(repository.savedScore?.maximumScore, 10);
      expect(find.text('8/10'), findsOneWidget);
      expect(find.text('13/100'), findsOneWidget);
      expect(find.text('15%'), findsOneWidget);
      expect(find.text('ต้องได้เพิ่มอย่างน้อย 72 คะแนน'), findsOneWidget);
      expect(find.text('3.00'), findsOneWidget);
      expect(find.text('จากเป้าหมาย 3.75'), findsOneWidget);
      expect(find.byKey(const Key('target-grade-value')), findsOneWidget);
      expect(find.byKey(const Key('target-grade-button')), findsNothing);
    },
  );

  testWidgets('requires immutable grade goals before showing subject scores', (
    tester,
  ) async {
    setPhoneSize(tester, const Size(360, 640));
    final repository = MissingGoalScoreRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: ScorePage(repository: repository),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('grade-goal-setup-prompt')), findsOneWidget);
    expect(find.byKey(const Key('subject-score-section')), findsNothing);
    expect(find.byKey(const Key('gpa-card')), findsNothing);

    await tester.ensureVisible(
      find.byKey(const Key('select-grade-goals-button')),
    );
    await tester.tap(find.byKey(const Key('select-grade-goals-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('grade-goal-setup-popup')), findsOneWidget);
    expect(find.textContaining('ไม่สามารถแก้ไขได้หลังบันทึก'), findsOneWidget);

    await tester.tap(find.byKey(const Key('save-grade-goals-button')));
    await tester.pumpAndSettle();
    expect(find.text('กรุณาเลือกเกรดเป้าหมายให้ครบทุกวิชา'), findsOneWidget);
    expect(find.byKey(const Key('grade-goal-setup-popup')), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('goal-grade-21')));
    await tester.tap(find.byKey(const Key('goal-grade-21')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('A 85+').last);
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('goal-grade-22')));
    await tester.tap(find.byKey(const Key('goal-grade-22')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('B+ 75+').last);
    await tester.pumpAndSettle();

    expect(find.text('3.88 / 4.00'), findsOneWidget);
    await tester.tap(find.byKey(const Key('save-grade-goals-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('confirm-grade-goals-popup')), findsOneWidget);
    expect(
      find.text(
        'GPA เป้าหมายของเทอมนี้คือ 3.88 เมื่อยืนยันแล้วจะไม่สามารถแก้ไขได้',
      ),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const Key('confirm-grade-goals-button')));
    await tester.pumpAndSettle();

    expect(repository.savedGrades, {21: 'A', 22: 'B+'});
    expect(find.byKey(const Key('grade-goal-setup-prompt')), findsNothing);
    expect(find.byKey(const Key('subject-score-section')), findsOneWidget);
    expect(find.byKey(const Key('gpa-card')), findsOneWidget);
    expect(find.byKey(const Key('target-grade-value')), findsOneWidget);
  });

  testWidgets('shows the web no-term state instead of a connection error', (
    tester,
  ) async {
    setPhoneSize(tester, const Size(360, 640));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Sansation'),
        home: ScorePage(repository: NoCurrentTermScoreRepository()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('score-no-term')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('score-no-term'))),
      const Size(280, 250),
    );
    expect(find.text('ยังไม่มีเทอมปัจจุบัน'), findsOneWidget);
    expect(
      find.text('กรุณาสร้างเทอมและตารางเรียนก่อนตั้งเป้าหมายเกรด'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('subject-score-error')), findsNothing);
    expect(find.byKey(const Key('gpa-card')), findsNothing);
  });
}
