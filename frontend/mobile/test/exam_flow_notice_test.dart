import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/Component/ExamFlowNotice.dart';

void main() {
  for (final phase in ['normal', 'midterm_post']) {
    testWidgets('$phase has no persistent exam preparation notice', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExamFlowNotice(
              workflow: TermWorkflow(
                phase: phase,
                initialFinalTestPending: true,
              ),
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('exam-flow-notice')), findsNothing);
    });
  }

  testWidgets('first final test notice starts in the three-week window', (
    tester,
  ) async {
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

    expect(find.text('เริ่มเตรียมสอบปลายภาค'), findsOneWidget);
    expect(find.text('ไปทำแบบทดสอบ'), findsOneWidget);
  });

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
