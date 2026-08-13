import 'package:flutter/material.dart';

import '../../../common/AppDateTimePicker.dart';
import '../../../common/HomeworkTimeFormat.dart';
import '../../../common/WorkloadTypePalette.dart';
import '../../../interfaces/homework.interface.dart';

Future<HomeworkTaskData?> showHomeworkDetailsPopup(
  BuildContext context, {
  required HomeworkTaskData task,
  required Future<HomeworkTaskData> Function(UpdateHomeworkInput input) onSave,
  required Future<void> Function() onDelete,
}) {
  return showDialog<HomeworkTaskData>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.2),
    builder: (_) =>
        _HomeworkDetailsPopup(task: task, onSave: onSave, onDelete: onDelete),
  );
}

class _HomeworkDetailsPopup extends StatefulWidget {
  final HomeworkTaskData task;
  final Future<HomeworkTaskData> Function(UpdateHomeworkInput input) onSave;
  final Future<void> Function() onDelete;

  const _HomeworkDetailsPopup({
    required this.task,
    required this.onSave,
    required this.onDelete,
  });

  @override
  State<_HomeworkDetailsPopup> createState() => _HomeworkDetailsPopupState();
}

class _HomeworkDetailsPopupState extends State<_HomeworkDetailsPopup> {
  late final TextEditingController _nameController;
  late final TextEditingController _noteController;
  late DateTime _deadline;
  bool _isEditing = false;
  bool _isSaving = false;
  bool _isDeleting = false;
  String? _error;

  HomeworkTaskData get task => widget.task;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: task.assignment);
    _noteController = TextEditingController(text: task.note);
    _deadline = task.deadline;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final picked = await showAppDateTimePicker(
      context: context,
      initialDateTime: _deadline,
      firstDate: DateTime(2000),
      lastDate: DateTime(DateTime.now().year + 10),
    );
    if (picked == null || !mounted) return;
    setState(() {
      _deadline = picked;
      _error = null;
    });
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty || _isSaving) {
      if (name.isEmpty) setState(() => _error = 'กรุณากรอกชื่องาน');
      return;
    }
    setState(() {
      _isSaving = true;
      _error = null;
    });
    try {
      final updated = await widget.onSave(
        UpdateHomeworkInput(
          assignment: name,
          deadline: _deadline,
          note: _noteController.text.trim(),
        ),
      );
      if (mounted) Navigator.of(context).pop(updated);
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = '$error';
          _isSaving = false;
        });
      }
    }
  }

  Future<void> _delete() async {
    if (_isDeleting) return;
    setState(() {
      _isDeleting = true;
      _error = null;
    });
    try {
      await widget.onDelete();
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = '$error';
          _isDeleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = workloadTypePalette(task.workloadTypeName);
    return Dialog(
      key: const Key('homework-details-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 30, vertical: 24),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFBDBDBD)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 300),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _DetailsRow(
                label: 'วิชา :',
                child: _DetailsField(
                  key: const Key('homework-details-subject'),
                  text: task.subject,
                ),
              ),
              const SizedBox(height: 10),
              _DetailsRow(
                label: 'ประเภท :',
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    key: const Key('homework-details-type'),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: palette.normal,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0x4D000000)),
                    ),
                    child: Text(
                      task.workloadTypeName,
                      style: const TextStyle(
                        color: Color(0x99000000),
                        fontSize: 11,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              _DetailsRow(
                label: 'ชื่องาน :',
                child: _isEditing
                    ? _EditTextField(
                        key: const Key('homework-edit-name-field'),
                        controller: _nameController,
                        onChanged: (_) => setState(() => _error = null),
                      )
                    : _DetailsField(
                        key: const Key('homework-details-name'),
                        text: task.assignment,
                      ),
              ),
              const SizedBox(height: 10),
              _DetailsRow(
                label: 'กำหนดส่ง :',
                child: _isEditing
                    ? InkWell(
                        key: const Key('homework-edit-deadline-field'),
                        onTap: _pickDeadline,
                        borderRadius: BorderRadius.circular(14),
                        child: _DetailsField(
                          text: _editedDeadlineText(_deadline),
                          fontSize: 10,
                          trailing: const Icon(
                            Icons.calendar_month_rounded,
                            size: 15,
                            color: Color(0xFF74B88A),
                          ),
                        ),
                      )
                    : _DetailsField(
                        key: const Key('homework-details-deadline'),
                        text: '${task.dueDate} ${task.dueTime}',
                        fontSize: 10,
                      ),
              ),
              const SizedBox(height: 10),
              _DetailsRow(
                label: 'โน้ต :',
                child: _isEditing
                    ? _EditTextField(
                        key: const Key('homework-edit-note-field'),
                        controller: _noteController,
                        hintText: 'รายละเอียดงาน',
                      )
                    : _DetailsField(
                        key: const Key('homework-details-note'),
                        text: task.note.trim().isEmpty
                            ? 'ไม่มีรายละเอียดงาน'
                            : task.note,
                        muted: task.note.trim().isEmpty,
                      ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  key: const Key('homework-edit-error'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFFC85E7A),
                  ),
                ),
              ],
              const SizedBox(height: 25),
              if (_isEditing)
                _SaveHomeworkButton(isSaving: _isSaving, onPressed: _save)
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _PopupActionButton(
                      key: const Key('delete-homework-button'),
                      label: 'ลบ',
                      icon: Icons.delete_outline_rounded,
                      iconKey: const Key('delete-homework-icon'),
                      backgroundColor: const Color(0xFFFFF0F4),
                      foregroundColor: const Color(0xFFC85E7A),
                      borderColor: const Color(0xFFEFA2B5),
                      shadowColor: const Color(0x2EE589A5),
                      isLoading: _isDeleting,
                      onPressed: _delete,
                    ),
                    const SizedBox(width: 12),
                    _PopupActionButton(
                      key: const Key('edit-homework-button'),
                      label: 'แก้ไข',
                      icon: Icons.edit_rounded,
                      iconKey: const Key('edit-homework-icon'),
                      backgroundColor: const Color(0xFFFFF4C7),
                      foregroundColor: const Color(0xFF7C682C),
                      borderColor: const Color(0xFFE2C667),
                      shadowColor: const Color(0x2ED7B94E),
                      onPressed: () => setState(() {
                        _isEditing = true;
                        _error = null;
                      }),
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

class _DetailsRow extends StatelessWidget {
  final String label;
  final Widget child;

  const _DetailsRow({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 72,
          child: Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF333333)),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _DetailsField extends StatelessWidget {
  final String text;
  final double fontSize;
  final bool muted;
  final Widget? trailing;

  const _DetailsField({
    super.key,
    required this.text,
    this.fontSize = 11,
    this.muted = false,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 28,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFCBCBCB)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: fontSize,
                color: muted
                    ? const Color(0xFFB8B8B8)
                    : const Color(0xFF5B5B5B),
              ),
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 4), trailing!],
        ],
      ),
    );
  }
}

class _EditTextField extends StatelessWidget {
  final TextEditingController controller;
  final String? hintText;
  final ValueChanged<String>? onChanged;

  const _EditTextField({
    super.key,
    required this.controller,
    this.hintText,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 30,
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: const TextStyle(fontSize: 11, color: Color(0xFF454545)),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(fontSize: 10, color: Color(0xFFB8B8B8)),
          isDense: true,
          filled: true,
          fillColor: const Color(0xFFFFFEFA),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 11,
            vertical: 7,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Color(0xFFCBCBCB)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Color(0xFF82C9EA), width: 1.3),
          ),
        ),
      ),
    );
  }
}

class _SaveHomeworkButton extends StatelessWidget {
  final bool isSaving;
  final VoidCallback onPressed;

  const _SaveHomeworkButton({required this.isSaving, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: const Key('save-homework-changes-button'),
      width: 122,
      height: 36,
      child: FilledButton(
        onPressed: isSaving ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFE1F6D1),
          foregroundColor: const Color(0xFF4F7041),
          disabledBackgroundColor: const Color(0xFFEAF2E4),
          elevation: 2,
          shadowColor: const Color(0x4094B780),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFF9BCB82), width: 1.1),
          ),
        ),
        child: isSaving
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF4F7041),
                ),
              )
            : const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_rounded, size: 16),
                  SizedBox(width: 5),
                  Text(
                    'บันทึก',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
      ),
    );
  }
}

String _editedDeadlineText(DateTime value) {
  return formatHomeworkDisplayDateTime(value);
}

class _PopupActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Key iconKey;
  final Color backgroundColor;
  final Color foregroundColor;
  final Color borderColor;
  final Color shadowColor;
  final bool isLoading;
  final VoidCallback onPressed;

  const _PopupActionButton({
    super.key,
    required this.label,
    required this.icon,
    required this.iconKey,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.borderColor,
    required this.shadowColor,
    this.isLoading = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: shadowColor,
            blurRadius: 7,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: SizedBox(
        width: 96,
        height: 34,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            backgroundColor: backgroundColor,
            foregroundColor: foregroundColor,
            overlayColor: foregroundColor.withValues(alpha: 0.12),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            side: BorderSide(color: borderColor, width: 1.2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, key: iconKey, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
