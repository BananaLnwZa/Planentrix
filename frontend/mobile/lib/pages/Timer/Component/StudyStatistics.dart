// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../interfaces/time.interface.dart';
import '../timer_utils.dart';

class StudyStatistics extends StatelessWidget {
  final StudyDashboard dashboard;
  final List<WeeklyReviewTarget> recommendations;
  final StudySession? activeSession;
  final int elapsedSeconds;

  const StudyStatistics({
    super.key,
    required this.dashboard,
    this.recommendations = const [],
    this.activeSession,
    this.elapsedSeconds = 0,
  });

  @override
  Widget build(BuildContext context) {
    final grouped = <String, WeeklyReviewTarget>{};
    for (final item in recommendations) {
      final existing = grouped[item.subjectId];
      if (existing == null) {
        grouped[item.subjectId] = item;
        continue;
      }
      final useNewWeakness =
          (item.scorePercentage ?? 100) < (existing.scorePercentage ?? 100);
      grouped[item.subjectId] = WeeklyReviewTarget(
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        detail: useNewWeakness ? item.detail : existing.detail,
        targetMinutes:
            (existing.targetMinutes ?? 0) + (item.targetMinutes ?? 0),
        scorePercentage: useNewWeakness
            ? item.scorePercentage
            : existing.scorePercentage,
      );
    }
    final progressItems = grouped.values.toList();
    final weeklyMinutes = <String, double>{
      for (final item in dashboard.weeklySubjects)
        item.subjectId: item.totalMinutes,
    };
    final weekStart = dashboard.weeks.isEmpty
        ? null
        : dashboard.weeks.last.weekStart;
    final activeIsThisWeek =
        activeSession != null &&
        weekStart != null &&
        activeSession!.startTime != null &&
        !activeSession!.startTime!.isBefore(weekStart);
    final recommendedMinutes = progressItems.fold<double>(0, (sum, item) {
      final liveMinutes =
          activeIsThisWeek && activeSession?.subjectId == item.subjectId
          ? elapsedSeconds / 60
          : 0;
      return sum + (weeklyMinutes[item.subjectId] ?? 0) + liveMinutes;
    });

    return Container(
      key: const Key('study-statistics'),
      constraints: const BoxConstraints(minHeight: 380),
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 15),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Color(0xFFF8FCFF), Color(0xFFEEF7FB)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD8E2E7)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A574135),
            blurRadius: 20,
            offset: Offset(0, 9),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _StatisticsHeader(),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'เวลาทบทวนสัปดาห์นี้',
                      style: TextStyle(color: Color(0xFF8C9BA1), fontSize: 9.5),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      formatStudyDuration(recommendedMinutes, compact: true),
                      style: const TextStyle(
                        color: Color(0xFF568BA9),
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (progressItems.isNotEmpty)
                Text(
                  '${progressItems.length} วิชาที่แนะนำ',
                  style: const TextStyle(
                    color: Color(0xFF8C9BA1),
                    fontSize: 9.5,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (progressItems.isEmpty)
            const SizedBox(height: 230, child: _EmptyProgress())
          else
            for (var index = 0; index < progressItems.length; index++) ...[
              _RecommendedSubjectProgress(
                target: progressItems[index],
                recordedMinutes:
                    weeklyMinutes[progressItems[index].subjectId] ?? 0,
                liveMinutes:
                    activeIsThisWeek &&
                        activeSession?.subjectId ==
                            progressItems[index].subjectId
                    ? elapsedSeconds / 60
                    : 0,
              ),
              if (index < progressItems.length - 1) const SizedBox(height: 8),
            ],
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
                  'WEEKLY PROGRESS',
                  style: TextStyle(
                    color: Color(0xFFA77B8A),
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Progress / สัปดาห์',
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
                Icons.speed_rounded,
                color: Color(0xFF79B6D8),
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecommendedSubjectProgress extends StatelessWidget {
  final WeeklyReviewTarget target;
  final double recordedMinutes;
  final double liveMinutes;

  const _RecommendedSubjectProgress({
    required this.target,
    required this.recordedMinutes,
    required this.liveMinutes,
  });

  @override
  Widget build(BuildContext context) {
    final actualMinutes = recordedMinutes + liveMinutes;
    final targetMinutes = target.targetMinutes ?? 0;
    final progress = targetMinutes > 0
        ? (actualMinutes / targetMinutes).clamp(0.0, 1.0).toDouble()
        : 0.0;
    final percentage = (progress * 100).round();

    return Container(
      key: Key('weekly-review-${target.subjectId}'),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCE8ED)),
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
                      target.subjectName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF4E6570),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      target.scorePercentage == null
                          ? target.detail
                          : '${target.detail} · คะแนน ${target.scorePercentage!.round()}%',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF91A0A6),
                        fontSize: 9.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                targetMinutes > 0
                    ? '${formatStudyDuration(actualMinutes, compact: true)} / ${formatStudyDuration(targetMinutes.toDouble(), compact: true)}'
                    : formatStudyDuration(actualMinutes, compact: true),
                style: const TextStyle(
                  color: Color(0xFF668DA4),
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),
          _MilestoneProgress(
            progress: progress,
            reachedGoal: percentage >= 100,
          ),
          const SizedBox(height: 2),
          Text(
            targetMinutes > 0
                ? '$percentage% ของเป้าหมายรายสัปดาห์'
                : 'ยังไม่มีเป้าหมายเวลารายสัปดาห์',
            textAlign: TextAlign.right,
            style: const TextStyle(color: Color(0xFFA2AEB2), fontSize: 8.5),
          ),
        ],
      ),
    );
  }
}

class _MilestoneProgress extends StatelessWidget {
  final double progress;
  final bool reachedGoal;

  const _MilestoneProgress({required this.progress, required this.reachedGoal});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 20,
      child: LayoutBuilder(
        builder: (context, constraints) {
          const dotSize = 12.0;
          final trackWidth = constraints.maxWidth - dotSize;
          return Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                left: dotSize / 2,
                right: dotSize / 2,
                top: 8,
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E9E9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ),
              Positioned(
                left: dotSize / 2,
                top: 8,
                width: trackWidth * progress,
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE4869F),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ),
              for (final milestone in const [0.0, 0.25, 0.5, 0.75, 1.0])
                Positioned(
                  left: trackWidth * milestone,
                  top: 5,
                  child: Container(
                    width: dotSize,
                    height: dotSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: progress >= milestone
                          ? const Color(0xFF315F9B)
                          : Colors.white,
                      border: Border.all(
                        width: 2,
                        color: progress >= milestone
                            ? const Color(0xFF315F9B)
                            : const Color(0xFFB8C5CB),
                      ),
                      boxShadow: const [
                        BoxShadow(color: Color(0x1F000000), blurRadius: 2),
                      ],
                    ),
                  ),
                ),
              if (reachedGoal)
                const Positioned(
                  right: 0,
                  top: 0,
                  child: Icon(
                    Icons.flag_rounded,
                    color: Color(0xFFA34D68),
                    size: 13,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _EmptyProgress extends StatelessWidget {
  const _EmptyProgress();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 22, vertical: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.speed_rounded, color: Color(0xFF85BDDB), size: 32),
            SizedBox(height: 8),
            Text(
              'ยังไม่มีวิชาที่ระบบแนะนำ',
              style: TextStyle(
                color: Color(0xFF6D6065),
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'ยอมรับแผนทบทวนรายสัปดาห์ หรือทำข้อสอบเพื่อรับคำแนะนำรายวิชา',
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
    );
  }
}
