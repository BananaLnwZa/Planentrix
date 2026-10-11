import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/Component/ExamFlowNotice.dart';

void main() {
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
}
