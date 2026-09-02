// ignore_for_file: file_names

import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../common/AppDatePicker.dart';
import '../../../common/AppTimePicker.dart';
import '../../../common/AppDropdown.dart';
import '../../../common/DateTimeFormat.dart';

import '../../../interfaces/profile.interface.dart';
import '../../../services/profile.service.dart';

typedef ProfileEditResult = ({UserProfile profile, UserConstraint constraint});

enum _EditProfilePanel { profile, constraint }

const _dayColors = <Color>[
  Color(0xFFB99D00),
  Color(0xFFD86F95),
  Color(0xFF6FA844),
  Color(0xFFD97D3E),
  Color(0xFFAE79C8),
  Color(0xFF4A9BCD),
  Color(0xFFDF6259),
];

const _dayBorderColors = <Color>[
  Color(0xFFF7E380),
  Color(0xFFF5B5CB),
  Color(0xFFB5E48C),
  Color(0xFFFBC49C),
  Color(0xFFD8B8E8),
  Color(0xFF71B7E4),
  Color(0xFFFB9A92),
];

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
  late final TextEditingController _workingHours;
  late final TextEditingController _workingMinutes;
  late final TextEditingController _breakHours;
  late final TextEditingController _breakMinutes;
  DateTime? _birthdate;
  String? _gender;
  int? _dayOff;
  String? _startTime;
  String? _endTime;
  late List<BusyTime> _busyDays;
  bool _saving = false;
  String? _error;
  _EditProfilePanel _activePanel = _EditProfilePanel.profile;
  Uint8List? _pendingPhotoBytes;
  String? _pendingPhotoName;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.profile.userName);
    final workingDuration = widget.constraint.continuousWorkingDuration;
    final breakDuration = widget.constraint.breakDuration;
    _workingHours = TextEditingController(
      text: workingDuration == null ? '' : '${workingDuration ~/ 60}',
    );
    _workingMinutes = TextEditingController(
      text: workingDuration == null ? '' : '${workingDuration % 60}',
    );
    _breakHours = TextEditingController(
      text: breakDuration == null ? '' : '${breakDuration ~/ 60}',
    );
    _breakMinutes = TextEditingController(
      text: breakDuration == null ? '' : '${breakDuration % 60}',
    );
    _birthdate = widget.profile.birthdate;
    _gender = widget.profile.gender;
    _dayOff = widget.constraint.dayOff;
    _startTime = widget.constraint.startTime;
    _endTime = widget.constraint.endTime;
    _busyDays = [...widget.constraint.busyDays];
  }

  @override
  void dispose() {
    _name.dispose();
    _workingHours.dispose();
    _workingMinutes.dispose();
    _breakHours.dispose();
    _breakMinutes.dispose();
    super.dispose();
  }

  Future<void> _pickBirthdate() async {
    final picked = await showAppDatePicker(
      context: context,
      initialDate: _birthdate ?? DateTime(2004, 1, 1),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
    );
    if (picked != null && mounted) setState(() => _birthdate = picked);
  }

  Future<void> _pickProfilePhoto() async {
    try {
      final file = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 88,
      );
      if (file == null || !mounted) return;
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      if (bytes.lengthInBytes > 5 * 1024 * 1024) {
        setState(() => _error = 'รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB');
        return;
      }
      setState(() {
        _pendingPhotoBytes = bytes;
        _pendingPhotoName = file.name;
        _error = null;
      });
    } catch (error) {
      if (mounted) setState(() => _error = 'ไม่สามารถเลือกรูปได้: $error');
    }
  }

  Future<String?> _pickTime(String? current) async {
    final safeCurrent = current == null || current.isEmpty ? '08:00' : current;
    final parts = safeCurrent.split(':').map(int.parse).toList();
    final picked = await showAppTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: parts[0], minute: parts[1]),
    );
    if (picked == null) return null;
    return '${picked.hour.toString().padLeft(2, '0')}:'
        '${picked.minute.toString().padLeft(2, '0')}';
  }

  void _addBusyTime() {
    setState(() {
      _busyDays.insert(0, const BusyTime(day: 1, start: '', end: ''));
      _error = null;
    });
  }

  void _updateBusyTime(int index, BusyTime value) {
    setState(() {
      _busyDays[index] = value;
      _error = null;
    });
  }

  Future<void> _pickBusyTime(int index, {required bool isStart}) async {
    final item = _busyDays[index];
    final current = isStart ? item.start : item.end;
    final picked = await _pickTime(
      current.isEmpty ? (isStart ? '08:00' : '09:00') : current,
    );
    if (picked == null || !mounted || index >= _busyDays.length) return;
    final latest = _busyDays[index];
    _updateBusyTime(
      index,
      BusyTime(
        day: latest.day,
        start: isStart ? picked : latest.start,
        end: isStart ? latest.end : picked,
      ),
    );
  }

  String? get _workingTimeError {
    if (_startTime == null || _endTime == null) return null;
    if (_startTime!.compareTo(_endTime!) >= 0) {
      return 'เวลาสิ้นสุดการทำงานต้องมากกว่าเวลาเริ่มทำงาน';
    }
    return null;
  }

  ({int? value, bool valid}) _durationValue(
    TextEditingController hoursController,
    TextEditingController minutesController,
  ) {
    final hoursText = hoursController.text.trim();
    final minutesText = minutesController.text.trim();
    if (hoursText.isEmpty && minutesText.isEmpty) {
      return (value: null, valid: true);
    }

    final hours = int.tryParse(hoursText.isEmpty ? '0' : hoursText);
    final minutes = int.tryParse(minutesText.isEmpty ? '0' : minutesText);
    if (hours == null ||
        minutes == null ||
        hours < 0 ||
        minutes < 0 ||
        minutes > 59) {
      return (value: null, valid: false);
    }
    return (value: hours * 60 + minutes, valid: true);
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
    if (_workingTimeError != null) {
      setState(() => _error = _workingTimeError);
      return;
    }
    final invalidBusyTimeIndex = _busyDays.indexWhere(
      (item) =>
          item.start.isEmpty ||
          item.end.isEmpty ||
          item.start.compareTo(item.end) >= 0,
    );
    if (invalidBusyTimeIndex >= 0) {
      setState(() {
        _activePanel = _EditProfilePanel.constraint;
        _error =
            'กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุดของรายการที่ ${invalidBusyTimeIndex + 1} ให้ครบ โดยเวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด';
      });
      return;
    }
    final workingDuration = _durationValue(_workingHours, _workingMinutes);
    final breakDuration = _durationValue(_breakHours, _breakMinutes);
    if (!workingDuration.valid || !breakDuration.valid) {
      setState(
        () => _error = 'กรุณาระบุชั่วโมงตั้งแต่ 0 ขึ้นไป และนาทีระหว่าง 0–59',
      );
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
            continuousWorkingDuration: workingDuration.value,
            breakDuration: breakDuration.value,
            startTime: _startTime,
            endTime: _endTime,
            busyDays: _busyDays,
          ),
        ),
        if (_pendingPhotoBytes != null && _pendingPhotoName != null)
          widget.repository.updateAvatar(
            bytes: _pendingPhotoBytes!,
            filename: _pendingPhotoName!,
          )
        else
          Future<String?>.value(null),
      ]);
      if (!mounted) return;
      final updatedProfile = results[0] as UserProfile;
      final imageUrl = results[2] as String?;
      Navigator.pop(context, (
        profile: imageUrl == null
            ? updatedProfile
            : UserProfile(
                userId: updatedProfile.userId,
                userName: updatedProfile.userName,
                userPicUrl: imageUrl,
                birthdate: updatedProfile.birthdate,
                gender: updatedProfile.gender,
                academicYear: updatedProfile.academicYear,
              ),
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
    final workingTimeError = _workingTimeError;
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
            _EditHeader(
              name: widget.profile.userName,
              photoUrl: widget.profile.userPicUrl,
              pendingPhotoBytes: _pendingPhotoBytes,
              saving: _saving,
              onPickPhoto: _pickProfilePhoto,
              onSave: _save,
              onCancel: () => Navigator.pop(context),
            ),
            _EditTabs(
              activePanel: _activePanel,
              onChanged: (panel) => setState(() => _activePanel = panel),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_activePanel == _EditProfilePanel.profile) ...[
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
                          AppDropdownItem(
                            value: 'male',
                            label: 'Male',
                            accentColor: Color(0xFF73B6DD),
                            borderColor: Color(0xFFBBDEF4),
                          ),
                          AppDropdownItem(
                            value: 'female',
                            label: 'Female',
                            accentColor: Color(0xFFDE7898),
                            borderColor: Color(0xFFF5B8CA),
                          ),
                          AppDropdownItem(
                            value: 'other',
                            label: 'Other',
                            accentColor: Color(0xFFAE79C8),
                            borderColor: Color(0xFFD8B8E8),
                          ),
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
                        icon: Icons.calendar_month_rounded,
                        iconColor: const Color(0xFFF080A7),
                      ),
                      const SizedBox(height: 18),
                    ] else ...[
                      const _SectionTitle('ข้อจำกัดการจัดตาราง'),
                      _SelectField<int>(
                        label: 'วันหยุด',
                        value: _dayOff,
                        items: List.generate(
                          7,
                          (index) => AppDropdownItem(
                            value: index + 1,
                            label: _dayNames[index],
                            accentColor: _dayColors[index],
                            borderColor: _dayBorderColors[index],
                          ),
                        ),
                        onChanged: (value) => setState(() => _dayOff = value),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _DurationFields(
                              label: 'ระยะเวลาทำงาน',
                              hoursController: _workingHours,
                              minutesController: _workingMinutes,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _DurationFields(
                              label: 'ระยะเวลาพัก',
                              hoursController: _breakHours,
                              minutesController: _breakMinutes,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _ValueButton(
                              key: const Key('profile-working-start-time'),
                              label: 'เวลาเริ่มทำงาน',
                              value: _startTime ?? 'ไม่ระบุ',
                              hasError: workingTimeError != null,
                              onTap: () async {
                                final value = await _pickTime(_startTime);
                                if (value != null && mounted) {
                                  setState(() {
                                    _startTime = value;
                                    _error = null;
                                  });
                                }
                              },
                              icon: Icons.access_time_rounded,
                              iconColor: const Color(0xFF74B88A),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _ValueButton(
                              key: const Key('profile-working-end-time'),
                              label: 'เวลาสิ้นสุด',
                              value: _endTime ?? 'ไม่ระบุ',
                              hasError: workingTimeError != null,
                              onTap: () async {
                                final value = await _pickTime(_endTime);
                                if (value != null && mounted) {
                                  setState(() {
                                    _endTime = value;
                                    _error = null;
                                  });
                                }
                              },
                              icon: Icons.access_time_rounded,
                              iconColor: const Color(0xFF74B88A),
                            ),
                          ),
                        ],
                      ),
                      if (workingTimeError != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          workingTimeError,
                          key: const Key('profile-working-time-error'),
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFFD65D69),
                          ),
                        ),
                      ],
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
                          FilledButton.icon(
                            key: const Key('add-profile-busy-time'),
                            onPressed: _addBusyTime,
                            icon: const Icon(Icons.add_rounded, size: 16),
                            label: const Text('Add'),
                            style: FilledButton.styleFrom(
                              foregroundColor: const Color(0xFF314553),
                              backgroundColor: const Color(0xFFC7E8F8),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 7,
                              ),
                              visualDensity: VisualDensity.compact,
                              shape: const StadiumBorder(),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_busyDays.isEmpty)
                        const Text(
                          'ไม่มีวันเวลาไม่ว่างประจำ',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      for (
                        var index = 0;
                        index < _busyDays.length;
                        index++
                      ) ...[
                        _BusyTimeEditor(
                          key: ValueKey('profile-busy-time-$index'),
                          item: _busyDays[index],
                          index: index,
                          onDayChanged: (day) {
                            final item = _busyDays[index];
                            _updateBusyTime(
                              index,
                              BusyTime(
                                day: day,
                                start: item.start,
                                end: item.end,
                              ),
                            );
                          },
                          onStartTap: () => _pickBusyTime(index, isStart: true),
                          onEndTap: () => _pickBusyTime(index, isStart: false),
                          onDelete: () =>
                              setState(() => _busyDays.removeAt(index)),
                        ),
                        const SizedBox(height: 10),
                      ],
                    ],
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
          ],
        ),
      ),
    );
  }
}

class _EditHeader extends StatelessWidget {
  final String name;
  final String? photoUrl;
  final Uint8List? pendingPhotoBytes;
  final bool saving;
  final VoidCallback onPickPhoto;
  final VoidCallback onSave;
  final VoidCallback onCancel;

  const _EditHeader({
    required this.name,
    required this.photoUrl,
    required this.pendingPhotoBytes,
    required this.saving,
    required this.onPickPhoto,
    required this.onSave,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) => Container(
    color: const Color(0xFFC7E8F8),
    padding: const EdgeInsets.fromLTRB(20, 22, 10, 18),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 92,
          height: 92,
          child: Stack(
            children: [
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                  gradient:
                      pendingPhotoBytes == null &&
                          (photoUrl == null || photoUrl!.isEmpty)
                      ? const LinearGradient(
                          colors: [Color(0xFFFFD6E5), Color(0xFFB9DDF6)],
                        )
                      : null,
                  image: pendingPhotoBytes != null
                      ? DecorationImage(
                          image: MemoryImage(pendingPhotoBytes!),
                          fit: BoxFit.cover,
                        )
                      : photoUrl == null || photoUrl!.isEmpty
                      ? null
                      : DecorationImage(
                          image: NetworkImage(photoUrl!),
                          fit: BoxFit.cover,
                        ),
                ),
                child:
                    pendingPhotoBytes == null &&
                        (photoUrl == null || photoUrl!.isEmpty)
                    ? const Icon(
                        Icons.person_outline_rounded,
                        color: Colors.white,
                        size: 46,
                      )
                    : null,
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: IconButton.filled(
                  key: const Key('edit-profile-photo-button'),
                  tooltip: 'เปลี่ยนรูปโปรไฟล์',
                  onPressed: saving ? null : onPickPhoto,
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF314553),
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white, width: 2),
                  ),
                  icon: const Icon(Icons.camera_alt_outlined, size: 18),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Sansation',
                  fontSize: 19,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              _EditHeaderAction(
                key: const Key('save-profile-button'),
                icon: Icons.save_outlined,
                label: saving ? 'Saving...' : 'Save Changes',
                onPressed: saving ? null : onSave,
              ),
              _EditHeaderAction(
                icon: Icons.close_rounded,
                label: 'Cancel',
                onPressed: saving ? null : onCancel,
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: saving ? null : onCancel,
          icon: const Icon(Icons.close_rounded, size: 28),
          color: const Color(0xFF314553),
        ),
      ],
    ),
  );
}

class _EditHeaderAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  const _EditHeaderAction({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onPressed,
    borderRadius: BorderRadius.circular(18),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 19, color: const Color(0xFF314553)),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, color: Color(0xFF314553)),
            ),
          ),
        ],
      ),
    ),
  );
}

class _EditTabs extends StatelessWidget {
  final _EditProfilePanel activePanel;
  final ValueChanged<_EditProfilePanel> onChanged;

  const _EditTabs({required this.activePanel, required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
    color: const Color(0xFFC7E8F8),
    child: Row(
      children: [
        Expanded(
          child: _EditTab(
            key: const Key('edit-profile-tab'),
            icon: Icons.person_outline_rounded,
            label: 'Profile',
            selected: activePanel == _EditProfilePanel.profile,
            onTap: () => onChanged(_EditProfilePanel.profile),
          ),
        ),
        Expanded(
          child: _EditTab(
            key: const Key('edit-constraint-tab'),
            icon: Icons.menu_book_outlined,
            label: 'Constraint',
            selected: activePanel == _EditProfilePanel.constraint,
            onTap: () => onChanged(_EditProfilePanel.constraint),
          ),
        ),
      ],
    ),
  );
}

class _EditTab extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _EditTab({
    super.key,
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xFFF3FBFF) : const Color(0xFFE5E7EB),
    borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
    child: InkWell(
      onTap: onTap,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
      child: SizedBox(
        height: 44,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: const Color(0xFF314553)),
            const SizedBox(width: 6),
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF314553),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _BusyTimeEditor extends StatelessWidget {
  final BusyTime item;
  final int index;
  final ValueChanged<int> onDayChanged;
  final VoidCallback onStartTap;
  final VoidCallback onEndTap;
  final VoidCallback onDelete;

  const _BusyTimeEditor({
    super.key,
    required this.item,
    required this.index,
    required this.onDayChanged,
    required this.onStartTap,
    required this.onEndTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final invalid =
        item.start.isNotEmpty &&
        item.end.isNotEmpty &&
        item.start.compareTo(item.end) >= 0;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xCCFFFFFF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: invalid ? const Color(0xFFE97A8D) : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: AppDropdown<int>(
                  value: item.day,
                  items: List.generate(
                    7,
                    (dayIndex) => AppDropdownItem(
                      value: dayIndex + 1,
                      label: _dayNames[dayIndex],
                      accentColor: _dayColors[dayIndex],
                      borderColor: _dayBorderColors[dayIndex],
                    ),
                  ),
                  onChanged: (day) {
                    if (day != null) onDayChanged(day);
                  },
                  fieldHeight: 38,
                  itemHeight: 40,
                  maxMenuHeight: 320,
                  borderRadius: 19,
                ),
              ),
              IconButton(
                tooltip: 'ลบรายการที่ ${index + 1}',
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline_rounded, size: 19),
                color: const Color(0xFFE65D84),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _BusyTimeButton(
                  key: Key('profile-busy-start-$index'),
                  value: item.start,
                  hint: 'เริ่ม',
                  onTap: onStartTap,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _BusyTimeButton(
                  key: Key('profile-busy-end-$index'),
                  value: item.end,
                  hint: 'สิ้นสุด',
                  onTap: onEndTap,
                ),
              ),
            ],
          ),
          if (invalid) ...[
            const SizedBox(height: 6),
            const Text(
              'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด',
              style: TextStyle(fontSize: 11, color: Color(0xFFD65D69)),
            ),
          ],
        ],
      ),
    );
  }
}

class _BusyTimeButton extends StatelessWidget {
  final String value;
  final String hint;
  final VoidCallback onTap;

  const _BusyTimeButton({
    super.key,
    required this.value,
    required this.hint,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(18),
    child: Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD1D5DB)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              value.isEmpty ? hint : value,
              style: TextStyle(
                fontSize: 12,
                color: value.isEmpty
                    ? const Color(0xFF9CA3AF)
                    : const Color(0xFF374151),
              ),
            ),
          ),
          const Icon(
            Icons.access_time_rounded,
            size: 17,
            color: Color(0xFF74B88A),
          ),
        ],
      ),
    ),
  );
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

class _DurationFields extends StatelessWidget {
  final String label;
  final TextEditingController hoursController;
  final TextEditingController minutesController;

  const _DurationFields({
    required this.label,
    required this.hoursController,
    required this.minutesController,
  });

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
      ),
      const SizedBox(height: 5),
      Row(
        children: [
          Expanded(
            child: _TextField(
              label: 'ชม.',
              controller: hoursController,
              numeric: true,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _TextField(
              label: 'นาที',
              controller: minutesController,
              numeric: true,
            ),
          ),
        ],
      ),
    ],
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
  final List<AppDropdownItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _SelectField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => AppDropdown<T>(
    value: value,
    items: items,
    onChanged: onChanged,
    labelText: label,
    hintText: 'เลือก$label',
    maxMenuHeight: items.length == 7 ? 340 : 280,
  );
}

class _ValueButton extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;
  final IconData icon;
  final Color iconColor;
  final bool hasError;

  const _ValueButton({
    super.key,
    required this.label,
    required this.value,
    required this.onTap,
    required this.icon,
    required this.iconColor,
    this.hasError = false,
  });

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(14),
    child: InputDecorator(
      decoration: _decoration(label, hasError: hasError),
      child: Row(
        children: [
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
          Icon(icon, size: 17, color: iconColor),
        ],
      ),
    ),
  );
}

InputDecoration _decoration(String label, {bool hasError = false}) {
  final borderColor = hasError
      ? const Color(0xFFE97A8D)
      : const Color(0xFF9E9E9E);
  final border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: BorderSide(color: borderColor),
  );

  return InputDecoration(
  labelText: label,
  labelStyle: hasError ? const TextStyle(color: Color(0xFFD65D69)) : null,
  isDense: true,
  filled: true,
  fillColor: Colors.white,
  border: border,
  enabledBorder: border,
  focusedBorder: border.copyWith(
    borderSide: BorderSide(color: borderColor, width: hasError ? 1.5 : 1),
  ),
  );
}

String _formatDate(DateTime value) => formatDisplayDate(value);

const _dayNames = [
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
  'วันอาทิตย์',
];
