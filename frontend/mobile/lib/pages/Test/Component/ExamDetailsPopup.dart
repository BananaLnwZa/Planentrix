import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

Future<bool> showExamDetailsPopup(
  BuildContext context, {
  required ExamDetail exam,
}) async {
  return await showDialog<bool>(
        context: context,
        barrierColor: Colors.black.withValues(alpha: 0.25),
        builder: (_) => _ExamDetailsPopup(exam: exam),
      ) ??
      false;
}

class _ExamDetailsPopup extends StatelessWidget {
  final ExamDetail exam;

  const _ExamDetailsPopup({required this.exam});

  @override
  Widget build(BuildContext context) {
    final summary = exam.summary;
    return AlertDialog(
      key: const Key('exam-details-popup'),
      backgroundColor: const Color(0xFFFFFEF8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFDCD6CA)),
      ),
      title: Text(summary.examName, style: const TextStyle(fontSize: 19)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            summary.subjectName,
            style: const TextStyle(color: Color(0xFF6E8792)),
          ),
          const SizedBox(height: 15),
          _Detail(
            icon: Icons.help_outline,
            text: '${exam.questions.length} ข้อ',
          ),
          _Detail(
            icon: Icons.timer_outlined,
            text: '${summary.timeLimitMinutes} นาที',
          ),
          _Detail(
            icon: Icons.stars_outlined,
            text: '${summary.totalScore} คะแนน',
          ),
          if (exam.questions.isEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'ชุดข้อสอบนี้ยังไม่มีคำถาม',
              style: TextStyle(color: Color(0xFFC06A7D), fontSize: 12),
            ),
          ],
        ],
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('ยกเลิก'),
        ),
        FilledButton.icon(
          key: const Key('start-exam-button'),
          onPressed: exam.questions.isEmpty
              ? null
              : () => Navigator.of(context).pop(true),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFA8D780),
            foregroundColor: Colors.white,
          ),
          icon: const Icon(Icons.play_arrow_rounded, size: 18),
          label: const Text('เริ่มทำ'),
        ),
      ],
    );
  }
}

class _Detail extends StatelessWidget {
  final IconData icon;
  final String text;

  const _Detail({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        children: [
          Icon(icon, size: 17, color: const Color(0xFF7EB4CC)),
          const SizedBox(width: 8),
          Text(
            text,
            style: const TextStyle(fontSize: 13, color: Color(0xFF516874)),
          ),
        ],
      ),
    );
  }
}
