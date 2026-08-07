import 'package:flutter/material.dart';

Future<bool> showSubmitExamPopup(
  BuildContext context, {
  required int unansweredCount,
}) async {
  return await showDialog<bool>(
        context: context,
        barrierColor: Colors.black.withValues(alpha: 0.25),
        builder: (context) => AlertDialog(
          key: const Key('submit-exam-popup'),
          backgroundColor: const Color(0xFFFFFEF8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: const Text('ส่งข้อสอบ', style: TextStyle(fontSize: 19)),
          content: Text(
            unansweredCount > 0
                ? 'ยังไม่ได้ตอบ $unansweredCount ข้อ ต้องการส่งข้อสอบตอนนี้หรือไม่'
                : 'ตรวจคำตอบเรียบร้อยแล้ว ต้องการส่งข้อสอบหรือไม่',
            style: const TextStyle(fontSize: 13, color: Color(0xFF5B707A)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('กลับไปตรวจ'),
            ),
            FilledButton(
              key: const Key('confirm-submit-exam-button'),
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF29AB4),
              ),
              child: const Text('ยืนยันส่ง'),
            ),
          ],
        ),
      ) ??
      false;
}
