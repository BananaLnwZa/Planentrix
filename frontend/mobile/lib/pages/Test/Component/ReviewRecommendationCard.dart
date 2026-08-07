import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class ReviewRecommendationCard extends StatelessWidget {
  final List<WeakTopicInsight> topics;

  const ReviewRecommendationCard({super.key, required this.topics});

  @override
  Widget build(BuildContext context) {
    if (topics.isEmpty) return const SizedBox.shrink();
    return Container(
      key: const Key('review-recommendation-card'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFE5F4FB),
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFCAE3EE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.lightbulb_outline_rounded,
                size: 18,
                color: Color(0xFF5989A0),
              ),
              SizedBox(width: 7),
              Expanded(
                child: Text(
                  'คำแนะนำการทบทวน',
                  maxLines: 2,
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF4D7487),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 11),
          for (var index = 0; index < topics.length; index++) ...[
            Text(
              topics[index].subjectName,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF4F7D92),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              _studyTypeLabel(topics[index].studyTypeName),
              style: const TextStyle(
                fontSize: 11,
                height: 1.35,
                color: Color(0xFF5E727B),
              ),
            ),
            if (index < topics.length - 1) const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
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
