import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import 'ExamCard.dart';

class ExamList extends StatelessWidget {
  final List<ExamSummary> exams;
  final int? loadingExamId;
  final ValueChanged<ExamSummary> onSelected;

  const ExamList({
    super.key,
    required this.exams,
    required this.loadingExamId,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    if (exams.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 28),
        child: Center(
          child: Text(
            'ยังไม่มีชุดข้อสอบในวิชานี้',
            style: TextStyle(fontSize: 13, color: Color(0xFF8AA0AA)),
          ),
        ),
      );
    }
    return Column(
      key: const Key('exam-list'),
      children: [
        for (var index = 0; index < exams.length; index++) ...[
          ExamCard(
            exam: exams[index],
            isLoading: loadingExamId == exams[index].examRepositoryId,
            onPressed: () => onSelected(exams[index]),
          ),
          if (index < exams.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}
