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
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: OutlinedButton(
            key: const Key('previous-question-button'),
            onPressed: canGoBack && !isSubmitting ? onBack : null,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF607781),
              side: const BorderSide(color: Color(0xFFB8C7CD)),
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: const FittedBox(child: Text('ก่อนหน้า')),
          ),
        ),
        const SizedBox(width: 10),
        if (isLastQuestion)
          Expanded(
            child: FilledButton.icon(
              key: const Key('submit-exam-button'),
              onPressed: isSubmitting ? null : onSubmit,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF29AB4),
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
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
              label: const FittedBox(child: Text('ส่งข้อสอบ')),
            ),
          )
        else
          Expanded(
            child: FilledButton(
              key: const Key('next-question-button'),
              onPressed: isSubmitting ? null : onNext,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF8CCBE8),
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: const FittedBox(child: Text('ข้อต่อไป')),
            ),
          ),
      ],
    );
  }
}
