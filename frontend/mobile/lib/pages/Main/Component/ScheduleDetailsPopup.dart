// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../interfaces/table.interface.dart';

Future<void> showScheduleDetailsPopup(
  BuildContext context, {
  required ScheduleItem item,
  required Future<ScheduleItem> Function(UpdateScheduleInput input) onSave,
  required Future<void> Function() onDelete,
}) => showDialog<void>(
  context: context,
  barrierColor: Colors.black38,
  builder: (_) =>
      _ScheduleDetailsPopup(item: item, onSave: onSave, onDelete: onDelete),
);

class _ScheduleDetailsPopup extends StatefulWidget {
  final ScheduleItem item;
  final Future<ScheduleItem> Function(UpdateScheduleInput input) onSave;
  final Future<void> Function() onDelete;

  const _ScheduleDetailsPopup({
    required this.item,
    required this.onSave,
    required this.onDelete,
  });

  @override
  State<_ScheduleDetailsPopup> createState() => _ScheduleDetailsPopupState();
}

class _ScheduleDetailsPopupState extends State<_ScheduleDetailsPopup> {
  late ScheduleItem _item;
  late int _day;
  late String _start;
  late String _end;
  late TextEditingController _classroom;
  late TextEditingController _note;
  bool _editing = false;
  bool _busy = false;
  String? _error;

  bool get _isClass => _item.scheduleTypeId == 1;

  @override
  void initState() {
    super.initState();
    _item = widget.item;
    _resetFields();
  }

  void _resetFields() {
    _day = _item.scheduleDay;
    _start = _item.startTime;
    _end = _item.endTime;
    _classroom = TextEditingController(text: _item.classroom ?? '');
    _note = TextEditingController(text: _item.note ?? '');
  }

  @override
  void dispose() {
    _classroom.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickTime(bool start) async {
    final value = start ? _start : _end;
    final parts = value.split(':').map(int.parse).toList();
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: parts[0], minute: parts[1]),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null || !mounted) return;
    final formatted =
        '${picked.hour.toString().padLeft(2, '0')}:'
        '${picked.minute.toString().padLeft(2, '0')}';
    setState(() {
      if (start) {
        _start = formatted;
      } else {
        _end = formatted;
      }
      _error = null;
    });
  }

  Future<void> _save() async {
    if (_start.compareTo(_end) >= 0) {
      setState(() => _error = 'เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด');
      return;
    }
    if (_isClass && _classroom.text.trim().length > 10) {
      setState(() => _error = 'ชื่อห้องเรียนต้องไม่เกิน 10 ตัวอักษร');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await widget.onSave(
        UpdateScheduleInput(
          scheduleDay: _day,
          startTime: _start,
          endTime: _end,
          classroom: _isClass && _classroom.text.trim().isNotEmpty
              ? _classroom.text.trim()
              : null,
          note: _isClass && _note.text.trim().isNotEmpty
              ? _note.text.trim()
              : null,
        ),
      );
      if (!mounted) return;
      setState(() {
        _item = updated;
        _editing = false;
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        key: const Key('delete-schedule-confirmation'),
        backgroundColor: const Color(0xFFF4FBFE),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text('ลบบล็อกเวลานี้?'),
        content: Text(
          'ต้องการลบ${_item.scheduleTypeId == 2 ? 'เวลาอ่านหนังสือ' : 'เวลาทำการบ้าน'}'
          'ของวิชา ${_item.subjectName} ใช่ไหม',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            key: const Key('confirm-delete-schedule'),
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFE98F89),
            ),
            child: const Text('ลบ'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await widget.onDelete();
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('schedule-details-popup'),
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _item.subjectName,
                          style: const TextStyle(
                            fontSize: 18,
                            color: Color(0xFF52636D),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          _typeName(_item.scheduleTypeId),
                          style: const TextStyle(
                            fontSize: 10,
                            color: Color(0xFF8AA0AA),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _busy ? null : () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                    color: const Color(0xFFF05B87),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _DetailRow(
                label: 'วัน',
                child: _editing
                    ? DropdownButton<int>(
                        value: _day,
                        isExpanded: true,
                        items: List.generate(
                          7,
                          (index) => DropdownMenuItem(
                            value: index + 1,
                            child: Text(_dayNames[index]),
                          ),
                        ),
                        onChanged: (value) =>
                            setState(() => _day = value ?? _day),
                      )
                    : _ValuePill(_dayNames[_item.scheduleDay - 1]),
              ),
              const SizedBox(height: 10),
              _DetailRow(
                label: 'ระยะเวลา',
                child: _editing
                    ? Row(
                        children: [
                          Expanded(
                            child: _TimeButton(
                              value: _start,
                              onTap: () => _pickTime(true),
                            ),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6),
                            child: Text('–'),
                          ),
                          Expanded(
                            child: _TimeButton(
                              value: _end,
                              onTap: () => _pickTime(false),
                            ),
                          ),
                        ],
                      )
                    : _ValuePill('${_item.startTime} – ${_item.endTime}'),
              ),
              if (_isClass) ...[
                const SizedBox(height: 10),
                _DetailRow(
                  label: 'ห้องเรียน',
                  child: _editing
                      ? TextField(
                          key: const Key('schedule-classroom-field'),
                          controller: _classroom,
                          maxLength: 10,
                          decoration: _inputDecoration('ไม่ระบุ'),
                        )
                      : _ValuePill(_item.classroom ?? 'ไม่ระบุ'),
                ),
                const SizedBox(height: 10),
                _DetailRow(
                  label: 'โน้ต',
                  child: _editing
                      ? TextField(
                          key: const Key('schedule-note-field'),
                          controller: _note,
                          maxLines: 3,
                          decoration: _inputDecoration('เพิ่มโน้ตสำหรับคาบนี้'),
                        )
                      : _ValuePill(_item.note ?? 'ไม่มีโน้ต'),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFFD65D69),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  if (!_isClass)
                    OutlinedButton.icon(
                      key: const Key('delete-schedule-button'),
                      onPressed: _busy ? null : _delete,
                      icon: const Icon(Icons.delete_outline_rounded, size: 17),
                      label: const Text('ลบ'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFB5534A),
                        side: const BorderSide(color: Color(0xFFE5A39D)),
                        shape: const StadiumBorder(),
                      ),
                    )
                  else
                    const Spacer(),
                  if (!_isClass) const Spacer(),
                  if (_editing) ...[
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () {
                              _classroom.dispose();
                              _note.dispose();
                              _resetFields();
                              setState(() {
                                _editing = false;
                                _error = null;
                              });
                            },
                      child: const Text('ยกเลิก'),
                    ),
                    const SizedBox(width: 7),
                  ],
                  FilledButton.icon(
                    key: Key(
                      _editing
                          ? 'save-schedule-button'
                          : 'edit-schedule-button',
                    ),
                    onPressed: _busy
                        ? null
                        : _editing
                        ? _save
                        : () => setState(() => _editing = true),
                    icon: _busy
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(
                            _editing
                                ? Icons.save_outlined
                                : Icons.edit_outlined,
                            size: 16,
                          ),
                    label: Text(_editing ? 'บันทึก' : 'แก้ไข'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF8FC5DF),
                      shape: const StadiumBorder(),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final Widget child;

  const _DetailRow({required this.label, required this.child});

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      SizedBox(
        width: 80,
        child: Padding(
          padding: const EdgeInsets.only(top: 9),
          child: Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
          ),
        ),
      ),
      Expanded(child: child),
    ],
  );
}

class _ValuePill extends StatelessWidget {
  final String value;

  const _ValuePill(this.value);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
    decoration: BoxDecoration(
      color: const Color(0xFFF6F8F9),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      value,
      style: const TextStyle(fontSize: 12, color: Color(0xFF526771)),
    ),
  );
}

class _TimeButton extends StatelessWidget {
  final String value;
  final VoidCallback onTap;

  const _TimeButton({required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) => OutlinedButton(
    onPressed: onTap,
    style: OutlinedButton.styleFrom(
      padding: const EdgeInsets.symmetric(horizontal: 5),
      side: const BorderSide(color: Color(0xFFA9C8D6)),
    ),
    child: Text(value, style: const TextStyle(fontSize: 11)),
  );
}

InputDecoration _inputDecoration(String hint) => InputDecoration(
  hintText: hint,
  counterText: '',
  isDense: true,
  filled: true,
  fillColor: Colors.white,
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
);

String _typeName(int type) => switch (type) {
  1 => 'เรียน',
  2 => 'อ่านหนังสือ',
  _ => 'การบ้าน',
};

const _dayNames = [
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
  'อาทิตย์',
];
