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
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFFE1D5C9)),
          ),
          title: const Center(
            child: Text(
              'ส่งข้อสอบ',
              style: TextStyle(
                fontSize: 20,
                color: Color(0xFF405B69),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          content: Text(
            unansweredCount > 0
                ? 'ยังไม่ได้ตอบ $unansweredCount ข้อ ต้องการส่งข้อสอบตอนนี้หรือไม่'
                : 'ตรวจคำตอบเรียบร้อยแล้ว ต้องการส่งข้อสอบหรือไม่',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.5,
              color: Color(0xFF738892),
            ),
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(false),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF607781),
                side: const BorderSide(color: Color(0xFFB8C7CD)),
                shape: const StadiumBorder(),
              ),
              child: const Text('ตรวจอีกครั้ง'),
            ),
            FilledButton(
              key: const Key('confirm-submit-exam-button'),
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF29AB4),
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
              ),
              child: const Text('ยืนยันส่ง'),
            ),
          ],
        ),
      ) ??
      false;
}
