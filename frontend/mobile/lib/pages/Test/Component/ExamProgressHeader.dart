import 'package:flutter/material.dart';

class ExamProgressHeader extends StatelessWidget {
  final String examName;
  final int currentQuestion;
  final int totalQuestions;
  final Duration remainingTime;

  const ExamProgressHeader({
    super.key,
    required this.examName,
    required this.currentQuestion,
    required this.totalQuestions,
    required this.remainingTime,
  });

  @override
  Widget build(BuildContext context) {
    final minutes = remainingTime.inMinutes.toString().padLeft(2, '0');
    final seconds = (remainingTime.inSeconds % 60).toString().padLeft(2, '0');
    return Column(
      key: const Key('exam-progress-header'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(right: 32),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      examName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF78909B),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'ข้อ $currentQuestion/$totalQuestions',
                      style: const TextStyle(
                        fontSize: 19,
                        color: Color(0xFF405B69),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Container(
                key: const Key('exam-countdown'),
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF0BF),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      size: 15,
                      color: Color(0xFF8A6B27),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$minutes:$seconds',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF8A6B27),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(5),
          child: LinearProgressIndicator(
            minHeight: 8,
            value: totalQuestions == 0 ? 0 : currentQuestion / totalQuestions,
            backgroundColor: const Color(0xFFE6EEF1),
            valueColor: const AlwaysStoppedAnimation(Color(0xFF8CCBE8)),
          ),
        ),
      ],
    );
  }
}
