import 'package:flutter/material.dart';

Future<bool?> showMidtermFollowupPopup(
  BuildContext context, {
  required Future<bool> Function() onAcknowledge,
}) => showDialog<bool>(
  context: context,
  barrierDismissible: false,
  builder: (_) => _MidtermFollowupPopup(onAcknowledge: onAcknowledge),
);

class _MidtermFollowupPopup extends StatefulWidget {
  final Future<bool> Function() onAcknowledge;

  const _MidtermFollowupPopup({required this.onAcknowledge});

  @override
  State<_MidtermFollowupPopup> createState() => _MidtermFollowupPopupState();
}

class _MidtermFollowupPopupState extends State<_MidtermFollowupPopup> {
  bool _saving = false;
  String? _error;

  Future<void> _close({required bool openHomework}) async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onAcknowledge();
      if (mounted) Navigator.of(context).pop(openHomework);
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
      'บันทึกผลสอบกลางภาค',
      textAlign: TextAlign.center,
      style: TextStyle(fontSize: 17, color: Color(0xFF405B69)),
    ),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          'เพิ่มรายการสอบกลางภาคของแต่ละวิชาในหน้าการบ้าน แล้วกรอกคะแนนสอบเพื่อให้ระบบสรุปคะแนนได้ครบถ้วน',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF71858E)),
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
    actions: [
      OutlinedButton(
        onPressed: _saving ? null : () => _close(openHomework: false),
        child: const Text('ไว้ก่อน'),
      ),
      FilledButton(
        onPressed: _saving ? null : () => _close(openHomework: true),
        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF8BC9E5)),
        child: const Text('ไปหน้าการบ้าน'),
      ),
    ],
  );
}
