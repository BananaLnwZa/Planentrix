// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../timer_utils.dart';

Future<bool> showFinishSessionPopup(
  BuildContext context, {
  required int elapsedSeconds,
  required String subjectName,
}) async {
  return await showDialog<bool>(
        context: context,
        barrierColor: const Color(0x594C3E43),
        builder: (context) => Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 24),
          backgroundColor: Colors.transparent,
          child: Container(
            key: const Key('finish-session-popup'),
            constraints: const BoxConstraints(maxWidth: 390),
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFDFA),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFEADBD7)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x4752353E),
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
                    color: Color(0xFFE4F3E9),
                    shape: BoxShape.circle,
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(11),
                    child: Icon(
                      Icons.check_circle_outline_rounded,
                      color: Color(0xFF5EAA7D),
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'ทบทวนเสร็จแล้วใช่ไหม?',
                  style: TextStyle(
                    fontSize: 17,
                    color: Color(0xFF55484D),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(
                    children: [
                      const TextSpan(text: 'ระบบจะบันทึกเวลา '),
                      TextSpan(
                        text: formatClock(elapsedSeconds),
                        style: const TextStyle(
                          color: Color(0xFF5C8FAC),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const TextSpan(text: '\nให้กับวิชา '),
                      TextSpan(
                        text: subjectName,
                        style: const TextStyle(
                          color: Color(0xFF65555B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.55,
                    color: Color(0xFF8D7D83),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        key: const Key('finish-session-cancel'),
                        onPressed: () => Navigator.pop(context, false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF7E6E74),
                          side: const BorderSide(color: Color(0xFFDED2D3)),
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        child: const FittedBox(child: Text('ยังไม่เสร็จ')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        key: const Key('finish-session-confirm'),
                        onPressed: () => Navigator.pop(context, true),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF8FC8AA),
                          foregroundColor: Colors.white,
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        child: const FittedBox(child: Text('บันทึกเวลา')),
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
