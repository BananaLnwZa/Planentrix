// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../interfaces/time.interface.dart';
import '../timer_utils.dart';

Future<String> showSessionRecoveryPopup(
  BuildContext context, {
  required StudySession session,
}) async {
  final interrupted = session.sessionStatus == 'interrupted';
  return await showDialog<String>(
        context: context,
        barrierDismissible: false,
        barrierColor: const Color(0x594C3E43),
        builder: (context) => Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 22),
          backgroundColor: Colors.transparent,
          child: Container(
            key: const Key('session-recovery-popup'),
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 16),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFDFA),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFEADBD7)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x4D52353E),
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
                    color: Color(0xFFFFF0D8),
                    shape: BoxShape.circle,
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(11),
                    child: Icon(
                      Icons.warning_amber_rounded,
                      color: Color(0xFFC0822D),
                      size: 29,
                    ),
                  ),
                ),
                const SizedBox(height: 11),
                Text(
                  interrupted
                      ? 'รายการนี้ครบเวลาสูงสุดแล้ว'
                      : 'พบรายการจับเวลาที่ขาดการเชื่อมต่อ',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(0xFF55484D),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(
                    children: [
                      const TextSpan(text: 'วิชา '),
                      TextSpan(
                        text: session.subjectName,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const TextSpan(text: ' จับเวลาไว้ '),
                      TextSpan(
                        text: formatClock(session.elapsedSeconds),
                        style: const TextStyle(
                          color: Color(0xFF5C8FAC),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11.5,
                    height: 1.5,
                    color: Color(0xFF8D7D83),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'ติดต่อระบบล่าสุด: ${formatThaiDateTime(session.lastSeenAt)}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFFA49399),
                  ),
                ),
                const SizedBox(height: 17),
                if (interrupted)
                  Row(
                    children: [
                      Expanded(
                        child: _RecoveryButton(
                          label: 'ยกเลิกรายการ',
                          icon: Icons.cancel_outlined,
                          tone: _RecoveryTone.danger,
                          onPressed: () => Navigator.pop(context, 'cancel'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _RecoveryButton(
                          label: 'บันทึกเวลานี้',
                          tone: _RecoveryTone.primary,
                          onPressed: () =>
                              Navigator.pop(context, 'save_interrupted'),
                        ),
                      ),
                    ],
                  )
                else
                  Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _RecoveryButton(
                              label: 'จับเวลาต่อ',
                              icon: Icons.refresh_rounded,
                              tone: _RecoveryTone.primary,
                              onPressed: () =>
                                  Navigator.pop(context, 'continue'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _RecoveryButton(
                              label: 'จบ ณ เวลาล่าสุด',
                              onPressed: () =>
                                  Navigator.pop(context, 'finish_last_seen'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: _RecoveryButton(
                              label: 'บันทึกถึงตอนนี้',
                              onPressed: () =>
                                  Navigator.pop(context, 'finish_now'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _RecoveryButton(
                              label: 'ยกเลิกรายการ',
                              tone: _RecoveryTone.danger,
                              onPressed: () => Navigator.pop(context, 'cancel'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                const Text(
                  'เลือก “จบ ณ เวลาล่าสุด” หากเลิกทบทวนตั้งแต่ตอนที่ปิดหน้า'
                  'หรือขาดอินเทอร์เน็ต',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 9,
                    height: 1.4,
                    color: Color(0xFFAA9BA0),
                  ),
                ),
              ],
            ),
          ),
        ),
      ) ??
      'cancel';
}

enum _RecoveryTone { neutral, primary, danger }

class _RecoveryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final _RecoveryTone tone;
  final VoidCallback onPressed;

  const _RecoveryButton({
    required this.label,
    this.icon,
    this.tone = _RecoveryTone.neutral,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final background = switch (tone) {
      _RecoveryTone.primary => const Color(0xFF8FC8AA),
      _RecoveryTone.danger => const Color(0xFFFFF7F7),
      _RecoveryTone.neutral => Colors.white,
    };
    final foreground = switch (tone) {
      _RecoveryTone.primary => Colors.white,
      _RecoveryTone.danger => const Color(0xFFB65D69),
      _RecoveryTone.neutral => const Color(0xFF75676C),
    };
    final border = switch (tone) {
      _RecoveryTone.primary => const Color(0xFF86BFA5),
      _RecoveryTone.danger => const Color(0xFFEFB0B8),
      _RecoveryTone.neutral => const Color(0xFFDED2D3),
    };
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(42),
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 9),
        backgroundColor: background,
        foregroundColor: foreground,
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[Icon(icon, size: 15), const SizedBox(width: 4)],
          Flexible(child: Text(label, textAlign: TextAlign.center)),
        ],
      ),
    );
  }
}
