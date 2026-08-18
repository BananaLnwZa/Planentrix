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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.celebration_rounded,
            size: 42,
            color: Color(0xFFF0A0BA),
          ),
          const SizedBox(height: 10),
          const Text(
            'ส่งข้อสอบแล้ว',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 15),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFE4F3FA),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Text(
              '${_number(result.actualScore)}/${_number(result.maximumScore)}',
              style: const TextStyle(
                fontSize: 25,
                color: Color(0xFF5289A2),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'ตอบถูก ${result.correctAnswers} จาก ${result.totalQuestions} ข้อ',
            style: const TextStyle(fontSize: 12, color: Color(0xFF738790)),
          ),
          if (result.checkpointIntervalWeeks > 0) ...[
            const SizedBox(height: 9),
            Text(
              'Checkpoint ถัดไปอีก ${result.checkpointIntervalWeeks} สัปดาห์',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, color: Color(0xFF8A6E2E)),
            ),
          ],
          if (result.weakTopicCount > 0) ...[
            const SizedBox(height: 4),
            Text(
              'พบเรื่องที่ควรทบทวน ${result.weakTopicCount} เรื่อง',
              style: const TextStyle(fontSize: 11, color: Color(0xFFB05D79)),
            ),
          ],
        ],
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        FilledButton(
          key: const Key('close-exam-result-button'),
          onPressed: () => Navigator.of(context).pop(),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFA8D780),
          ),
          child: const Text('เสร็จสิ้น'),
        ),
      ],
    ),
  );
}

String _number(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toStringAsFixed(1);
