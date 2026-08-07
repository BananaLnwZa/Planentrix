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
    return Container(
      key: const Key('exam-progress-header'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFE4DCD0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F6B6557),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  examName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF405B69),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Container(
                key: const Key('exam-countdown'),
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: remainingTime.inMinutes < 5
                      ? const Color(0xFFFFE3E7)
                      : const Color(0xFFE4F3FA),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      '$minutes:$seconds',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: LinearProgressIndicator(
              minHeight: 7,
              value: totalQuestions == 0 ? 0 : currentQuestion / totalQuestions,
              backgroundColor: const Color(0xFFE8EEF0),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF91CEE8)),
            ),
          ),
          const SizedBox(height: 5),
          Text(
            'ข้อ $currentQuestion จาก $totalQuestions',
            style: const TextStyle(fontSize: 10, color: Color(0xFF80949D)),
          ),
        ],
      ),
    );
  }
}
