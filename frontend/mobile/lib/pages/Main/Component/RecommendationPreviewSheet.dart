// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../common/AppDatePicker.dart';
import '../../../common/AppTimePicker.dart';
import '../../../common/ConstraintOverlapWarning.dart';
import '../../../common/DateTimeFormat.dart';
import '../../../interfaces/profile.interface.dart';
import '../../../interfaces/recommendation.interface.dart';
import '../../../interfaces/table.interface.dart';
import '../../../services/recommendation.service.dart';
import 'Schedule.dart';
import 'WeeklyBlockDetailsPopup.dart';

Future<WeeklyRecommendation?> showRecommendationPreviewSheet(
  BuildContext context, {
  required WeeklyRecommendation recommendation,
  required RecommendationRepository repository,
  UserConstraint? constraint,
}) => showModalBottomSheet<WeeklyRecommendation>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: Colors.transparent,
  builder: (_) => FractionallySizedBox(
    heightFactor: 0.92,
    child: _RecommendationPreviewSheet(
      recommendation: recommendation,
      repository: repository,
      constraint: constraint,
    ),
  ),
);

class _RecommendationPreviewSheet extends StatefulWidget {
  final WeeklyRecommendation recommendation;
  final RecommendationRepository repository;
  final UserConstraint? constraint;

  const _RecommendationPreviewSheet({
    required this.recommendation,
    required this.repository,
    this.constraint,
  });

  @override
  State<_RecommendationPreviewSheet> createState() =>
      _RecommendationPreviewSheetState();
}

class _RecommendationPreviewSheetState
    extends State<_RecommendationPreviewSheet> {
  late WeeklyRecommendation _recommendation;
  AcceptedWeeklySchedule? _schedule;
  bool _loading = true;
  bool _adjusting = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _recommendation = widget.recommendation;
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    try {
      final value = await widget.repository.getWeeklySchedule(
        weekStart: _recommendation.weekStart,
      );
      if (!mounted) return;
      setState(() => _schedule = value);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<_PreviewEntry> get _entries {
    final values = <_PreviewEntry>[];
    for (final block in _schedule?.recurringClasses ?? const []) {
      values.add(
        _PreviewEntry(
          subjectName: block.subjectName,
          scheduleTypeId: 1,
          date: _dateForDay(_recommendation.weekStart, block.scheduleDay),
          startTime: block.startTime,
          endTime: block.endTime,
          classroom: block.classroom,
        ),
      );
    }
    for (final block in _recommendation.blocks) {
      values.add(
        _PreviewEntry(
          subjectName: block.subjectName,
          scheduleTypeId: block.scheduleTypeId,
          date: block.scheduledDate,
          startTime: block.startTime,
          endTime: block.endTime,
          weeklyBlock: block,
        ),
      );
    }
    values.sort((left, right) {
      final date = left.date.compareTo(right.date);
      return date != 0 ? date : left.startTime.compareTo(right.startTime);
    });
    return values;
  }

  List<({String id, String name})> get _subjects {
    final values = <String, String>{};
    for (final item in _recommendation.items) {
      values[item.subjectId] = item.subjectName;
    }
    for (final item in _schedule?.recurringClasses ?? const []) {
      values[item.subjectId] = item.subjectName;
    }
    return values.entries
        .map((entry) => (id: entry.key, name: entry.value))
        .toList();
  }

  Future<void> _editBlock([WeeklyScheduleBlock? block]) async {
    if (_recommendation.status != 'pending') return;
    final result = await showDialog<_EditorResult>(
      context: context,
      builder: (_) => _WeeklyBlockEditorDialog(
        block: block,
        canDelete: _recommendation.status == 'pending',
        subjects: _subjects,
        weekStart: _recommendation.weekStart,
        weekEnd: _recommendation.weekEnd,
        constraint: widget.constraint,
        existingEntries: _entries,
      ),
    );
    if (result == null || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = result.delete && block != null
          ? await widget.repository.deleteBlock(
              _recommendation.recommendationId,
              block.weeklyBlockId,
            )
          : block == null
          ? await widget.repository.addBlock(
              _recommendation.recommendationId,
              result.input!,
            )
          : await widget.repository.updateBlock(
              _recommendation.recommendationId,
              block.weeklyBlockId,
              result.input!,
            );
      if (mounted) {
        setState(() {
          _recommendation = updated;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _accept() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final accepted = await widget.repository.accept(
        _recommendation.recommendationId,
      );
      if (!mounted) return;
      Navigator.of(context).pop(accepted);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final entries = _entries;
    final previewItems = <ScheduleItem>[];
    for (var index = 0; index < entries.length; index++) {
      final entry = entries[index];
      previewItems.add(
        ScheduleItem(
          scheduleTimeId: index + 1,
          scheduleTypeId: entry.scheduleTypeId,
          scheduleTypeName: entry.scheduleTypeId == 1
              ? 'เรียน'
              : entry.scheduleTypeId == 2
              ? 'ทบทวน'
              : 'การบ้าน',
          subjectId: entry.weeklyBlock?.subjectId ?? '',
          subjectName: entry.subjectName,
          scheduleDay: DateTime.parse(entry.date).weekday,
          startTime: entry.startTime,
          endTime: entry.endTime,
          classroom: entry.classroom,
        ),
      );
    }
    return Material(
      color: const Color(0xFFFFFDF5),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            width: 48,
            height: 5,
            margin: const EdgeInsets.only(top: 9),
            decoration: BoxDecoration(
              color: const Color(0xFFD3C7CA),
              borderRadius: BorderRadius.circular(9),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 10, 12),
            child: Row(
              children: [
                const Icon(
                  Icons.calendar_month_rounded,
                  color: Color(0xFF6DA5B8),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _recommendation.status == 'accepted'
                            ? 'ตารางสัปดาห์ที่กำลังใช้งาน'
                            : 'ตัวอย่างตารางสัปดาห์ที่แนะนำ',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Color(0xFF405B69),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '${_displayDate(_recommendation.weekStart)} – ${_displayDate(_recommendation.weekEnd)}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF82939B),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _busy
                      ? null
                      : () => Navigator.pop(context, _recommendation),
                  icon: const Icon(
                    Icons.close_rounded,
                    color: Color(0xFFD85E82),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE9DDE1)),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                : ListView(
                    key: const Key('recommendation-preview-list'),
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
                    children: [
                      if (const bool.fromEnvironment(
                            'ENABLE_MANUAL_SCHEDULE_ADD',
                          ) &&
                          _adjusting)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: OutlinedButton.icon(
                            key: const Key('recommendation-add-block'),
                            onPressed: _busy || _subjects.isEmpty
                                ? null
                                : () => _editBlock(),
                            icon: const Icon(Icons.add_rounded, size: 18),
                            label: const Text('เพิ่มบล็อกเวลา'),
                          ),
                        ),
                      if (entries.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Text(
                            'ยังไม่มีบล็อกเวลาในตัวอย่างนี้',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF7A8C94),
                            ),
                          ),
                        ),
                      if (entries.isNotEmpty)
                        SizedBox(
                          height: 408,
                          child: WeeklyScheduleGrid(
                            items: previewItems,
                            onSelect: (item) {
                              final block =
                                  entries[item.scheduleTimeId - 1].weeklyBlock;
                              if (block == null) return;
                              if (_recommendation.status == 'accepted') {
                                showWeeklyBlockDetailsPopup(
                                  context,
                                  block: block,
                                );
                              } else if (_adjusting) {
                                _editBlock(block);
                              }
                            },
                          ),
                        ),
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(
                          _adjusting
                              ? 'กดบล็อกเวลาเพื่อย้าย เปลี่ยนเวลา หรือลบ'
                              : _recommendation.status == 'accepted'
                              ? 'ตารางนี้กำลังใช้งานอยู่ กดบล็อกเพื่อดูรายละเอียด'
                              : 'ตารางนี้ยังเป็นตัวอย่าง จนกว่าจะกดยอมรับคำแนะนำ',
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF74878F),
                          ),
                        ),
                      ),
                      if (_recommendation.items.any(
                        (item) => item.capacityLimited,
                      ))
                        _Notice(
                          text: _recommendation.status == 'accepted'
                              ? 'เวลาว่างไม่พอจัดครบทุกเป้าหมาย'
                              : 'เวลาว่างไม่พอจัดครบทุกเป้าหมาย คุณสามารถปรับตารางก่อนยอมรับได้',
                          color: const Color(0xFFFFF4D8),
                        ),
                      if (_error != null)
                        _Notice(text: _error!, color: const Color(0xFFFFE9EC)),
                    ],
                  ),
          ),
          if (_recommendation.status == 'pending')
            Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE9DDE1))),
              ),
              child: Row(
                children: [
                  if (_recommendation.status == 'pending')
                    Expanded(
                      child: OutlinedButton.icon(
                        key: const Key('recommendation-adjust-button'),
                        onPressed: _busy
                            ? null
                            : () => setState(() => _adjusting = !_adjusting),
                        icon: const Icon(Icons.edit_calendar_rounded, size: 17),
                        label: Text(
                          _adjusting ? 'เสร็จสิ้นการปรับ' : 'ปรับตารางก่อนใช้',
                        ),
                      ),
                    ),
                  if (_recommendation.status == 'pending') ...[
                    const SizedBox(width: 9),
                    Expanded(
                      child: FilledButton(
                        key: const Key('recommendation-preview-accept'),
                        onPressed: _busy ? null : _accept,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF71A982),
                        ),
                        child: Text(_busy ? 'กำลังบันทึก...' : 'ยอมรับคำแนะนำ'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _WeeklyBlockEditorDialog extends StatefulWidget {
  final WeeklyScheduleBlock? block;
  final bool canDelete;
  final List<({String id, String name})> subjects;
  final String weekStart;
  final String weekEnd;
  final UserConstraint? constraint;
  final List<_PreviewEntry> existingEntries;

  const _WeeklyBlockEditorDialog({
    this.block,
    required this.canDelete,
    required this.subjects,
    required this.weekStart,
    required this.weekEnd,
    this.constraint,
    required this.existingEntries,
  });

  @override
  State<_WeeklyBlockEditorDialog> createState() =>
      _WeeklyBlockEditorDialogState();
}

class _WeeklyBlockEditorDialogState extends State<_WeeklyBlockEditorDialog> {
  late String _subjectId;
  late int _scheduleTypeId;
  late DateTime _date;
  late TimeOfDay _start;
  late TimeOfDay _end;
  String? _error;

  @override
  void initState() {
    super.initState();
    final block = widget.block;
    _subjectId =
        block?.subjectId ??
        (widget.subjects.isEmpty ? '' : widget.subjects.first.id);
    _scheduleTypeId = block?.scheduleTypeId ?? 2;
    _date =
        DateTime.tryParse(block?.scheduledDate ?? widget.weekStart) ??
        DateTime.now();
    _start = _parseTime(block?.startTime ?? '18:00');
    _end = _parseTime(block?.endTime ?? '19:00');
  }

  Future<void> _pickDate() async {
    final value = await showAppDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.parse(widget.weekStart),
      lastDate: DateTime.parse(widget.weekEnd),
      title: 'เลือกวันที่ของบล็อกเวลา',
    );
    if (value != null) setState(() => _date = value);
  }

  Future<void> _pickTime(bool start) async {
    final value = await showAppTimePicker(
      context: context,
      initialTime: start ? _start : _end,
      title: start ? 'เลือกเวลาเริ่ม' : 'เลือกเวลาสิ้นสุด',
    );
    if (value == null) return;
    setState(() {
      if (start) {
        _start = value;
      } else {
        _end = value;
      }
    });
  }

  Future<void> _save() async {
    final startMinutes = _start.hour * 60 + _start.minute;
    final endMinutes = _end.hour * 60 + _end.minute;
    if (_subjectId.isEmpty || startMinutes >= endMinutes) {
      setState(() => _error = 'เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด');
      return;
    }
    final date = _dateKey(_date);
    for (final entry in widget.existingEntries) {
      if ((widget.block != null &&
              entry.weeklyBlock?.weeklyBlockId ==
                  widget.block!.weeklyBlockId) ||
          entry.date != date) {
        continue;
      }
      final entryStart = _parseTime(entry.startTime);
      final entryEnd = _parseTime(entry.endTime);
      if (startMinutes < entryEnd.hour * 60 + entryEnd.minute &&
          endMinutes > entryStart.hour * 60 + entryStart.minute) {
        setState(
          () => _error =
              'เวลานี้ทับกับ ${entry.subjectName} (${_shortTime(entry.startTime)}–${_shortTime(entry.endTime)})',
        );
        return;
      }
    }
    final conflict = findConstraintOverlap(
      widget.constraint,
      scheduleDay: _date.weekday,
      startTime: _timeKey(_start),
      endTime: _timeKey(_end),
    );
    var allowConstraintOverlap = false;
    if (conflict != null) {
      final confirmed = await showConstraintOverlapWarning(context, conflict);
      if (!confirmed || !mounted) return;
      allowConstraintOverlap = true;
    }
    Navigator.pop(
      context,
      _EditorResult(
        input: WeeklyBlockInput(
          subjectId: _subjectId,
          scheduleTypeId: _scheduleTypeId,
          scheduledDate: date,
          startTime: _timeKey(_start),
          endTime: _timeKey(_end),
          allowConstraintOverlap: allowConstraintOverlap,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.block == null ? 'เพิ่มบล็อกเวลา' : 'ปรับบล็อกเวลา'),
    content: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.block == null) ...[
            DropdownButtonFormField<String>(
              initialValue: _subjectId,
              decoration: const InputDecoration(labelText: 'รายวิชา'),
              items: widget.subjects
                  .map(
                    (subject) => DropdownMenuItem(
                      value: subject.id,
                      child: Text(subject.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _subjectId = value ?? ''),
            ),
            DropdownButtonFormField<int>(
              initialValue: _scheduleTypeId,
              decoration: const InputDecoration(labelText: 'ประเภทเวลา'),
              items: const [
                DropdownMenuItem(value: 2, child: Text('ทบทวน')),
                DropdownMenuItem(value: 3, child: Text('ทำการบ้าน')),
              ],
              onChanged: (value) =>
                  setState(() => _scheduleTypeId = value ?? 2),
            ),
          ],
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('วันที่'),
            subtitle: Text(
              '${_weekday(_dateKey(_date))} ${formatDisplayDate(_date)}',
            ),
            trailing: const Icon(Icons.calendar_today_rounded),
            onTap: _pickDate,
          ),
          Row(
            children: [
              Expanded(
                child: _TimeButton(
                  label: 'เริ่ม',
                  time: _start,
                  onTap: () => _pickTime(true),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _TimeButton(
                  label: 'สิ้นสุด',
                  time: _end,
                  onTap: () => _pickTime(false),
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(color: Colors.red, fontSize: 11),
            ),
          ],
        ],
      ),
    ),
    actions: [
      if (widget.block != null && widget.canDelete)
        TextButton(
          onPressed: () =>
              Navigator.pop(context, const _EditorResult(delete: true)),
          child: const Text(
            'ลบบล็อก',
            style: TextStyle(color: Color(0xFFC55369)),
          ),
        ),
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('ยกเลิก'),
      ),
      FilledButton(onPressed: _save, child: const Text('บันทึก')),
    ],
  );
}

class _TimeButton extends StatelessWidget {
  final String label;
  final TimeOfDay time;
  final VoidCallback onTap;

  const _TimeButton({
    required this.label,
    required this.time,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) =>
      OutlinedButton(onPressed: onTap, child: Text('$label ${_timeKey(time)}'));
}

class _Notice extends StatelessWidget {
  final String text;
  final Color color;

  const _Notice({required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 8),
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 10.5, color: Color(0xFF6E6064)),
    ),
  );
}

class _PreviewEntry {
  final String subjectName;
  final int scheduleTypeId;
  final String date;
  final String startTime;
  final String endTime;
  final String? classroom;
  final WeeklyScheduleBlock? weeklyBlock;

  const _PreviewEntry({
    required this.subjectName,
    required this.scheduleTypeId,
    required this.date,
    required this.startTime,
    required this.endTime,
    this.classroom,
    this.weeklyBlock,
  });
}

class _EditorResult {
  final WeeklyBlockInput? input;
  final bool delete;

  const _EditorResult({this.input, this.delete = false});
}

String _dateForDay(String weekStart, int day) =>
    _dateKey(DateTime.parse(weekStart).add(Duration(days: day - 1)));

String _dateKey(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

String _timeKey(TimeOfDay value) =>
    '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';

String _shortTime(String value) => value.split(':').take(2).join(':');

TimeOfDay _parseTime(String value) {
  final parts = value.split(':').map((part) => int.tryParse(part)).toList();
  return TimeOfDay(
    hour: parts.isEmpty ? 0 : parts.first ?? 0,
    minute: parts.length > 1 ? parts[1] ?? 0 : 0,
  );
}

String _displayDate(String value) {
  final date = DateTime.tryParse(value);
  return date == null ? value : formatDisplayDate(date);
}

String _weekday(String value) {
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  return const [
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสบดี',
    'ศุกร์',
    'เสาร์',
    'อาทิตย์',
  ][date.weekday - 1];
}
