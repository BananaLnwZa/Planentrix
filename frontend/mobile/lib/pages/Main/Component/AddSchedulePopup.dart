// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../common/AppTimePicker.dart';
import '../../../interfaces/table.interface.dart';

Future<AddScheduleInput?> showAddSchedulePopup(
  BuildContext context, {
  required List<ScheduleSubject> subjects,
  required List<ScheduleItem> scheduleItems,
}) => showDialog<AddScheduleInput>(
  context: context,
  barrierColor: Colors.black38,
  builder: (_) =>
      _AddSchedulePopup(subjects: subjects, scheduleItems: scheduleItems),
);

class _AddSchedulePopup extends StatefulWidget {
  final List<ScheduleSubject> subjects;
  final List<ScheduleItem> scheduleItems;

  const _AddSchedulePopup({
    required this.subjects,
    required this.scheduleItems,
  });

  @override
  State<_AddSchedulePopup> createState() => _AddSchedulePopupState();
}

class _AddSchedulePopupState extends State<_AddSchedulePopup> {
  int? _typeId;
  String? _subjectId;
  int _day = 1;
  String _start = '08:00';
  String _end = '09:00';
  String? _error;

  Future<void> _pickTime(bool start) async {
    final current = _parseTime(start ? _start : _end);
    final picked = await showAppTimePicker(
      context: context,
      initialTime: current,
      title: start ? 'เลือกเวลาเริ่ม' : 'เลือกเวลาสิ้นสุด',
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (start) {
        _start = _formatTime(picked);
      } else {
        _end = _formatTime(picked);
      }
      _error = null;
    });
  }

  void _submit() {
    if (_typeId == null || _subjectId == null) {
      setState(() => _error = 'กรุณาเลือกประเภทและรายวิชา');
      return;
    }
    if (_start.compareTo(_end) >= 0) {
      setState(() => _error = 'เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด');
      return;
    }
    final overlaps = widget.scheduleItems.any(
      (item) =>
          item.scheduleDay == _day &&
          _start.compareTo(item.endTime) < 0 &&
          _end.compareTo(item.startTime) > 0,
    );
    if (overlaps) {
      setState(() => _error = 'ช่วงเวลานี้ทับซ้อนกับตารางที่มีอยู่');
      return;
    }
    Navigator.pop(
      context,
      AddScheduleInput(
        scheduleTypeId: _typeId!,
        subjectId: _subjectId!,
        scheduleDay: _day,
        startTime: _start,
        endTime: _end,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('add-schedule-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFDF9),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFB8C7CE)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x3D405866),
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'เพิ่มบล็อกเวลา',
                      style: TextStyle(
                        color: Color(0xFF52636D),
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                    color: const Color(0xFFF05B87),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text('ประเภท', style: _labelStyle),
              const SizedBox(height: 7),
              Row(
                children: [
                  Expanded(
                    child: _TypeButton(
                      key: const Key('schedule-type-review'),
                      selected: _typeId == 2,
                      label: 'อ่านหนังสือ',
                      color: const Color(0xFFFFF0BA),
                      onTap: () => setState(() => _typeId = 2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TypeButton(
                      key: const Key('schedule-type-homework'),
                      selected: _typeId == 3,
                      label: 'การบ้าน',
                      color: const Color(0xFFF8D1CD),
                      onTap: () => setState(() => _typeId = 3),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 13),
              const Text('วิชา', style: _labelStyle),
              const SizedBox(height: 5),
              _SelectField<String>(
                key: const Key('schedule-subject-field'),
                value: _subjectId,
                hint: widget.subjects.isEmpty ? 'ไม่พบรายวิชา' : 'เลือกวิชา',
                items: widget.subjects
                    .map(
                      (subject) => DropdownMenuItem(
                        value: subject.subjectId,
                        child: Text(
                          subject.subjectName,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: widget.subjects.isEmpty
                    ? null
                    : (value) => setState(() => _subjectId = value),
              ),
              const SizedBox(height: 12),
              const Text('วัน', style: _labelStyle),
              const SizedBox(height: 5),
              _SelectField<int>(
                key: const Key('schedule-day-field'),
                value: _day,
                hint: 'เลือกวัน',
                items: List.generate(
                  7,
                  (index) => DropdownMenuItem(
                    value: index + 1,
                    child: Text(_dayNames[index]),
                  ),
                ),
                onChanged: (value) => setState(() => _day = value ?? 1),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _TimeField(
                      key: const Key('schedule-start-time'),
                      label: 'เวลาเริ่ม',
                      value: _start,
                      onTap: () => _pickTime(true),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(8, 20, 8, 0),
                    child: Text(
                      '–',
                      style: TextStyle(color: Color(0xFF78909C)),
                    ),
                  ),
                  Expanded(
                    child: _TimeField(
                      key: const Key('schedule-end-time'),
                      label: 'เวลาจบ',
                      value: _end,
                      onTap: () => _pickTime(false),
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  key: const Key('add-schedule-error'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFFD65D69),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Center(
                child: FilledButton.icon(
                  key: const Key('confirm-add-schedule'),
                  onPressed: widget.subjects.isEmpty ? null : _submit,
                  icon: const Icon(Icons.check_rounded, size: 19),
                  label: const Text('เพิ่มลงตาราง'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF9EDB7D),
                    foregroundColor: const Color(0xFF355A2B),
                    shape: const StadiumBorder(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const _labelStyle = TextStyle(fontSize: 13, color: Color(0xFF4B5563));
const _dayNames = [
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
  'อาทิตย์',
];

class _TypeButton extends StatelessWidget {
  final bool selected;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _TypeButton({
    super.key,
    required this.selected,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(20),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.symmetric(vertical: 9),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: selected ? color : color.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: selected ? const Color(0xFF78909C) : Colors.transparent,
          width: 1.5,
        ),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12)),
    ),
  );
}

class _SelectField<T> extends StatelessWidget {
  final T? value;
  final String hint;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;

  const _SelectField({
    super.key,
    required this.value,
    required this.hint,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => Container(
    height: 40,
    padding: const EdgeInsets.symmetric(horizontal: 12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFC8C8C8)),
    ),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<T>(
        value: value,
        hint: Text(hint, style: const TextStyle(fontSize: 11)),
        isExpanded: true,
        items: items,
        onChanged: onChanged,
        style: const TextStyle(
          fontFamily: 'Sansation',
          fontSize: 12,
          color: Color(0xFF555555),
        ),
      ),
    ),
  );
}

class _TimeField extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _TimeField({
    super.key,
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: _labelStyle),
      const SizedBox(height: 5),
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFA9C8D6)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(value, style: const TextStyle(fontSize: 12)),
              ),
              const Icon(
                Icons.access_time_rounded,
                size: 16,
                color: Color(0xFF74B88A),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

TimeOfDay _parseTime(String value) {
  final parts = value.split(':').map(int.parse).toList();
  return TimeOfDay(hour: parts[0], minute: parts[1]);
}

String _formatTime(TimeOfDay value) =>
    '${value.hour.toString().padLeft(2, '0')}:'
    '${value.minute.toString().padLeft(2, '0')}';
