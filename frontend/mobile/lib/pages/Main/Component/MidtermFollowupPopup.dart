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
  Widget build(BuildContext context) => AlertDialog(
    key: const Key('midterm-followup-popup'),
    backgroundColor: const Color(0xFFFFFDFE),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: const BorderSide(color: Color(0xFFCFE4ED)),
    ),
    title: const Text(
      'หลังสอบกลางภาค',
      textAlign: TextAlign.center,
      style: TextStyle(fontSize: 17, color: Color(0xFF405B69)),
    ),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.hasFinalTest
              ? 'เพิ่มรายการสอบกลางภาคและกรอกคะแนนในหน้าการบ้าน พร้อมทำแบบทดสอบปลายภาคครั้งแรกของทุกวิชาที่มีข้อสอบ เพื่อเริ่มแผนทบทวนช่วงปลายภาค'
              : 'เพิ่มรายการสอบกลางภาคและกรอกคะแนนในหน้าการบ้าน เพื่อให้ระบบสรุปคะแนนได้ครบถ้วน',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 13,
            height: 1.5,
            color: Color(0xFF71858E),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(
            _error!,
            style: const TextStyle(fontSize: 12, color: Color(0xFFD65D69)),
          ),
        ],
      ],
    ),
    actionsAlignment: MainAxisAlignment.center,
    actionsOverflowAlignment: OverflowBarAlignment.center,
    actions: [
      OutlinedButton(
        onPressed: _saving
            ? null
            : () => _close(MidtermFollowupDestination.later),
        child: const Text('ไว้ก่อน'),
      ),
      if (widget.hasFinalTest)
        FilledButton(
          onPressed: _saving
              ? null
              : () => _close(MidtermFollowupDestination.homework),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF8BC9E5),
          ),
          child: const Text('ไปหน้าการบ้าน'),
        ),
      FilledButton(
        onPressed: _saving
            ? null
            : () => _close(MidtermFollowupDestination.test),
        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF9DCB83)),
        child: const Text('ทำแบบทดสอบปลายภาค'),
      ),
    ],
  );
}
