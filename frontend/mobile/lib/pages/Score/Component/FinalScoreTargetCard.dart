import 'package:flutter/material.dart';

import '../../../interfaces/score.interface.dart';

class FinalScoreTargetCard extends StatelessWidget {
  final List<SubjectScore> subjects;

  const FinalScoreTargetCard({super.key, required this.subjects});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('final-score-target-card'),
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF3FAFD),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCFE4ED)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'คะแนนปลายภาคที่ต้องได้ตามเป้าหมาย',
            style: TextStyle(
              color: Color(0xFF456A7C),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          for (final subject in subjects) ...[
            _SubjectTargetRow(subject: subject),
            const SizedBox(height: 6),
          ],
        ],
      ),
    );
  }
}

class _SubjectTargetRow extends StatelessWidget {
  final SubjectScore subject;

  const _SubjectTargetRow({required this.subject});

  @override
  Widget build(BuildContext context) {
    final needed = subject.pointsNeeded;
    final reached = needed != null && needed <= 0;
    final remaining = (100 - subject.totalMaximumScore).clamp(0, 100);
    final impossible = needed != null && needed > remaining;
    final estimate = needed == null
        ? 'รอเกณฑ์ตัดเกรด'
        : reached
        ? 'ถึงเป้าหมายแล้ว'
        : 'ต้องได้เพิ่มอย่างน้อย ${_scoreText(needed)} คะแนน';

    return Container(
      key: Key('final-score-target-${subject.scheduleTimeId}'),
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            subject.subjectName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF607B89),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            estimate,
            style: TextStyle(
              color: impossible
                  ? const Color(0xFFC87878)
                  : reached
                  ? const Color(0xFF62A47E)
                  : const Color(0xFF528EB0),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'เป้า ${subject.targetGrade}${subject.targetMinimumPercentage == null ? ' · ยังไม่มีคะแนนเกณฑ์' : ' ขั้นต่ำ ${_scoreText(subject.targetMinimumPercentage!)} คะแนน'} · สะสมแล้ว ${_scoreText(subject.totalActualScore)} คะแนน',
            style: const TextStyle(
              color: Color(0xFF8299A4),
              fontSize: 10,
              height: 1.4,
            ),
          ),
          if (impossible)
            const Text(
              'คะแนนส่วนที่เหลือไม่เพียงพอให้ถึงเป้าหมายนี้',
              style: TextStyle(color: Color(0xFFC87878), fontSize: 10),
            ),
        ],
      ),
    );
  }
}

String _scoreText(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value
          .toStringAsFixed(2)
          .replaceFirst(RegExp(r'0+$'), '')
          .replaceFirst(RegExp(r'\.$'), '');
