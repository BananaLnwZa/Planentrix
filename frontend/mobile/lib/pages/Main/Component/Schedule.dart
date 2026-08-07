// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../interfaces/table.interface.dart';
import '../../../services/table.service.dart';
import 'AddSchedulePopup.dart';
import 'ScheduleDetailsPopup.dart';

class Schedule extends StatefulWidget {
  final TableRepository? repository;

  const Schedule({super.key, this.repository});

  @override
  State<Schedule> createState() => _ScheduleState();
}

class _ScheduleState extends State<Schedule> {
  late final TableRepository _repository;
  List<ScheduleItem> _items = const [];
  bool _loading = true;
  bool _loadingDetail = false;
  bool _hasCurrentTerm = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? TableService();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final response = await _repository.getCurrentSchedule();
      if (!mounted) return;
      setState(() {
        _items = response?.items ?? const [];
        _hasCurrentTerm = response != null;
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectItem(ScheduleItem item) async {
    if (_loadingDetail) return;
    setState(() {
      _loadingDetail = true;
      _error = null;
    });
    try {
      final detail = await _repository.getScheduleDetail(item.scheduleTimeId);
      if (!mounted) return;
      setState(() => _loadingDetail = false);
      await showScheduleDetailsPopup(
        context,
        item: detail,
        onSave: (input) async {
          await _repository.updateSchedule(detail.scheduleTimeId, input);
          final updated = await _repository.getScheduleDetail(
            detail.scheduleTimeId,
          );
          if (mounted) {
            setState(() {
              _items = _items
                  .map(
                    (current) =>
                        current.scheduleTimeId == updated.scheduleTimeId
                        ? updated
                        : current,
                  )
                  .toList();
            });
          }
          return updated;
        },
        onDelete: () async {
          await _repository.deleteSchedule(detail.scheduleTimeId);
          if (mounted) {
            setState(() {
              _items = _items
                  .where(
                    (current) =>
                        current.scheduleTimeId != detail.scheduleTimeId,
                  )
                  .toList();
            });
          }
        },
      );
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loadingDetail = false);
    }
  }

  Future<void> _openAdd() async {
    if (!_hasCurrentTerm || _loading) return;
    setState(() {
      _loadingDetail = true;
      _error = null;
    });
    try {
      final subjects = await _repository.getCurrentTermSubjects();
      if (!mounted) return;
      setState(() => _loadingDetail = false);
      final input = await showAddSchedulePopup(
        context,
        subjects: subjects,
        scheduleItems: _items,
      );
      if (input == null || !mounted) return;
      setState(() => _loadingDetail = true);
      await _repository.addSchedule(input);
      await _loadSchedule();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loadingDetail = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: const Key('schedule'),
      width: double.infinity,
      height: 470,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _ScheduleTitle(),
          const SizedBox(height: 7),
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(
                  child: _ScheduleGrid(items: _items, onSelect: _selectItem),
                ),
                if (_loading || _loadingDetail)
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.68),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircularProgressIndicator(strokeWidth: 2),
                            const SizedBox(height: 8),
                            Text(
                              _loading
                                  ? 'กำลังโหลดตารางเวลา...'
                                  : 'กำลังเปิดข้อมูล...',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF6A8795),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (!_loading && _error == null && _items.isEmpty)
                  const Positioned(
                    left: 15,
                    right: 15,
                    top: 55,
                    child: _EmptySchedule(),
                  ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: Tooltip(
                    message: _hasCurrentTerm
                        ? 'เพิ่มบล็อกเวลา'
                        : 'กรุณาสร้างเทอมก่อน',
                    child: FloatingActionButton.small(
                      key: const Key('add-schedule-button'),
                      heroTag: 'add-schedule',
                      onPressed: _loading || !_hasCurrentTerm ? null : _openAdd,
                      backgroundColor: _hasCurrentTerm
                          ? const Color(0xFFF58BC2)
                          : const Color(0xFFC9D4D9),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Colors.white, width: 2),
                      ),
                      child: const Icon(Icons.add_rounded, size: 28),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 7),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0F1),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: const Color(0xFFF3C6CB)),
              ),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10, color: Color(0xFFB84E5C)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ScheduleTitle extends StatelessWidget {
  const _ScheduleTitle();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(horizontal: 3),
    child: Row(
      children: [
        Expanded(
          child: Text(
            'ตารางเวลาประจำสัปดาห์',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF52636D),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        _Legend(color: Color(0xFFDDF1C9), label: 'เรียน'),
        SizedBox(width: 5),
        _Legend(color: Color(0xFFFFF0BA), label: 'อ่าน'),
        SizedBox(width: 5),
        _Legend(color: Color(0xFFF8D1CD), label: 'งาน'),
      ],
    ),
  );
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;

  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: Colors.black12),
        ),
      ),
      const SizedBox(width: 2),
      Text(
        label,
        style: const TextStyle(fontSize: 8, color: Color(0xFF657780)),
      ),
    ],
  );
}

class _EmptySchedule extends StatelessWidget {
  const _EmptySchedule();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.92),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xFFB9D9E7)),
    ),
    child: const Text(
      'ยังไม่มีข้อมูลตารางเวลาสำหรับเทอมปัจจุบัน',
      textAlign: TextAlign.center,
      style: TextStyle(fontSize: 10, color: Color(0xFF6A8795)),
    ),
  );
}

class _ScheduleGrid extends StatefulWidget {
  final List<ScheduleItem> items;
  final ValueChanged<ScheduleItem> onSelect;

  const _ScheduleGrid({required this.items, required this.onSelect});

  @override
  State<_ScheduleGrid> createState() => _ScheduleGridState();
}

class _ScheduleGridState extends State<_ScheduleGrid> {
  static const _days = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  static const _dayColors = [
    Color(0xFFFFF0B8),
    Color(0xFFFFD7E5),
    Color(0xFFDDF0C7),
    Color(0xFFFFE0C9),
    Color(0xFFD6EBFA),
    Color(0xFFDDDDF8),
    Color(0xFFF8D1CD),
  ];
  static const _startHour = 6;
  static const _endHour = 24;
  static const _rowHeight = 38.0;
  static const _timeWidth = 54.0;
  final ScrollController _verticalController = ScrollController();

  @override
  void dispose() {
    _verticalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final contentWidth = math.max(620.0, constraints.maxWidth);
        final dayWidth = (contentWidth - _timeWidth) / 7;
        return ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SizedBox(
              width: contentWidth,
              height: constraints.maxHeight,
              child: Column(
                children: [
                  _GridHeader(dayWidth: dayWidth),
                  Expanded(
                    child: Scrollbar(
                      controller: _verticalController,
                      thumbVisibility: true,
                      thickness: 3,
                      child: SingleChildScrollView(
                        key: const Key('schedule-time-list'),
                        controller: _verticalController,
                        child: _GridBody(
                          items: widget.items,
                          dayWidth: dayWidth,
                          onSelect: widget.onSelect,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _GridHeader extends StatelessWidget {
  final double dayWidth;

  const _GridHeader({required this.dayWidth});

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('schedule-header'),
    height: 40,
    color: Colors.white,
    child: Row(
      children: [
        Container(
          width: _ScheduleGridState._timeWidth,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            border: Border(right: BorderSide(color: Color(0xFFE2C7D1))),
          ),
          child: const Text(
            'เวลา',
            style: TextStyle(fontSize: 11, color: Color(0xFF426477)),
          ),
        ),
        for (var index = 0; index < 7; index++)
          Container(
            width: dayWidth,
            alignment: Alignment.center,
            color: _ScheduleGridState._dayColors[index],
            child: Text(
              _ScheduleGridState._days[index],
              style: const TextStyle(fontSize: 11, color: Color(0xFF596D78)),
            ),
          ),
      ],
    ),
  );
}

class _GridBody extends StatelessWidget {
  final List<ScheduleItem> items;
  final double dayWidth;
  final ValueChanged<ScheduleItem> onSelect;

  const _GridBody({
    required this.items,
    required this.dayWidth,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    const rowCount =
        _ScheduleGridState._endHour - _ScheduleGridState._startHour;
    final gridHeight = rowCount * _ScheduleGridState._rowHeight;
    return SizedBox(
      width: _ScheduleGridState._timeWidth + dayWidth * 7,
      height: gridHeight,
      child: Stack(
        children: [
          Row(
            children: [
              SizedBox(
                width: _ScheduleGridState._timeWidth,
                child: Column(
                  children: [
                    for (var index = 0; index < rowCount; index++)
                      Container(
                        key: Key(
                          'schedule-time-${_formatHour(index + _ScheduleGridState._startHour).replaceAll(' ', '-').toLowerCase()}',
                        ),
                        height: _ScheduleGridState._rowHeight,
                        alignment: Alignment.topCenter,
                        padding: const EdgeInsets.only(top: 4),
                        decoration: BoxDecoration(
                          color: index.isEven
                              ? const Color(0xFFFFF1D5)
                              : const Color(0xFFFFF7E8),
                          border: const Border(
                            right: BorderSide(color: Color(0xFFE5D4DA)),
                            bottom: BorderSide(color: Color(0xFFEEE1E6)),
                          ),
                        ),
                        child: Text(
                          _formatHour(index + _ScheduleGridState._startHour),
                          style: const TextStyle(
                            fontSize: 9,
                            color: Color(0xFF687983),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              for (var day = 0; day < 7; day++)
                SizedBox(
                  width: dayWidth,
                  child: Column(
                    children: [
                      for (var row = 0; row < rowCount; row++)
                        Container(
                          height: _ScheduleGridState._rowHeight,
                          decoration: BoxDecoration(
                            color: row.isEven
                                ? const Color(0xFFFFFEFC)
                                : Colors.white,
                            border: const Border(
                              right: BorderSide(color: Color(0xFFEEE4E8)),
                              bottom: BorderSide(color: Color(0xFFEEE1E6)),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
          for (final item in items)
            if (_blockGeometry(item, dayWidth) case final geometry?)
              Positioned(
                key: Key('schedule-block-${item.scheduleTimeId}'),
                left: geometry.left,
                top: geometry.top,
                width: geometry.width,
                height: geometry.height,
                child: _ScheduleBlock(item: item, onTap: () => onSelect(item)),
              ),
        ],
      ),
    );
  }
}

class _ScheduleBlock extends StatelessWidget {
  final ScheduleItem item;
  final VoidCallback onTap;

  const _ScheduleBlock({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = switch (item.scheduleTypeId) {
      1 => (
        const Color(0xFFDDF1C9),
        const Color(0xFFA7D286),
        const Color(0xFF4E713A),
      ),
      2 => (
        const Color(0xFFFFF0BA),
        const Color(0xFFE7C96E),
        const Color(0xFF806720),
      ),
      _ => (
        const Color(0xFFF8D1CD),
        const Color(0xFFE7AAA4),
        const Color(0xFF8A4B46),
      ),
    };
    return Material(
      color: colors.$1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(9),
        side: BorderSide(color: colors.$2),
      ),
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(5, 4, 5, 3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.subjectName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  height: 1.05,
                  fontWeight: FontWeight.w600,
                  color: colors.$3,
                ),
              ),
              if (item.classroom?.isNotEmpty == true)
                Text(
                  'ห้อง ${item.classroom}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 8, color: colors.$3),
                ),
              const Spacer(),
              Text(
                '${item.startTime}–${item.endTime}',
                maxLines: 1,
                style: TextStyle(fontSize: 7.5, color: colors.$3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

({double left, double top, double width, double height})? _blockGeometry(
  ScheduleItem item,
  double dayWidth,
) {
  if (item.scheduleDay < 1 || item.scheduleDay > 7) return null;
  final gridStart = _ScheduleGridState._startHour * 60;
  final gridEnd = _ScheduleGridState._endHour * 60;
  final start = math.max(gridStart, _minutes(item.startTime));
  final end = math.min(gridEnd, _minutes(item.endTime));
  if (end <= start) return null;
  return (
    left: _ScheduleGridState._timeWidth + (item.scheduleDay - 1) * dayWidth + 3,
    top: ((start - gridStart) / 60) * _ScheduleGridState._rowHeight + 2,
    width: dayWidth - 6,
    height: math.max(
      ((end - start) / 60) * _ScheduleGridState._rowHeight - 4,
      32,
    ),
  );
}

int _minutes(String value) {
  final parts = value.split(':').map(int.parse).toList();
  return parts[0] * 60 + parts[1];
}

String _formatHour(int hour) {
  if (hour == 12) return '12 PM';
  if (hour > 12) return '${hour - 12} PM';
  return '$hour AM';
}
