// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../interfaces/profile.interface.dart';
import '../../../services/profile.service.dart';

typedef ProfileEditResult = ({UserProfile profile, UserConstraint constraint});

Future<ProfileEditResult?> showEditProfilePopup(
  BuildContext context, {
  required UserProfile profile,
  required UserConstraint constraint,
  required ProfileRepository repository,
}) => showDialog<ProfileEditResult>(
  context: context,
  barrierColor: Colors.black38,
  builder: (_) => _EditProfilePopup(
    profile: profile,
    constraint: constraint,
    repository: repository,
  ),
);

class _EditProfilePopup extends StatefulWidget {
  final UserProfile profile;
  final UserConstraint constraint;
  final ProfileRepository repository;

  const _EditProfilePopup({
    required this.profile,
    required this.constraint,
    required this.repository,
  });

  @override
  State<_EditProfilePopup> createState() => _EditProfilePopupState();
}

class _EditProfilePopupState extends State<_EditProfilePopup> {
  late final TextEditingController _name;
  late final TextEditingController _workingDuration;
  late final TextEditingController _breakDuration;
  DateTime? _birthdate;
  String? _gender;
  int? _dayOff;
  int? _timePreference;
  String? _startTime;
  String? _endTime;
  late List<BusyTime> _busyDays;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.profile.userName);
    _workingDuration = TextEditingController(
      text: widget.constraint.continuousWorkingDuration?.toString() ?? '',
    );
    _breakDuration = TextEditingController(
      text: widget.constraint.breakDuration?.toString() ?? '',
    );
    _birthdate = widget.profile.birthdate;
    _gender = widget.profile.gender;
    _dayOff = widget.constraint.dayOff;
    _timePreference = widget.constraint.timePreference;
    _startTime = widget.constraint.startTime;
    _endTime = widget.constraint.endTime;
    _busyDays = [...widget.constraint.busyDays];
  }

  @override
  void dispose() {
    _name.dispose();
    _workingDuration.dispose();
    _breakDuration.dispose();
    super.dispose();
  }

  Future<void> _pickBirthdate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthdate ?? DateTime(2004, 1, 1),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
    );
    if (picked != null && mounted) setState(() => _birthdate = picked);
  }

  Future<String?> _pickTime(String? current) async {
    final parts = (current ?? '08:00').split(':').map(int.parse).toList();
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: parts[0], minute: parts[1]),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return null;
    return '${picked.hour.toString().padLeft(2, '0')}:'
        '${picked.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _addBusyTime() async {
    final day = await showDialog<int>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('เลือกวันที่ไม่ว่าง'),
        children: List.generate(
          7,
          (index) => SimpleDialogOption(
            onPressed: () => Navigator.pop(context, index + 1),
            child: Text(_dayNames[index]),
          ),
        ),
      ),
    );
    if (day == null || !mounted) return;
    final start = await _pickTime('08:00');
    if (start == null || !mounted) return;
    final end = await _pickTime('09:00');
    if (end == null || !mounted) return;
    if (start.compareTo(end) >= 0) {
      setState(() => _error = 'เวลาไม่ว่างต้องมีเวลาเริ่มก่อนเวลาสิ้นสุด');
      return;
    }
    setState(() {
      _busyDays.add(BusyTime(day: day, start: start, end: end));
      _error = null;
    });
  }

  Future<void> _save() async {
    final username = _name.text.trim();
    if (!RegExp(r'^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,}$').hasMatch(username)) {
      setState(
        () => _error =
            'Username ต้องมีอย่างน้อย 3 ตัว มีตัวอักษร และใช้เฉพาะตัวอักษรหรือตัวเลข',
      );
      return;
    }
    if ((_startTime == null) != (_endTime == null)) {
      setState(() => _error = 'กรุณาระบุเวลาเริ่มและเวลาสิ้นสุดให้ครบ');
      return;
    }
    if (_startTime != null && _startTime!.compareTo(_endTime!) >= 0) {
      setState(() => _error = 'เวลาเริ่มทำงานต้องอยู่ก่อนเวลาสิ้นสุด');
      return;
    }
    final working = int.tryParse(_workingDuration.text);
    final breakTime = int.tryParse(_breakDuration.text);
    if ((working != null && working < 0) ||
        (breakTime != null && breakTime < 0)) {
      setState(() => _error = 'ระยะเวลาทำงานและพักต้องไม่ติดลบ');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        widget.repository.updateProfile(
          UpdateProfileInput(
            userName: username,
            birthdate: _birthdate,
            gender: _gender,
          ),
        ),
        widget.repository.updateConstraints(
          UpdateConstraintInput(
            dayOff: _dayOff,
            continuousWorkingDuration: working,
            breakDuration: breakTime,
            startTime: _startTime,
            endTime: _endTime,
            timePreference: _timePreference,
            busyDays: _busyDays,
          ),
        ),
      ]);
      if (!mounted) return;
      Navigator.pop(context, (
        profile: results[0] as UserProfile,
        constraint: results[1] as UserConstraint,
      ));
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;
    return Dialog(
      key: const Key('edit-profile-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 22),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: BoxConstraints(maxWidth: 460, maxHeight: height * 0.9),
        decoration: BoxDecoration(
          color: const Color(0xFFF3FBFF),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFD1D5DB)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            Container(
              color: const Color(0xFFC7E8F8),
              padding: const EdgeInsets.fromLTRB(18, 14, 10, 12),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'แก้ไขโปรไฟล์และข้อจำกัด',
                      style: TextStyle(fontSize: 18, color: Color(0xFF314553)),
                    ),
                  ),
                  IconButton(
                    onPressed: _saving ? null : () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _SectionTitle('ข้อมูลส่วนตัว'),
                    _TextField(
                      key: const Key('edit-profile-name'),
                      label: 'Username',
                      controller: _name,
                    ),
                    const SizedBox(height: 10),
                    _SelectField<String>(
                      label: 'เพศ',
                      value: _gender,
                      items: const [
                        DropdownMenuItem(value: 'male', child: Text('Male')),
                        DropdownMenuItem(
                          value: 'female',
                          child: Text('Female'),
                        ),
                        DropdownMenuItem(value: 'other', child: Text('Other')),
                      ],
                      onChanged: (value) => setState(() => _gender = value),
                    ),
                    const SizedBox(height: 10),
                    _ValueButton(
                      label: 'วันเกิด',
                      value: _birthdate == null
                          ? 'ไม่ระบุ'
                          : _formatDate(_birthdate!),
                      onTap: _pickBirthdate,
                    ),
                    const SizedBox(height: 18),
                    const _SectionTitle('ข้อจำกัดการจัดตาราง'),
                    _SelectField<int>(
                      label: 'วันหยุด',
                      value: _dayOff,
                      items: List.generate(
                        7,
                        (index) => DropdownMenuItem(
                          value: index + 1,
                          child: Text(_dayNames[index]),
                        ),
                      ),
                      onChanged: (value) => setState(() => _dayOff = value),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _TextField(
                            label: 'ทำงานต่อเนื่อง (นาที)',
                            controller: _workingDuration,
                            numeric: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _TextField(
                            label: 'เวลาพัก (นาที)',
                            controller: _breakDuration,
                            numeric: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _ValueButton(
                            label: 'เวลาเริ่มทำงาน',
                            value: _startTime ?? 'ไม่ระบุ',
                            onTap: () async {
                              final value = await _pickTime(_startTime);
                              if (value != null && mounted) {
                                setState(() => _startTime = value);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _ValueButton(
                            label: 'เวลาสิ้นสุด',
                            value: _endTime ?? 'ไม่ระบุ',
                            onTap: () async {
                              final value = await _pickTime(_endTime);
                              if (value != null && mounted) {
                                setState(() => _endTime = value);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _SelectField<int>(
                      label: 'ช่วงเวลาที่ชอบ',
                      value: _timePreference,
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('เช้า')),
                        DropdownMenuItem(value: 2, child: Text('กลางวัน')),
                        DropdownMenuItem(value: 3, child: Text('เย็น')),
                      ],
                      onChanged: (value) =>
                          setState(() => _timePreference = value),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'วันเวลาไม่ว่างประจำ',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563),
                            ),
                          ),
                        ),
                        IconButton.filledTonal(
                          key: const Key('add-profile-busy-time'),
                          onPressed: _addBusyTime,
                          icon: const Icon(Icons.add_rounded, size: 18),
                        ),
                      ],
                    ),
                    for (var index = 0; index < _busyDays.length; index++)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          '${_dayNames[_busyDays[index].day - 1]}  '
                          '${_busyDays[index].start} – ${_busyDays[index].end}',
                          style: const TextStyle(fontSize: 11),
                        ),
                        trailing: IconButton(
                          onPressed: () =>
                              setState(() => _busyDays.removeAt(index)),
                          icon: const Icon(Icons.close_rounded, size: 18),
                        ),
                      ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFFD65D69),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(13),
              color: Colors.white70,
              child: FilledButton.icon(
                key: const Key('save-profile-button'),
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined, size: 18),
                label: Text(_saving ? 'กำลังบันทึก...' : 'บันทึก'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF8FC8AA),
                  shape: const StadiumBorder(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;

  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 9),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 15,
        color: Color(0xFF5B7D8F),
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class _TextField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final bool numeric;

  const _TextField({
    super.key,
    required this.label,
    required this.controller,
    this.numeric = false,
  });

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    keyboardType: numeric ? TextInputType.number : TextInputType.text,
    decoration: _decoration(label),
  );
}

class _SelectField<T> extends StatelessWidget {
  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _SelectField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<T>(
    initialValue: value,
    items: items,
    onChanged: onChanged,
    decoration: _decoration(label),
  );
}

class _ValueButton extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _ValueButton({
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(14),
    child: InputDecorator(
      decoration: _decoration(label),
      child: Text(value, style: const TextStyle(fontSize: 12)),
    ),
  );
}

InputDecoration _decoration(String label) => InputDecoration(
  labelText: label,
  isDense: true,
  filled: true,
  fillColor: Colors.white,
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
);

String _formatDate(DateTime value) =>
    '${value.day.toString().padLeft(2, '0')}/'
    '${value.month.toString().padLeft(2, '0')}/${value.year}';

const _dayNames = [
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
  'วันอาทิตย์',
];
