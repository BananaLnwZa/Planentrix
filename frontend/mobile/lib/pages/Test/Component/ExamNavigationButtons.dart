import 'package:flutter/material.dart';

class ExamNavigationButtons extends StatelessWidget {
  final bool canGoBack;
  final bool isLastQuestion;
  final bool isSubmitting;
  final VoidCallback onBack;
  final VoidCallback onNext;
  final VoidCallback onSubmit;

  const ExamNavigationButtons({
    super.key,
    required this.canGoBack,
    required this.isLastQuestion,
    required this.isSubmitting,
    required this.onBack,
    required this.onNext,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            key: const Key('previous-question-button'),
            onPressed: canGoBack && !isSubmitting ? onBack : null,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            icon: const Icon(Icons.chevron_left_rounded, size: 18),
            label: const FittedBox(
              fit: BoxFit.scaleDown,
              child: Text('ก่อนหน้า'),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: isLastQuestion
              ? FilledButton.icon(
                  key: const Key('submit-exam-button'),
                  onPressed: isSubmitting ? null : onSubmit,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF29AB4),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  icon: isSubmitting
                      ? const SizedBox(
                          width: 15,
                          height: 15,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check_rounded, size: 18),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text('ส่งข้อสอบ'),
                  ),
                )
              : FilledButton.icon(
                  key: const Key('next-question-button'),
                  onPressed: isSubmitting ? null : onNext,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF8CCBE8),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  iconAlignment: IconAlignment.end,
                  icon: const Icon(Icons.chevron_right_rounded, size: 18),
                  label: const Text('ถัดไป'),
                ),
        ),
      ],
    );
  }
}
