import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class ExamCard extends StatelessWidget {
  final ExamSummary exam;
  final bool isLoading;
  final VoidCallback onPressed;

  const ExamCard({
    super.key,
    required this.exam,
    required this.isLoading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 2,
      shadowColor: const Color(0x306B6557),
      child: InkWell(
        key: Key('exam-card-${exam.examRepositoryId}'),
        onTap: isLoading ? null : onPressed,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 13, 12, 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE4DCD0)),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: const BoxDecoration(
                  color: Color(0xFFDDF3C8),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.quiz_outlined,
                  color: Color(0xFF759B58),
                  size: 23,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      exam.examName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF405B69),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 10,
                      runSpacing: 4,
                      children: [
                        _Meta(
                          icon: Icons.help_outline,
                          text: '${exam.totalQuestion} ข้อ',
                        ),
                        _Meta(
                          icon: Icons.timer_outlined,
                          text: '${exam.timeLimitMinutes} นาที',
                        ),
                        _Meta(
                          icon: Icons.stars_outlined,
                          text: '${_number(exam.totalScore)} คะแนน',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 7),
              isLoading
                  ? const SizedBox(
                      width: 19,
                      height: 19,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(
                      Icons.chevron_right_rounded,
                      color: Color(0xFF91A9B3),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  final IconData icon;
  final String text;

  const _Meta({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: const Color(0xFF94A7AE)),
        const SizedBox(width: 3),
        Text(
          text,
          style: const TextStyle(fontSize: 10, color: Color(0xFF71858E)),
        ),
      ],
    );
  }
}

String _number(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toStringAsFixed(1);
