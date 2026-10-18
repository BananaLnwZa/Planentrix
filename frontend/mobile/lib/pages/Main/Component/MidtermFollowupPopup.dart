import 'dart:math' as math;

import 'package:flutter/material.dart';

enum MidtermFollowupDestination { later, homework, test }

Future<MidtermFollowupDestination?> showMidtermFollowupPopup(
  BuildContext context, {
  required Future<bool> Function() onAcknowledge,
  bool hasFinalTest = false,
}) => showDialog<MidtermFollowupDestination>(
  context: context,
  barrierDismissible: false,
  builder: (_) => _MidtermFollowupPopup(
    onAcknowledge: onAcknowledge,
    hasFinalTest: hasFinalTest,
  ),
);

class _MidtermFollowupPopup extends StatefulWidget {
  final Future<bool> Function() onAcknowledge;
  final bool hasFinalTest;

  const _MidtermFollowupPopup({
    required this.onAcknowledge,
    required this.hasFinalTest,
  });

  @override
  State<_MidtermFollowupPopup> createState() => _MidtermFollowupPopupState();
}

class _MidtermFollowupPopupState extends State<_MidtermFollowupPopup> {
  bool _saving = false;
  String? _error;

  Future<void> _close(MidtermFollowupDestination destination) async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onAcknowledge();
      if (mounted) Navigator.of(context).pop(destination);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // The notebook paper is at most 400px wide and has an outer margin on
    // smaller screens. Keep this dialog inside it, with a little space around.
    final dialogWidth = math.max(
      0.0,
      math.min(376.0, MediaQuery.sizeOf(context).width - 76.0),
    );
    return Center(
      child: SizedBox(
        width: dialogWidth,
        child: Dialog(
          key: const Key('midterm-followup-popup'),
          insetPadding: EdgeInsets.zero,
          backgroundColor: const Color(0xFFFFFDFE),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFCFE4ED)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'หลังสอบกลางภาค',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF405B69),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'เพิ่มรายการสอบกลางภาคและกรอกคะแนนในหน้าการบ้าน'
                  '${widget.hasFinalTest ? ' พร้อมทำแบบทดสอบปลายภาคครั้งแรกให้ครบทุกวิชาที่มีข้อสอบ เพื่อเริ่มนัด checkpoint รอบใหม่' : ''}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 24 / 14,
                    color: Color(0xFF71858E),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _error!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFFD65D69),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: _saving
                          ? null
                          : () => _close(MidtermFollowupDestination.later),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF6A8795),
                        side: const BorderSide(color: Color(0xFFB7D1DC)),
                        shape: const StadiumBorder(),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        textStyle: const TextStyle(fontSize: 14),
                      ),
                      child: const Text('ไว้ก่อน'),
                    ),
                    FilledButton(
                      onPressed: _saving
                          ? null
                          : () => _close(MidtermFollowupDestination.homework),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF8BC9E5),
                        shape: const StadiumBorder(),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        textStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: const Text('ไปหน้าการบ้าน'),
                    ),
                    if (widget.hasFinalTest)
                      FilledButton(
                        onPressed: _saving
                            ? null
                            : () => _close(MidtermFollowupDestination.test),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF9DCB83),
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          textStyle: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: const Text('ทำแบบทดสอบปลายภาค'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
