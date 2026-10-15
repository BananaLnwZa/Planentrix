// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../interfaces/time.interface.dart';

class ReviewRecommendationCard extends StatelessWidget {
  final List<WeeklyReviewTarget> items;
  final ValueChanged<String> onSelectSubject;

  const ReviewRecommendationCard({
    super.key,
    required this.items,
    required this.onSelectSubject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('review-recommendation-card'),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
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
          const _RecommendationHeader(),
          const SizedBox(height: 10),
          if (items.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7FBFD),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'วันนี้ยังไม่มีบล็อกทบทวนในตาราง',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF8C9BA1),
                  fontSize: 10.5,
                  height: 1.5,
                ),
              ),
            )
          else
            for (var index = 0; index < items.take(4).length; index++) ...[
              _RecommendationItem(
                item: items[index],
                onTap: () => onSelectSubject(items[index].subjectId),
              ),
              if (index < items.take(4).length - 1) const SizedBox(height: 6),
            ],
        ],
      ),
    );
  }
}

class _RecommendationHeader extends StatelessWidget {
  const _RecommendationHeader();

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
                  'RECOMMENDED REVIEW',
                  style: TextStyle(
                    color: Color(0xFFA77B8A),
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'วิชาที่แนะนำให้ทบทวน',
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
                Icons.auto_awesome_rounded,
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

class _RecommendationItem extends StatelessWidget {
  final WeeklyReviewTarget item;
  final VoidCallback onTap;

  const _RecommendationItem({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final target = item.targetMinutes;
    final score = item.scorePercentage;
    final detail = [
      if (target != null && target > 0)
        'เป้าหมาย $target นาที'
      else
        item.detail,
      if (score != null) 'คะแนน ${score.round()}%',
    ].join(' · ');

    return Material(
      color: const Color(0xFFFBFDFE),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE5EEF1)),
      ),
      child: InkWell(
        key: Key('review-recommendation-${item.subjectId}'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            children: [
              const Icon(
                Icons.menu_book_rounded,
                size: 17,
                color: Color(0xFF85B5C6),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.subjectName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF506872),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      detail,
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
              const SizedBox(width: 6),
              const Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: Color(0xFFA6BAC2),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
