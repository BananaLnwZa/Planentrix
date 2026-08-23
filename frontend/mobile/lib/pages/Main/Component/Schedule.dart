// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../interfaces/table.interface.dart';
import '../../../interfaces/recommendation.interface.dart';
import '../../../services/table.service.dart';
import '../../../services/recommendation.service.dart';
import 'AddSchedulePopup.dart';
import 'RecommendationPreviewSheet.dart';
import 'ScheduleDetailsPopup.dart';

class Schedule extends StatefulWidget {
  final TableRepository? repository;
  final RecommendationRepository? recommendationRepository;

  const Schedule({super.key, this.repository, this.recommendationRepository});

  @override
  State<Schedule> createState() => _ScheduleState();
}

class _ScheduleState extends State<Schedule> {
  late final TableRepository _repository;
  late final RecommendationRepository? _recommendationRepository;
  List<ScheduleItem> _items = const [];
  List<WeeklyScheduleBlock> _weeklyBlocks = const [];
  WeeklyRecommendation? _acceptedRecommendation;
  bool _loading = true;
  bool _loadingDetail = false;
  bool _hasCurrentTerm = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? TableService();
    _recommendationRepository = widget.recommendationRepository;
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
      AcceptedWeeklySchedule? weeklySchedule;
      final recommendationRepository = _recommendationRepository;
      if (recommendationRepository != null) {
        try {
          weeklySchedule = await recommendationRepository.getWeeklySchedule();
        } catch (_) {
          weeklySchedule = null;
        }
      }
      if (!mounted) return;
      final accepted = weeklySchedule?.acceptedRecommendation;
      if (accepted != null && weeklySchedule != null) {
        setState(() {
          _acceptedRecommendation = accepted;
          _weeklyBlocks = weeklySchedule!.weeklyBlocks;
          _items = [
            ...weeklySchedule.recurringClasses.map(_recurringScheduleItem),
            ...weeklySchedule.weeklyBlocks.map(_weeklyScheduleItem),
          ];
          _hasCurrentTerm = true;
        });
      } else {
        setState(() {
          _acceptedRecommendation = null;
          _weeklyBlocks = const [];
          _items = response?.items ?? const [];
          _hasCurrentTerm = response != null;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectItem(ScheduleItem item) async {
    if (_loadingDetail) return;
    if (item.scheduleTimeId < 0 &&
        _acceptedRecommendation != null &&
        _recommendationRepository != null) {
      final blockId = -item.scheduleTimeId;
      if (!_weeklyBlocks.any((block) => block.weeklyBlockId == blockId)) return;
      final updated = await showRecommendationPreviewSheet(
        context,
        recommendation: _acceptedRecommendation!,
        repository: _recommendationRepository,
      );
      if (updated != null && mounted) await _loadSchedule();
      return;
    }
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
    if (!_hasCurrentTerm || _loading || _acceptedRecommendation != null) return;
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
    final hasScheduleItems = _items.isNotEmpty;
    return SizedBox(
      key: const Key('schedule'),
      width: double.infinity,
      height: hasScheduleItems || _loading ? 470 : 150,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ScheduleTitle(acceptedRecommendation: _acceptedRecommendation),
          const SizedBox(height: 7),
          Expanded(
            child: Stack(
              children: [
                if (hasScheduleItems)
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
                    top: 8,
                    child: _EmptySchedule(),
                  ),
                if (hasScheduleItems && _acceptedRecommendation == null)
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
                        onPressed: _loading || !_hasCurrentTerm
                            ? null
                            : _openAdd,
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
  final WeeklyRecommendation? acceptedRecommendation;

  const _ScheduleTitle({this.acceptedRecommendation});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 3),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'ตารางเวลาประจำสัปดาห์',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF52636D),
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (acceptedRecommendation != null)
                Text(
                  'กำลังใช้แผน ${_displayScheduleDate(acceptedRecommendation!.weekStart)} – ${_displayScheduleDate(acceptedRecommendation!.weekEnd)}',
                  style: const TextStyle(
                    fontSize: 8.5,
                    color: Color(0xFF71907A),
                  ),
                ),
            ],
          ),
        ),
        const _Legend(color: Color(0xFFDDF1C9), label: 'เรียน'),
        const SizedBox(width: 5),
        const _Legend(color: Color(0xFFFFF0BA), label: 'อ่าน'),
        const SizedBox(width: 5),
        const _Legend(color: Color(0xFFF8D1CD), label: 'งาน'),
      ],
    ),
  );
}

ScheduleItem _recurringScheduleItem(RecurringClassBlock block) => ScheduleItem(
  scheduleTimeId: block.scheduleTimeId,
  scheduleTypeId: 1,
  scheduleTypeName: 'class',
  subjectId: block.subjectId,
  subjectName: block.subjectName,
  scheduleDay: block.scheduleDay,
  startTime: block.startTime,
  endTime: block.endTime,
  classroom: block.classroom,
);

ScheduleItem _weeklyScheduleItem(WeeklyScheduleBlock block) => ScheduleItem(
  scheduleTimeId: -block.weeklyBlockId,
  scheduleTypeId: block.scheduleTypeId,
  scheduleTypeName: block.scheduleTypeName,
  subjectId: block.subjectId,
  subjectName: block.subjectName,
  scheduleDay: DateTime.tryParse(block.scheduledDate)?.weekday ?? 1,
  startTime: block.startTime,
  endTime: block.endTime,
);

String _displayScheduleDate(String value) {
  final parts = value.split('-');
  return parts.length == 3 ? '${parts[2]}/${parts[1]}/${parts[0]}' : value;
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
    final range = _scheduleHourRange(widget.items);
    if (range == null) return const SizedBox.shrink();

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
                          startHour: range.startHour,
                          endHour: range.endHour,
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
  final int startHour;
  final int endHour;
  final ValueChanged<ScheduleItem> onSelect;

  const _GridBody({
    required this.items,
    required this.dayWidth,
    required this.startHour,
    required this.endHour,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final rowCount = endHour - startHour;
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
                height: gridHeight,
                child: Stack(
                  children: [
                    Column(
                      children: [
                        for (var index = 0; index < rowCount; index++)
                          Container(
                            key: Key(
                              'schedule-time-${_formatHour(index + startHour).replaceAll(' ', '-').toLowerCase()}',
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
                              _formatHour(index + startHour),
                              style: const TextStyle(
                                fontSize: 9,
                                color: Color(0xFF687983),
                              ),
                            ),
                          ),
                      ],
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 1,
                      child: IgnorePointer(
                        child: Text(
                          _formatHour(endHour),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 9,
                            color: Color(0xFF687983),
                          ),
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
            if (_blockGeometry(item, dayWidth, startHour, endHour)
                case final geometry?)
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
          child: LayoutBuilder(
            builder: (context, constraints) {
              final showTime = constraints.maxHeight >= 34;
              final showClassroom = constraints.maxHeight >= 48;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.subjectName,
                    maxLines: showTime ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10,
                      height: 1.05,
                      fontWeight: FontWeight.w600,
                      color: colors.$3,
                    ),
                  ),
                  if (showClassroom && item.classroom?.isNotEmpty == true)
                    Text(
                      'ห้อง ${item.classroom}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 8, color: colors.$3),
                    ),
                  if (showTime) ...[
                    const Spacer(),
                    Text(
                      '${item.startTime}–${item.endTime}',
                      maxLines: 1,
                      style: TextStyle(fontSize: 7.5, color: colors.$3),
                    ),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

({double left, double top, double width, double height})? _blockGeometry(
  ScheduleItem item,
  double dayWidth,
  int startHour,
  int endHour,
) {
  if (item.scheduleDay < 1 || item.scheduleDay > 7) return null;
  final gridStart = startHour * 60;
  final gridEnd = endHour * 60;
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

({int startHour, int endHour})? _scheduleHourRange(List<ScheduleItem> items) {
  final ranges = items
      .map(
        (item) =>
            (start: _minutes(item.startTime), end: _minutes(item.endTime)),
      )
      .where((range) => range.end > range.start)
      .toList(growable: false);
  if (ranges.isEmpty) return null;

  final earliestStart = ranges.map((range) => range.start).reduce(math.min);
  final latestEnd = ranges.map((range) => range.end).reduce(math.max);
  final startHour = math.max(0, earliestStart ~/ 60);
  final endHour = math.min(
    24,
    math.max(startHour + 10, (latestEnd / 60).ceil()),
  );
  return (startHour: startHour, endHour: endHour);
}

String _formatHour(int hour) {
  return '${hour.toString().padLeft(2, '0')}:00';
}
