import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class WeakTopicRanking extends StatelessWidget {
  final List<WeakTopicInsight> topics;

  const WeakTopicRanking({super.key, required this.topics});

  @override
  Widget build(BuildContext context) {
    if (topics.isEmpty) return const SizedBox.shrink();
    final sorted = [...topics]
      ..sort((left, right) => left.percentage.compareTo(right.percentage));
    return Container(
      key: const Key('weak-topic-ranking'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE7EB),
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFEBC5CE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'เรื่องที่ควรเน้นทบทวน',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF87566A),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 11),
          for (var index = 0; index < sorted.length; index++) ...[
            Row(
              key: Key('weak-topic-${sorted[index].examPartId}'),
              children: [
                Container(
                  width: 23,
                  height: 23,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '${index + 1}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFFB05E78),
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sorted[index].topicName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF6D4F5A),
                        ),
                      ),
                      Text(
                        sorted[index].subjectName,
                        style: const TextStyle(
                          fontSize: 9,
                          color: Color(0xFF9B7D88),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${sorted[index].percentage.toStringAsFixed(0)}%',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFC25373),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            if (index < sorted.length - 1) const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}
