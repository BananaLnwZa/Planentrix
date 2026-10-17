import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/exam.interface.dart';
import 'package:mobile/pages/Test/Component/ExamChoiceButton.dart';

void main() {
  test('correct-answer flag is read from an exam choice', () {
    final correct = ExamChoice.fromJson({
      'choice_id': 1,
      'choice_order': 1,
      'choice_text': 'ถูก',
      'is_correct': true,
    });
    final incorrect = ExamChoice.fromJson({
      'choice_id': 2,
      'choice_order': 2,
      'choice_text': 'ผิด',
      'is_correct': false,
    });
    expect(correct.isCorrect, isTrue);
    expect(incorrect.isCorrect, isFalse);
  });

  testWidgets('answer marker stays hidden while answer display is disabled', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              ExamChoiceButton(
                choice: const ExamChoice(
                  choiceId: 1,
                  order: 1,
                  text: 'ถูก',
                  isCorrect: true,
                ),
                selected: false,
                onPressed: () {},
              ),
              ExamChoiceButton(
                choice: const ExamChoice(choiceId: 2, order: 2, text: 'ผิด'),
                selected: false,
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('correct-answer-badge')), findsNothing);
    expect(find.text('เฉลย'), findsNothing);
  });
}
