import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import 'ExamChoiceButton.dart';

class ExamQuestionCard extends StatelessWidget {
  final ExamQuestion question;
  final int? selectedChoiceId;
  final bool showAnswerWarning;
  final ValueChanged<int> onChoiceSelected;

  const ExamQuestionCard({
    super.key,
    required this.question,
    required this.selectedChoiceId,
    this.showAnswerWarning = false,
    required this.onChoiceSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      key: Key('exam-question-${question.questionId}'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFEFA),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE4DCD0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  question.partName,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF8A9DA5),
                  ),
                ),
              ),
              Text(
                '${question.score} คะแนน',
                style: const TextStyle(fontSize: 10, color: Color(0xFF8A9DA5)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            question.text,
            style: const TextStyle(
              fontSize: 15,
              height: 1.4,
              color: Color(0xFF344E5A),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 17),
          for (var index = 0; index < question.choices.length; index++) ...[
            ExamChoiceButton(
              choice: question.choices[index],
              selected: selectedChoiceId == question.choices[index].choiceId,
              onPressed: () =>
                  onChoiceSelected(question.choices[index].choiceId),
            ),
            if (index < question.choices.length - 1) const SizedBox(height: 9),
          ],
          if (showAnswerWarning) ...[
            const SizedBox(height: 11),
            const Text(
              'กรุณาเลือกคำตอบก่อนดำเนินการต่อ',
              key: Key('answer-required-warning'),
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFFD94F64),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
