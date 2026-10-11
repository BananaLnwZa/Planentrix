// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../interfaces/time.interface.dart';
import '../timer_utils.dart';

class StudyHistory extends StatefulWidget {
  final StudyDashboard dashboard;

  const StudyHistory({super.key, required this.dashboard});

  @override
  State<StudyHistory> createState() => _StudyHistoryState();
}

class _StudyHistoryState extends State<StudyHistory> {
  late String _selectedMonthKey;

  @override
  void initState() {
    super.initState();
    _selectedMonthKey = widget.dashboard.history.firstOrNull?.monthKey ?? '';
  }

  @override
  void didUpdateWidget(covariant StudyHistory oldWidget) {
    super.didUpdateWidget(oldWidget);
    final stillExists = widget.dashboard.history.any(
      (month) => month.monthKey == _selectedMonthKey,
    );
    if (!stillExists) {
      _selectedMonthKey = widget.dashboard.history.firstOrNull?.monthKey ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedMonth = widget.dashboard.history
        .where((month) => month.monthKey == _selectedMonthKey)
        .firstOrNull;
    final month = selectedMonth ?? widget.dashboard.history.firstOrNull;
    final weeks = month == null
        ? const <MonthlyStudyWeek>[]
        : _displayedWeeks(month, widget.dashboard.weeks);
    final totalSessions = widget.dashboard.history.fold<int>(
      0,
      (sum, item) => sum + item.sessionCount,
    );

    return Container(
      key: const Key('study-history'),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD8E2E7)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x294E443D),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _HistoryHeader(),
          const SizedBox(height: 11),
          if (month == null)
            const _EmptyHistory()
          else ...[
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (
                    var index = 0;
                    index < widget.dashboard.history.length;
                    index++
                  ) ...[
                    _MonthChip(
                      month: widget.dashboard.history[index],
                      selected:
                          widget.dashboard.history[index].monthKey ==
                          month.monthKey,
                      onTap: () => setState(() {
                        _selectedMonthKey =
                            widget.dashboard.history[index].monthKey;
                      }),
                    ),
                    if (index < widget.dashboard.history.length - 1)
                      const SizedBox(width: 7),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 10),
            if (month.totalMinutes > 0) ...[
              _WeeklyHistoryChart(weeks: weeks),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _SummaryTile(
                      label: 'เฉลี่ยสัปดาห์ละ',
                      value: formatStudyDuration(
                        month.totalMinutes / math.max(1, weeks.length),
                        compact: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: _SummaryTile(
                      label: 'เดือนที่เลือก',
                      value: formatStudyDuration(
                        month.totalMinutes,
                        compact: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: _SummaryTile(
                      label: 'รวมเทอมนี้',
                      value: formatStudyDuration(
                        widget.dashboard.summary.totalTermMinutes,
                        compact: true,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              Text(
                'รวมทั้งหมด $totalSessions ครั้งในเทอมนี้',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFA1AAAE), fontSize: 8.5),
              ),
            ] else
              const SizedBox(
                height: 210,
                child: Center(
                  child: Text(
                    'ยังไม่มีประวัติการทบทวนในเดือนนี้',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF91A0A6), fontSize: 10.5),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

List<MonthlyStudyWeek> _displayedWeeks(
  MonthlyStudyHistory month,
  List<StudyWeek> dashboardWeeks,
) {
  final parts = month.monthKey.split('-');
  final year = int.tryParse(parts.firstOrNull ?? '');
  final monthNumber = int.tryParse(parts.length > 1 ? parts[1] : '');
  if (year == null || monthNumber == null) return month.weeks;

  final now = DateTime.now();
  final isCurrentMonth = now.year == year && now.month == monthNumber;
  final daysToDisplay = isCurrentMonth
      ? now.day
      : DateTime(year, monthNumber + 1, 0).day;
  final available = <int, MonthlyStudyWeek>{
    for (final week in month.weeks) week.weekNumber: week,
  };

  if (available.isEmpty) {
    for (final week in dashboardWeeks) {
      final start = week.weekStart;
      if (start == null || start.year != year || start.month != monthNumber) {
        continue;
      }
      final weekNumber = ((start.day - 1) ~/ 7) + 1;
      available[weekNumber] = MonthlyStudyWeek(
        weekNumber: weekNumber,
        totalMinutes: week.totalMinutes,
        sessionCount: 0,
      );
    }
  }

  final greatestWeek = available.keys.fold<int>(1, math.max);
  final lastWeek = math.max((daysToDisplay / 7).ceil(), greatestWeek);
  return List.generate(
    lastWeek,
    (index) =>
        available[index + 1] ??
        MonthlyStudyWeek(
          weekNumber: index + 1,
          totalMinutes: 0,
          sessionCount: 0,
        ),
  );
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: 9),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFEEE4DF))),
      ),
      child: const Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'STUDY HISTORY',
                  style: TextStyle(
                    color: Color(0xFFA77B8A),
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'ประวัติการทบทวน / เทอม',
                  style: TextStyle(
                    color: Color(0xFF4E4350),
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: Color(0xFFEAF6FC),
              shape: BoxShape.circle,
            ),
            child: Padding(
              padding: EdgeInsets.all(9),
              child: Icon(
                Icons.access_time_rounded,
                color: Color(0xFF79B6D8),
                size: 19,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MonthChip extends StatelessWidget {
  final MonthlyStudyHistory month;
  final bool selected;
  final VoidCallback onTap;

  const _MonthChip({
    required this.month,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFDFF2FB) : const Color(0xFFFBFDFE),
      shape: StadiumBorder(
        side: BorderSide(
          color: selected ? const Color(0xFF9CCCE2) : const Color(0xFFE1E8EB),
        ),
      ),
      child: InkWell(
        key: Key('history-month-${month.monthKey}'),
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
          child: Text(
            formatThaiMonth(month.monthKey),
            style: TextStyle(
              color: selected
                  ? const Color(0xFF4F8199)
                  : const Color(0xFF84949C),
              fontSize: 9.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _WeeklyHistoryChart extends StatelessWidget {
  final List<MonthlyStudyWeek> weeks;

  const _WeeklyHistoryChart({required this.weeks});

  @override
  Widget build(BuildContext context) {
    final scale = _ChartScale.fromWeeks(weeks);
    return Container(
      key: const Key('study-history-chart'),
      padding: const EdgeInsets.fromLTRB(8, 13, 8, 9),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFEFD),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E7EA)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14564A43),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text(
            'ชั่วโมงอ่านต่อสัปดาห์',
            style: TextStyle(color: Color(0xFF655D60), fontSize: 12),
          ),
          const SizedBox(height: 11),
          SizedBox(
            height: 192,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 25,
                  height: 172,
                  child: Stack(
                    children: [
                      for (final tick in scale.ticks)
                        Positioned(
                          right: 4,
                          bottom: (tick / scale.maximum) * 164,
                          child: Text(
                            _formatAxisHours(tick),
                            style: const TextStyle(
                              color: Color(0xFF92999D),
                              fontSize: 8,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      SizedBox(
                        height: 172,
                        child: Stack(
                          children: [
                            for (final tick in scale.ticks)
                              Positioned(
                                left: 0,
                                right: 0,
                                bottom: (tick / scale.maximum) * 164 + 4,
                                child: const Divider(
                                  height: 1,
                                  thickness: 1,
                                  color: Color(0xFFD9DFE2),
                                ),
                              ),
                            Positioned.fill(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  for (final week in weeks)
                                    Expanded(
                                      child: _HistoryWeekBar(
                                        week: week,
                                        maximumHours: scale.maximum,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          for (final week in weeks)
                            Expanded(
                              child: Text(
                                'Week ${week.weekNumber}',
                                maxLines: 1,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Color(0xFF92999D),
                                  fontSize: 7.5,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryWeekBar extends StatelessWidget {
  final MonthlyStudyWeek week;
  final double maximumHours;

  const _HistoryWeekBar({required this.week, required this.maximumHours});

  @override
  Widget build(BuildContext context) {
    final hours = week.totalMinutes / 60;
    final ratio = maximumHours == 0
        ? 0.0
        : (hours / maximumHours).clamp(0.0, 1.0).toDouble();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: FractionallySizedBox(
          heightFactor: week.totalMinutes > 0 ? math.max(0.03, ratio) : 0.012,
          child: Container(
            key: Key('history-week-${week.weekNumber}'),
            constraints: const BoxConstraints(maxWidth: 48),
            decoration: BoxDecoration(
              color: week.totalMinutes > 0
                  ? const Color(0xFFB8DFF1)
                  : const Color(0xFFEDF2F4),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(14),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChartScale {
  final double maximum;
  final List<double> ticks;

  const _ChartScale({required this.maximum, required this.ticks});

  factory _ChartScale.fromWeeks(List<MonthlyStudyWeek> weeks) {
    final maximumHours = weeks.fold<double>(
      0,
      (maximum, week) => math.max(maximum, week.totalMinutes / 60),
    );
    if (maximumHours == 0) {
      return const _ChartScale(maximum: 1, ticks: [0, 0.25, 0.5, 0.75, 1]);
    }
    final roughStep = maximumHours / 4;
    final magnitude = math.pow(10, (math.log(roughStep) / math.ln10).floor());
    final normalized = roughStep / magnitude;
    final niceStep = normalized <= 1
        ? 1
        : normalized <= 2
        ? 2
        : normalized <= 5
        ? 5
        : 10;
    final step = niceStep * magnitude;
    final maximum = step * (maximumHours / step).ceil();
    final tickCount = (maximum / step).round();
    return _ChartScale(
      maximum: maximum.toDouble(),
      ticks: List.generate(tickCount + 1, (index) => (index * step).toDouble()),
    );
  }
}

String _formatAxisHours(double hours) {
  return hours == hours.roundToDouble()
      ? hours.toInt().toString()
      : hours.toStringAsFixed(1);
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFF929DA2), fontSize: 8),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.fade,
            softWrap: false,
            style: const TextStyle(
              color: Color(0xFF607E8C),
              fontSize: 9,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 250,
      child: Center(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'ยังไม่มีประวัติการทบทวน',
                style: TextStyle(
                  color: Color(0xFF6D6065),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'เมื่อจับเวลาเสร็จแล้ว ระบบจะแสดงชั่วโมงทบทวนแยกเป็นรายสัปดาห์',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFFA3979B),
                  fontSize: 10.5,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
