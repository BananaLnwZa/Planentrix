import 'package:flutter/material.dart';

import '../../../common/AppDateTimePicker.dart';
import '../../../common/AppDropdown.dart';
import '../../../common/HomeworkTimeFormat.dart';
import '../../../common/WorkloadTypePalette.dart';
import '../../../interfaces/homework.interface.dart';

Future<CreateHomeworkInput?> showAddHomeworkPopup(
  BuildContext context, {
  required List<HomeworkSubject> subjects,
}) {
  return showDialog<CreateHomeworkInput>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.28),
    builder: (_) => _AddHomeworkPopup(subjects: subjects),
  );
}

class _AddHomeworkPopup extends StatefulWidget {
  final List<HomeworkSubject> subjects;

  const _AddHomeworkPopup({required this.subjects});

  @override
  State<_AddHomeworkPopup> createState() => _AddHomeworkPopupState();
}

class _AddHomeworkPopupState extends State<_AddHomeworkPopup> {
  final _assignmentController = TextEditingController();
  final _noteController = TextEditingController();
  HomeworkSubject? _subject;
  HomeworkTypeOption? _type;
  DateTime? _deadline;
  String? _validationMessage;

  @override
  void dispose() {
    _assignmentController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final now = DateTime.now();
    final picked = await showAppDateTimePicker(
      context: context,
      initialDateTime: _deadline ?? now,
      firstDate: DateTime(2000),
      lastDate: DateTime(now.year + 10),
    );
    if (picked == null || !mounted) return;
    setState(() {
      _deadline = picked;
      _validationMessage = null;
    });
  }

  void _save() {
    final assignment = _assignmentController.text.trim();
    if (_subject == null ||
        _type == null ||
        assignment.isEmpty ||
        _deadline == null) {
      setState(() {
        _validationMessage = 'กรุณากรอกวิชา ประเภท ชื่องาน และกำหนดส่งให้ครบ';
      });
      return;
    }
    Navigator.of(context).pop(
      CreateHomeworkInput(
        subject: _subject!,
        type: _type!,
        assignment: assignment,
        deadline: _deadline!,
        note: _noteController.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('add-homework-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFB9B9B9)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 390),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 25, 18, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _LabeledField(
                label: 'วิชา :',
                child: AppDropdown<int>(
                  key: const Key('homework-subject-field'),
                  value: _subject?.scheduleTimeId,
                  hintText: 'เลือกวิชา',
                  items: widget.subjects
                      .map(
                        (subject) => AppDropdownItem(
                          value: subject.scheduleTimeId,
                          label: subject.subjectName,
                        ),
                      )
                      .toList(),
                  onChanged: (id) {
                    setState(() {
                      _subject = widget.subjects
                          .where((item) => item.scheduleTimeId == id)
                          .firstOrNull;
                      _validationMessage = null;
                    });
                  },
                  fieldHeight: 42,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(
                    width: 76,
                    child: Padding(
                      padding: EdgeInsets.only(top: 7),
                      child: Text('ประเภท :', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                  Expanded(
                    child: Wrap(
                      spacing: 5,
                      runSpacing: 8,
                      children: [
                        for (
                          var index = 0;
                          index < homeworkTypeOptions.length;
                          index++
                        )
                          _HomeworkTypeChoice(
                            option: homeworkTypeOptions[index],
                            palette: workloadTypePalette(
                              homeworkTypeOptions[index].name,
                            ),
                            selected:
                                _type?.id == homeworkTypeOptions[index].id,
                            onSelected: () {
                              setState(() {
                                _type = homeworkTypeOptions[index];
                                _validationMessage = null;
                              });
                            },
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _LabeledField(
                label: 'ชื่องาน :',
                child: TextField(
                  key: const Key('homework-name-field'),
                  controller: _assignmentController,
                  decoration: _fieldDecoration(hintText: 'ชื่องาน'),
                  onChanged: (_) => setState(() => _validationMessage = null),
                ),
              ),
              const SizedBox(height: 12),
              _LabeledField(
                label: 'กำหนดส่ง :',
                child: InkWell(
                  key: const Key('homework-deadline-field'),
                  onTap: _pickDeadline,
                  borderRadius: BorderRadius.circular(22),
                  child: InputDecorator(
                    decoration: _fieldDecoration(
                      suffixIcon: const Icon(
                        Icons.calendar_month_rounded,
                        color: Color(0xFF74B88A),
                      ),
                    ),
                    child: Text(
                      _deadline == null
                          ? 'date & time'
                          : _deadlineText(_deadline!),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: _deadline == null
                            ? const Color(0xFFB2B2B2)
                            : const Color(0xFF4F5960),
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _LabeledField(
                label: 'โน้ต :',
                child: TextField(
                  key: const Key('homework-note-field'),
                  controller: _noteController,
                  maxLines: 1,
                  decoration: _fieldDecoration(hintText: 'รายละเอียดงาน'),
                ),
              ),
              if (_validationMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    _validationMessage!,
                    key: const Key('add-homework-validation'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFFC85272),
                      fontSize: 12,
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              SizedBox(
                width: 68,
                height: 40,
                child: FilledButton(
                  key: const Key('save-homework-button'),
                  onPressed: _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFCFF2B4),
                    foregroundColor: const Color(0xFF1E2621),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: const BorderSide(color: Color(0xFF9EC584)),
                    ),
                  ),
                  child: const Icon(Icons.check_rounded, size: 27),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  final String label;
  final Widget child;

  const _LabeledField({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 76,
          child: Text(label, style: const TextStyle(fontSize: 16)),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _HomeworkTypeChoice extends StatefulWidget {
  final HomeworkTypeOption option;
  final WorkloadTypePalette palette;
  final bool selected;
  final VoidCallback onSelected;

  const _HomeworkTypeChoice({
    required this.option,
    required this.palette,
    required this.selected,
    required this.onSelected,
  });

  @override
  State<_HomeworkTypeChoice> createState() => _HomeworkTypeChoiceState();
}

class _HomeworkTypeChoiceState extends State<_HomeworkTypeChoice> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final emphasized = widget.selected || _hovered;
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      cursor: SystemMouseCursors.click,
      child: InkWell(
        key: Key('homework-type-${widget.option.id}'),
        onTap: widget.onSelected,
        borderRadius: BorderRadius.circular(18),
        hoverColor: Colors.transparent,
        splashColor: Colors.white.withValues(alpha: 0.18),
        child: AnimatedContainer(
          key: Key('homework-type-surface-${widget.option.id}'),
          duration: const Duration(milliseconds: 140),
          constraints: const BoxConstraints(minWidth: 76),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: emphasized ? widget.palette.hover : widget.palette.normal,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: widget.selected
                  ? const Color(0xFF527383)
                  : _hovered
                  ? Colors.white.withValues(alpha: 0.5)
                  : Colors.black.withValues(alpha: 0.3),
              width: widget.selected ? 1.5 : 1,
            ),
            boxShadow: widget.selected
                ? const [
                    BoxShadow(
                      color: Color(0x26000000),
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            widget.option.name,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: Color(0x99000000)),
          ),
        ),
      ),
    );
  }
}

InputDecoration _fieldDecoration({String? hintText, Widget? suffixIcon}) {
  return InputDecoration(
    hintText: hintText,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
    suffixIcon: suffixIcon,
    suffixIconConstraints: const BoxConstraints(minWidth: 42, minHeight: 38),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: Color(0xFFC5C5C5)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: Color(0xFF82C9EA), width: 1.5),
    ),
  );
}

String _deadlineText(DateTime value) {
  return formatHomeworkDisplayDateTime(value);
}
