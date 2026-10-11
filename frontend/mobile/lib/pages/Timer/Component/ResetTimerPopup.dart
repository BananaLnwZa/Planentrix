// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../timer_utils.dart';

Future<bool> showResetTimerPopup(
  BuildContext context, {
  required int elapsedSeconds,
}) async {
  return await showDialog<bool>(
        context: context,
        barrierColor: const Color(0x6624343A),
        builder: (context) => Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 24),
          backgroundColor: Colors.transparent,
          child: Container(
            key: const Key('reset-timer-popup'),
            constraints: const BoxConstraints(maxWidth: 390),
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFEFA),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFD9E7EC)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x4724353E),
                  blurRadius: 35,
                  offset: Offset(0, 16),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const DecoratedBox(
                  decoration: BoxDecoration(
                    color: Color(0xFFFFF0D7),
                    shape: BoxShape.circle,
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: Icon(
                      Icons.restart_alt_rounded,
                      color: Color(0xFFC68C3E),
                      size: 25,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'รีเซ็ตเวลารอบนี้?',
                  style: TextStyle(
                    color: Color(0xFF4E6570),
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(
                    children: [
                      const TextSpan(text: 'เวลาที่จับไว้ '),
                      TextSpan(
                        text: formatClock(elapsedSeconds),
                        style: const TextStyle(
                          color: Color(0xFF5C8FAC),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const TextSpan(
                        text:
                            ' จะไม่ถูกบันทึกในสถิติและประวัติ แต่ประวัติรอบก่อนหน้าจะยังอยู่',
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF819198),
                    fontSize: 12,
                    height: 1.55,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        key: const Key('reset-timer-cancel'),
                        onPressed: () => Navigator.pop(context, false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF6D818A),
                          side: const BorderSide(color: Color(0xFFCAD7DC)),
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        child: const Text('ยกเลิก'),
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: FilledButton(
                        key: const Key('reset-timer-confirm'),
                        onPressed: () => Navigator.pop(context, true),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFF0B4BD),
                          foregroundColor: Colors.white,
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        child: const Text('รีเซ็ตเวลา'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ) ??
      false;
}
