import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/Component/ExamFlowNotice.dart';

void main() {
  for (final workflow in [
    const TermWorkflow(phase: 'normal', initialFinalTestPending: true),
    const TermWorkflow(phase: 'midterm_post'),
  ]) {
    testWidgets(
      '${workflow.phase} without a pending initial test has no notice',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: ExamFlowNotice(workflow: workflow)),
          ),
        );

        expect(find.byKey(const Key('exam-flow-notice')), findsNothing);
      },
    );
  }

  testWidgets(
    'post-midterm notice links to the first final test while pending',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: const Scaffold(
            body: ExamFlowNotice(
              workflow: TermWorkflow(
                phase: 'midterm_post',
                initialFinalTestPending: true,
              ),
            ),
          ),
          routes: {'/test': (_) => const Scaffold(body: Text('Test page'))},
        ),
      );

      expect(find.text('เริ่มแบบทดสอบปลายภาค'), findsOneWidget);
      expect(find.textContaining('checkpoint รอบใหม่'), findsOneWidget);
      await tester.tap(find.text('ไปทำแบบทดสอบ'));
      await tester.pumpAndSettle();
      expect(find.text('Test page'), findsOneWidget);
    },
  );

  testWidgets(
    'final three-week notice stays a workload reminder even when the initial test is pending',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ExamFlowNotice(
              workflow: TermWorkflow(
                phase: 'final_3w',
                initialFinalTestPending: true,
              ),
            ),
          ),
        ),
      );

      expect(find.text('เตรียมสอบปลายภาค · 3 สัปดาห์'), findsOneWidget);
      expect(find.textContaining('กรอกภาระงานและคะแนนเก็บ'), findsOneWidget);
      expect(find.text('ตรวจภาระงาน'), findsOneWidget);
      expect(find.text('ไปทำแบบทดสอบ'), findsNothing);
    },
  );

  testWidgets('final three-week notice reminds users without offering a test', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ExamFlowNotice(workflow: TermWorkflow(phase: 'final_3w')),
        ),
      ),
    );

    expect(find.text('เตรียมสอบปลายภาค · 3 สัปดาห์'), findsOneWidget);
    expect(find.textContaining('กรอกภาระงานและคะแนนเก็บ'), findsOneWidget);
    expect(find.text('ตรวจภาระงาน'), findsOneWidget);
    expect(find.text('ไปทำแบบทดสอบ'), findsNothing);
  });

  testWidgets('final two-week notice reminds users while tests remain', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ExamFlowNotice(workflow: TermWorkflow(phase: 'final_2w')),
        ),
      ),
    );

    expect(find.textContaining('กรอกภาระงานและคะแนนเก็บ'), findsOneWidget);
    expect(find.text('ไปทำแบบทดสอบ'), findsOneWidget);
  });

  testWidgets('final two-week notice opens homework after all tests', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const Scaffold(
          body: ExamFlowNotice(
            workflow: TermWorkflow(phase: 'final_2w', assessmentPending: false),
          ),
        ),
        routes: {
          '/homework': (_) => const Scaffold(body: Text('Homework page')),
        },
      ),
    );

    expect(find.textContaining('กรอกภาระงานและคะแนนเก็บ'), findsOneWidget);
    expect(find.text('ไปทำแบบทดสอบ'), findsNothing);
    await tester.tap(find.text('ไปหน้าภาระงาน'));
    await tester.pumpAndSettle();
    expect(find.text('Homework page'), findsOneWidget);
  });

  testWidgets('completed midterm two-week tests hide the notice', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ExamFlowNotice(
            workflow: TermWorkflow(
              phase: 'midterm_2w',
              assessmentPending: false,
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('exam-flow-notice')), findsNothing);
    expect(find.byType(TextButton), findsNothing);
  });

  for (final phase in ['midterm_1w', 'final_1w']) {
    testWidgets('$phase hides notice once all assessments are done', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExamFlowNotice(
              workflow: TermWorkflow(phase: phase, assessmentPending: false),
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('exam-flow-notice')), findsNothing);
    });
  }

  testWidgets('returning from test refreshes the workflow notice', (
    tester,
  ) async {
    var refreshes = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamFlowNotice(
            workflow: const TermWorkflow(phase: 'final_1w'),
            onReturn: () async {
              refreshes++;
            },
          ),
        ),
        routes: {
          '/test': (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('กลับ'),
            ),
          ),
        },
      ),
    );

    await tester.tap(find.text('ไปทำแบบทดสอบ'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('กลับ'));
    await tester.pumpAndSettle();
    expect(refreshes, 1);
  });

  testWidgets('midterm three-week notice has no action button', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ExamFlowNotice(workflow: TermWorkflow(phase: 'midterm_3w')),
        ),
      ),
    );

    expect(find.text('เตรียมสอบกลางภาค · 3 สัปดาห์'), findsOneWidget);
    expect(find.byType(TextButton), findsNothing);
  });

  for (final period in ['midterm', 'final']) {
    for (final week in ['2w', '1w']) {
      testWidgets('$period $week offers the measuring test', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ExamFlowNotice(
                workflow: TermWorkflow(phase: '${period}_$week'),
              ),
            ),
          ),
        );

        expect(find.text('ไปทำแบบทดสอบ'), findsOneWidget);
        expect(find.byType(TextButton), findsOneWidget);
      });
    }

    testWidgets('$period exam week has no test action', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExamFlowNotice(
              workflow: TermWorkflow(phase: '${period}_exam'),
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('exam-flow-notice')), findsNothing);
      expect(find.textContaining('สัปดาห์สอบ'), findsNothing);
      expect(find.byType(TextButton), findsNothing);
    });
  }
}
