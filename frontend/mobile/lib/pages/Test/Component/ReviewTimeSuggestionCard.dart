import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class ReviewTimeSuggestionCard extends StatelessWidget {
  final List<ExamCheckpointInsight> checkpoints;

  const ReviewTimeSuggestionCard({super.key, required this.checkpoints});

  @override
  Widget build(BuildContext context) {
    final suggestions = checkpoints
        .where((checkpoint) => checkpoint.reviewMinutesDelta != 0)
        .toList();
    if (suggestions.isEmpty) return const SizedBox.shrink();
    return Container(
      key: const Key('review-time-suggestion-card'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFE9F5DD),
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFCFE4BA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.schedule_rounded, size: 18, color: Color(0xFF66894E)),
              SizedBox(width: 7),
              Expanded(
                child: Text(
                  'คำแนะนำเวลาทบทวน',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF5D794A),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (final suggestion in suggestions)
            Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Text(
                '${suggestion.subjectName}: ${_deltaText(suggestion.reviewMinutesDelta)} '
                '(เชื่อมกับตารางทบทวน)',
                style: const TextStyle(fontSize: 11, color: Color(0xFF617154)),
              ),
            ),
        ],
      ),
    );
  }
}

String _deltaText(int minutes) {
  if (minutes > 0) return 'เพิ่ม $minutes นาที/สัปดาห์';
  return 'ลด ${minutes.abs()} นาที/สัปดาห์';
}
