// ignore_for_file: file_names

import 'package:flutter/material.dart';

const appTimePickerColor = Color(0xFF74B88A);

Future<TimeOfDay?> showAppTimePicker({
  required BuildContext context,
  required TimeOfDay initialTime,
  String title = 'เลือกเวลา',
}) {
  return showDialog<TimeOfDay>(
    context: context,
    useRootNavigator: true,
    barrierColor: const Color(0x26000000),
    builder: (_) =>
        _AppTimePickerDialog(initialTime: initialTime, title: title),
  );
}

class _AppTimePickerDialog extends StatefulWidget {
  final TimeOfDay initialTime;
  final String title;

  const _AppTimePickerDialog({required this.initialTime, required this.title});

  @override
  State<_AppTimePickerDialog> createState() => _AppTimePickerDialogState();
}

class _AppTimePickerDialogState extends State<_AppTimePickerDialog> {
  late int _hour;
  late int _minute;

  @override
  void initState() {
    super.initState();
    _hour = widget.initialTime.hour;
    _minute = widget.initialTime.minute;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('app-time-picker-dialog'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFDFB),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: appTimePickerColor.withValues(alpha: 0.45)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x24000000),
              blurRadius: 30,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.access_time_rounded,
                  color: appTimePickerColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.title,
                    style: const TextStyle(
                      color: Color(0xFF374957),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 20),
                  color: const Color(0xFF839198),
                ),
              ],
            ),
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              padding: const EdgeInsets.symmetric(vertical: 10),
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFEFF8F1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                '${_pad(_hour)}:${_pad(_minute)}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF385B44),
                  fontSize: 26,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: _NumberSelector(
                    label: 'ชั่วโมง',
                    count: 24,
                    value: _hour,
                    onChanged: (value) => setState(() => _hour = value),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.fromLTRB(8, 24, 8, 0),
                  child: Text(
                    ':',
                    style: TextStyle(fontSize: 22, color: Color(0xFF587064)),
                  ),
                ),
                Expanded(
                  child: _NumberSelector(
                    label: 'นาที',
                    count: 60,
                    value: _minute,
                    onChanged: (value) => setState(() => _minute = value),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'ยกเลิก',
                    style: TextStyle(color: Color(0xFF71838C)),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () => Navigator.pop(
                    context,
                    TimeOfDay(hour: _hour, minute: _minute),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: appTimePickerColor,
                    shape: const StadiumBorder(),
                  ),
                  child: const Text('ตกลง'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _NumberSelector extends StatelessWidget {
  final String label;
  final int count;
  final int value;
  final ValueChanged<int> onChanged;

  const _NumberSelector({
    required this.label,
    required this.count,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF84959D)),
        ),
        const SizedBox(height: 5),
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFD5E5DA)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: value,
              isExpanded: true,
              borderRadius: BorderRadius.circular(16),
              iconEnabledColor: appTimePickerColor,
              items: List.generate(
                count,
                (index) => DropdownMenuItem(
                  value: index,
                  child: Center(
                    child: Text(
                      _pad(index),
                      style: const TextStyle(
                        color: Color(0xFF385B44),
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ),
              onChanged: (next) {
                if (next != null) onChanged(next);
              },
            ),
          ),
        ),
      ],
    );
  }
}

String _pad(int value) => value.toString().padLeft(2, '0');
