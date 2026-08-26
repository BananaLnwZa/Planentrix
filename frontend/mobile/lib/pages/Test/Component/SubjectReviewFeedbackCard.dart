import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import '../../../common/DateTimeFormat.dart';

class SubjectReviewFeedbackCard extends StatelessWidget {
  final String subjectId;
  final List<WeakTopicInsight> topics;
  final List<ExamCheckpointInsight> checkpoints;
  final DateTime now;

  const SubjectReviewFeedbackCard({
    super.key,
    required this.subjectId,
    required this.topics,
    required this.checkpoints,
    required this.now,
  });

  @override
  Widget build(BuildContext context) {
    final sortedTopics = [...topics]
      ..sort((left, right) => left.percentage.compareTo(right.percentage));
    final sortedCheckpoints = [...checkpoints]
      ..sort(
        (left, right) =>
            left.nextCheckpointAt.compareTo(right.nextCheckpointAt),
      );
    final subjectName = sortedTopics.isNotEmpty
        ? sortedTopics.first.subjectName
        : sortedCheckpoints.isNotEmpty
        ? sortedCheckpoints.first.subjectName
        : subjectId;

    return Container(
      key: Key('subject-review-feedback-$subjectId'),
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: const Color(0xFFDCE7EB)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x16000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Color(0xFFE4F3FA),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.auto_stories_rounded,
                  size: 17,
                  color: Color(0xFF6091A7),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subjectName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        color: Color(0xFF405B69),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Text(
                      'คำแนะนำหลังทำแบบทดสอบ',
                      style: TextStyle(fontSize: 11, color: Color(0xFF91A0A7)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _WeakTopicsSection(topics: sortedTopics),
          if (sortedTopics.isNotEmpty) ...[
            const SizedBox(height: 10),
            _ReviewMethodsSection(topics: sortedTopics),
          ],
          if (sortedCheckpoints.isNotEmpty) ...[
            const SizedBox(height: 10),
            _CheckpointSection(checkpoints: sortedCheckpoints, now: now),
          ],
        ],
      ),
    );
  }
}

class _WeakTopicsSection extends StatelessWidget {
  final List<WeakTopicInsight> topics;

  const _WeakTopicsSection({required this.topics});

  @override
  Widget build(BuildContext context) {
    return _FeedbackSection(
      key: const Key('weak-topic-section'),
      color: const Color(0xFFFFE7EB),
      titleColor: const Color(0xFF87566A),
      icon: Icons.trending_down_rounded,
      title: 'เรื่องที่ควรเน้นทบทวน',
      child: topics.isEmpty
          ? const Text(
              'ทำได้ดี ยังไม่มีเรื่องที่ต้องเน้นเป็นพิเศษ',
              style: TextStyle(fontSize: 10.5, color: Color(0xFF7A6A70)),
            )
          : Column(
              children: [
                for (var index = 0; index < topics.length; index++) ...[
                  Row(
                    key: Key('weak-topic-${topics[index].examPartId}'),
                    children: [
                      Container(
                        width: 21,
                        height: 21,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(
                            fontSize: 9,
                            color: Color(0xFFB05E78),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          topics[index].topicName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF6D4F5A),
                          ),
                        ),
                      ),
                      Text(
                        '${topics[index].percentage.toStringAsFixed(0)}%',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFFC25373),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  if (index < topics.length - 1) const SizedBox(height: 8),
                ],
              ],
            ),
    );
  }
}

class _ReviewMethodsSection extends StatelessWidget {
  final List<WeakTopicInsight> topics;

  const _ReviewMethodsSection({required this.topics});

  @override
  Widget build(BuildContext context) {
    final methods = <String>[];
    final seenMethods = <String>{};
    for (final topic in topics) {
      final key = topic.studyTypeId > 0
          ? 'id:${topic.studyTypeId}'
          : topic.studyTypeName.trim().toLowerCase();
      if (seenMethods.add(key)) methods.add(topic.studyTypeName);
    }
    return _FeedbackSection(
      key: const Key('review-method-section'),
      color: const Color(0xFFE5F4FB),
      titleColor: const Color(0xFF4D7487),
      icon: Icons.lightbulb_outline_rounded,
      title: 'วิธีทบทวนที่แนะนำ',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var index = 0; index < methods.length; index++) ...[
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF72A9BE),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _studyTypeLabel(methods[index]),
                    style: const TextStyle(
                      fontSize: 10.5,
                      height: 1.35,
                      color: Color(0xFF5E727B),
                    ),
                  ),
                ),
              ],
            ),
            if (index < methods.length - 1) const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _CheckpointSection extends StatelessWidget {
  final List<ExamCheckpointInsight> checkpoints;
  final DateTime now;

  const _CheckpointSection({required this.checkpoints, required this.now});

  @override
  Widget build(BuildContext context) {
    return _FeedbackSection(
      key: const Key('checkpoint-section'),
      color: const Color(0xFFFFF0BF),
      titleColor: const Color(0xFF826A35),
      icon: Icons.event_repeat_rounded,
      title: 'รอบ Checkpoint ถัดไป',
      child: Column(
        children: [
          for (var index = 0; index < checkpoints.length; index++) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        checkpoints[index].examName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF665C3D),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _dateText(checkpoints[index].nextCheckpointAt),
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: Color(0xFF907D54),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _checkpointText(checkpoints[index].weeksUntil(now)),
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF9A7527),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _reviewTimeText(checkpoints[index].reviewMinutesDelta),
                      style: const TextStyle(
                        fontSize: 9,
                        color: Color(0xFF66894E),
                      ),
                    ),
                  ],
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
      ),
    );
  }
}

class _FeedbackSection extends StatelessWidget {
  final Color color;
  final Color titleColor;
  final IconData icon;
  final String title;
  final Widget child;

  const _FeedbackSection({
    super.key,
    required this.color,
    required this.titleColor,
    required this.icon,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: titleColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: titleColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

String _checkpointText(int weeks) {
  if (weeks <= 0) return 'ถึงรอบแล้ว';
  return 'อีก $weeks สัปดาห์';
}

String _reviewTimeText(int minutes) {
  if (minutes > 0) return 'เพิ่มเวลาทบทวน ${_reviewDuration(minutes)}';
  if (minutes < 0) return 'ลดเวลาทบทวน ${_reviewDuration(minutes)}';
  return 'เวลาทบทวนปัจจุบันเหมาะสมแล้ว';
}

String _reviewDuration(int minutes) {
  final total = minutes.abs();
  final hours = total ~/ 60;
  final remaining = total % 60;
  if (hours > 0 && remaining > 0) return '$hours ชม. $remaining นาที';
  if (hours > 0) return '$hours ชม.';
  return '$remaining นาที';
}

String _dateText(DateTime value) {
  return formatDisplayDate(value);
}

String _studyTypeLabel(String value) {
  switch (value.trim().toLowerCase()) {
    case 'reading':
      return 'อ่านตำรา/เอกสาร';
    case 'practice':
      return 'ทำโจทย์/ฝึกปฏิบัติ';
    case 'video':
      return 'ดูวิดีโอ/lecture';
    case 'review':
      return 'ทบทวน/สรุปบทเรียน';
    default:
      return value.isEmpty ? 'ยังไม่มีวิธีทบทวนที่แนะนำ' : value;
  }
}
