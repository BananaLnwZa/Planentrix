import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import 'AuthenticatedExamImage.dart';
import 'ExamChoiceButton.dart';

String _questionScoreText(double value) {
  if (value == value.roundToDouble()) return value.toInt().toString();
  return value
      .toStringAsFixed(2)
      .replaceFirst(RegExp(r'0+$'), '')
      .replaceFirst(RegExp(r'\.$'), '');
}

class ExamQuestionCard extends StatelessWidget {
  final ExamQuestion question;
  final int? selectedChoiceId;
  final bool showAnswerWarning;
  final String? errorMessage;
  final ValueChanged<int> onChoiceSelected;

  const ExamQuestionCard({
    super.key,
    required this.question,
    required this.selectedChoiceId,
    this.showAnswerWarning = false,
    this.errorMessage,
    required this.onChoiceSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      key: Key('exam-question-${question.questionId}'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCE4E7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  question.partName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF92A1A7),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                key: Key('question-score-${question.questionId}'),
                padding: const EdgeInsets.symmetric(
                  horizontal: 11,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF0BF),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${_questionScoreText(question.score)} คะแนน',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF8A6B27),
                    fontWeight: FontWeight.w600,
                  ),
                ),
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
          if (question.imageUrl != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AuthenticatedExamImage(
                imageUrl: question.imageUrl!,
                height: 190,
                errorText: 'ไม่สามารถแสดงรูปคำถามได้',
              ),
            ),
          ],
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
              'กรุณาเลือกคำตอบก่อนกดไปข้อถัดไป',
              key: Key('answer-required-warning'),
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFFD94F64),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
          if (errorMessage != null) ...[
            const SizedBox(height: 11),
            Text(
              errorMessage!,
              key: const Key('exam-submit-error'),
              style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444)),
            ),
          ],
        ],
      ),
    );
  }
}
