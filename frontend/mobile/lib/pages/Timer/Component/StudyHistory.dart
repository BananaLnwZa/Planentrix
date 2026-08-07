// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../interfaces/time.interface.dart';
import '../timer_utils.dart';

class StudyHistory extends StatelessWidget {
  final StudyDashboard dashboard;

  const StudyHistory({super.key, required this.dashboard});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('study-history'),
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Color(0xFFF8FCFF), Color(0xFFEEF7FB)],
        ),
        borderRadius: BorderRadius.circular(21),
        border: Border.all(color: const Color(0xFFD8E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A574135),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _HistoryHeader(),
          const SizedBox(height: 13),
          if (dashboard.history.isEmpty)
            const _EmptyHistory()
          else
            for (var index = 0; index < dashboard.history.length; index++) ...[
              _HistoryMonth(month: dashboard.history[index]),
              if (index != dashboard.history.length - 1)
                const SizedBox(height: 16),
            ],
        ],
      ),
    );
  }
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
                  'ประวัติการทบทวน',
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
              color: Color(0xFFF5EDF1),
              shape: BoxShape.circle,
            ),
            child: Padding(
              padding: EdgeInsets.all(9),
              child: Icon(
                Icons.menu_book_rounded,
                color: Color(0xFFB2788C),
                size: 21,
              ),
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
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 30, horizontal: 18),
      child: Column(
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              color: Color(0xFFEDF7FC),
              shape: BoxShape.circle,
            ),
            child: Padding(
              padding: EdgeInsets.all(13),
              child: Icon(
                Icons.history_rounded,
                color: Color(0xFF85BDDB),
                size: 27,
              ),
            ),
          ),
          SizedBox(height: 11),
          Text(
            'ยังไม่มีประวัติการทบทวน',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF6D6065),
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'เมื่อจับเวลาเสร็จแล้ว สรุปรายวิชาในแต่ละเดือนจะแสดงที่นี่',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              height: 1.45,
              color: Color(0xFFA3979B),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryMonth extends StatelessWidget {
  final MonthlyStudyHistory month;

  const _HistoryMonth({required this.month});

  @override
  Widget build(BuildContext context) {
    final maximum = month.subjects.fold<double>(
      1,
      (value, item) => math.max(value, item.totalMinutes),
    );
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFE4F4FC), Color(0xFFEDF8FB), Color(0xFFF5EDF2)],
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  formatThaiMonth(month.monthKey),
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF4F7890),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  '${formatStudyDuration(month.totalMinutes, compact: true)}'
                  ' · ${month.sessionCount} ครั้ง',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style: const TextStyle(
                    fontSize: 9,
                    color: Color(0xFF668DA4),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        for (var index = 0; index < month.subjects.length; index++) ...[
          _SubjectHistoryCard(
            subject: month.subjects[index],
            maximumMinutes: maximum,
          ),
          if (index != month.subjects.length - 1) const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _SubjectHistoryCard extends StatelessWidget {
  final SubjectStudyHistory subject;
  final double maximumMinutes;

  const _SubjectHistoryCard({
    required this.subject,
    required this.maximumMinutes,
  });

  @override
  Widget build(BuildContext context) {
    final progress = (subject.totalMinutes / maximumMinutes).clamp(0.04, 1.0);
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF0E7E2)),
      ),
      child: Column(
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
                      subject.subjectName,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF594F53),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${subject.sessionCount} ครั้ง',
                      style: const TextStyle(
                        fontSize: 9,
                        color: Color(0xFFA09297),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                formatStudyDuration(subject.totalMinutes, compact: true),
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF6A8FA4),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: const Color(0xFFEFEAE7),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF8FC8EA)),
            ),
          ),
          if (subject.methods.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 5,
              runSpacing: 5,
              children: [
                for (final method in subject.methods.entries)
                  _MethodChip(method: method.key, minutes: method.value),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MethodChip extends StatelessWidget {
  final String method;
  final double minutes;

  const _MethodChip({required this.method, required this.minutes});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F4F2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: studyTypeColors[method] ?? const Color(0xFFB8CAD3),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              '${studyTypeLabels[method] ?? method} '
              '${formatStudyDuration(minutes, compact: true)}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 8.5, color: Color(0xFF756A6E)),
            ),
          ),
        ],
      ),
    );
  }
}
