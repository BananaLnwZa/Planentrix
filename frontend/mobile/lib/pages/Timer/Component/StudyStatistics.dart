// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../interfaces/time.interface.dart';
import '../timer_utils.dart';

class StudyStatistics extends StatelessWidget {
  final StudyDashboard dashboard;

  const StudyStatistics({super.key, required this.dashboard});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('study-statistics'),
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
          const _StatisticsHeader(),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text(
                'สัปดาห์นี้ :',
                style: TextStyle(fontSize: 12, color: Color(0xFF776E71)),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: _DurationPill(
                    value: formatStudyDuration(
                      dashboard.summary.currentWeekMinutes,
                      compact: true,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 11),
          _WeeklyChart(weeks: dashboard.weeks),
          const SizedBox(height: 10),
          _SummaryRow(
            icon: Icons.calendar_today_outlined,
            label: 'เฉลี่ย/สัปดาห์',
            value: formatStudyDuration(
              dashboard.summary.averageWeeklyMinutes,
              compact: true,
            ),
          ),
          const SizedBox(height: 6),
          _SummaryRow(
            icon: Icons.calendar_month_outlined,
            label: 'เฉลี่ย/เดือน',
            value: formatStudyDuration(
              dashboard.summary.averageMonthlyMinutes,
              compact: true,
            ),
          ),
          const SizedBox(height: 6),
          _SummaryRow(
            icon: Icons.auto_awesome_outlined,
            label: 'รวมเทอมนี้',
            value: formatStudyDuration(
              dashboard.summary.totalTermMinutes,
              compact: true,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatisticsHeader extends StatelessWidget {
  const _StatisticsHeader();

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
                  'STUDY STATISTICS',
                  style: TextStyle(
                    color: Color(0xFFA77B8A),
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'สถิติการทบทวน',
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
                Icons.bar_chart_rounded,
                color: Color(0xFF79B6D8),
                size: 21,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeeklyChart extends StatelessWidget {
  final List<StudyWeek> weeks;

  const _WeeklyChart({required this.weeks});

  @override
  Widget build(BuildContext context) {
    final visibleWeeks = weeks.length > 12
        ? weeks.sublist(weeks.length - 12)
        : weeks;
    final maxMinutes = math.max(
      60.0,
      visibleWeeks.fold<double>(
        0,
        (maximum, week) => math.max(maximum, week.totalMinutes),
      ),
    );
    return Container(
      height: 166,
      padding: const EdgeInsets.fromLTRB(10, 12, 10, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: const Color(0xFFE4E1DF)),
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
            'ชั่วโมงทบทวนต่อสัปดาห์',
            style: TextStyle(fontSize: 12, color: Color(0xFF82777B)),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: visibleWeeks.isEmpty
                ? const Center(
                    child: Text(
                      'ยังไม่มีข้อมูล',
                      style: TextStyle(fontSize: 10, color: Color(0xFFA3979B)),
                    ),
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      for (var index = 0; index < visibleWeeks.length; index++)
                        Expanded(
                          child: _WeekBar(
                            week: visibleWeeks[index],
                            maxMinutes: maxMinutes,
                            isCurrent: index == visibleWeeks.length - 1,
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

class _WeekBar extends StatelessWidget {
  final StudyWeek week;
  final double maxMinutes;
  final bool isCurrent;

  const _WeekBar({
    required this.week,
    required this.maxMinutes,
    required this.isCurrent,
  });

  @override
  Widget build(BuildContext context) {
    final ratio = (week.totalMinutes / maxMinutes).clamp(0.04, 1.0);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Expanded(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: FractionallySizedBox(
                heightFactor: ratio,
                child: Container(
                  width: 21,
                  decoration: BoxDecoration(
                    color: isCurrent
                        ? const Color(0xFF8CCBE9)
                        : const Color(0xFFB8DEF1),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(6),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'W${week.weekNumber}',
            maxLines: 1,
            style: TextStyle(
              fontSize: 8,
              color: isCurrent
                  ? const Color(0xFF4C8BB0)
                  : const Color(0xFFA3979B),
              fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFFBFDFF),
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: const Color(0xFFE3EAEE)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 15, color: const Color(0xFF8EBBD2)),
          const SizedBox(width: 5),
          Expanded(
            child: Text(
              '$label :',
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF756B6F)),
            ),
          ),
          _DurationPill(value: value),
        ],
      ),
    );
  }
}

class _DurationPill extends StatelessWidget {
  final String value;

  const _DurationPill({required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFD9E5EA)),
      ),
      child: Text(
        value,
        maxLines: 1,
        overflow: TextOverflow.fade,
        softWrap: false,
        style: const TextStyle(
          fontSize: 9.5,
          color: Color(0xFF56839B),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
