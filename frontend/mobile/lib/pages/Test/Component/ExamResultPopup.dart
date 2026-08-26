import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

Future<void> showExamResultPopup(
  BuildContext context, {
  required ExamSubmissionResult result,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (context) => AlertDialog(
      key: const Key('exam-result-popup'),
      backgroundColor: const Color(0xFFFFFEF8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFDCD6CA)),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.check_circle_outline_rounded,
            size: 56,
            color: Color(0xFF88BF69),
          ),
          const SizedBox(height: 10),
          const Text(
            'ส่งข้อสอบแล้ว',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 15),
          Text(
            '${_number(result.actualScore)}/${_number(result.maximumScore)}',
            style: const TextStyle(fontSize: 30, color: Color(0xFFE78CA8)),
          ),
          const SizedBox(height: 10),
          Text(
            'ตอบถูก ${result.correctAnswers} จาก ${result.totalQuestions} ข้อ',
            style: const TextStyle(fontSize: 12, color: Color(0xFF738790)),
          ),
        ],
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        FilledButton(
          key: const Key('close-exam-result-button'),
          onPressed: () => Navigator.of(context).pop(),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFA8D780),
            foregroundColor: Colors.white,
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 24),
          ),
          child: const Text('ดูคำแนะนำ'),
        ),
      ],
    ),
  );
}

String _number(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toStringAsFixed(1);
