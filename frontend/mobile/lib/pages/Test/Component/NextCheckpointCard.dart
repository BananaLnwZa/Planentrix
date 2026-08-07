import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class NextCheckpointCard extends StatelessWidget {
  final List<ExamCheckpointInsight> checkpoints;
  final DateTime now;

  const NextCheckpointCard({
    super.key,
    required this.checkpoints,
    required this.now,
  });

  @override
  Widget build(BuildContext context) {
    if (checkpoints.isEmpty) return const SizedBox.shrink();
    return _InsightSurface(
      key: const Key('next-checkpoint-card'),
      color: const Color(0xFFFFF0BF),
      icon: Icons.event_repeat_rounded,
      title: 'รอบ Checkpoint ถัดไป',
      children: [
        for (var index = 0; index < checkpoints.length; index++) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  '${checkpoints[index].subjectName} • ${checkpoints[index].examName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF665C3D),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _checkpointText(checkpoints[index].weeksUntil(now)),
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF9A7527),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          if (index < checkpoints.length - 1)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 7),
              child: Divider(height: 1, color: Color(0x33A88742)),
            ),
        ],
      ],
    );
  }
}

String _checkpointText(int weeks) {
  if (weeks <= 0) return 'ถึงรอบแล้ว';
  return 'อีก $weeks สัปดาห์';
}

class _InsightSurface extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String title;
  final List<Widget> children;

  const _InsightSurface({
    super.key,
    required this.color,
    required this.icon,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0x1F000000)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFF826A35)),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  title,
                  maxLines: 2,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF594F38),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 11),
          ...children,
        ],
      ),
    );
  }
}
