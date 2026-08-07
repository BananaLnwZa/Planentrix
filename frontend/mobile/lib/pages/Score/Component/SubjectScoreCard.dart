import 'package:flutter/material.dart';

import '../../../interfaces/score.interface.dart';
import 'WorkloadScoreTable.dart';

class SubjectScoreCard extends StatelessWidget {
  final SubjectScore subject;
  final ValueChanged<WorkloadScore> onEnterScore;
  final int? savingWorkloadId;

  const SubjectScoreCard({
    super.key,
    required this.subject,
    required this.onEnterScore,
    this.savingWorkloadId,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('subject-score-card'),
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 13, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(20),
          bottomLeft: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
        border: Border.all(color: const Color(0xFFDCE8ED)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F375D70),
            blurRadius: 18,
            offset: Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        children: [
          _SubjectInfoHeader(subject: subject),
          const SizedBox(height: 12),
          _GradeSummary(subject: subject),
          const SizedBox(height: 12),
          WorkloadScoreTable(
            workloads: subject.workloads,
            savingWorkloadId: savingWorkloadId,
            onEnterScore: onEnterScore,
          ),
        ],
      ),
    );
  }
}

class _SubjectInfoHeader extends StatelessWidget {
  final SubjectScore subject;

  const _SubjectInfoHeader({required this.subject});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${subject.subjectId}  ',
                      style: const TextStyle(color: Color(0xFF5B849A)),
                    ),
                    TextSpan(text: subject.subjectName),
                  ],
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF31566C),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'ผู้สอน ${subject.teacherName.isEmpty ? 'ไม่ระบุ' : subject.teacherName}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: Color(0xFF83A0AF)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
            color: const Color(0xFFEEF7FB),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Text(
            '${_numberText(subject.credits)} หน่วยกิต',
            style: const TextStyle(fontSize: 11, color: Color(0xFF668A9E)),
          ),
        ),
      ],
    );
  }
}

class _GradeSummary extends StatelessWidget {
  final SubjectScore subject;

  const _GradeSummary({required this.subject});

  @override
  Widget build(BuildContext context) {
    final progress = subject.progressPercent.clamp(0.0, 100.0);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: _GradeItem(
              label: 'เกรดปัจจุบัน',
              value: subject.actualGrade,
              background: const Color(0xFFEDF2F5),
              foreground: const Color(0xFF587384),
            ),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: _GradeItem(
              key: const Key('target-grade-value'),
              label: 'เป้าหมาย',
              value: subject.targetGrade,
              background: const Color(0xFFE6F5FD),
              foreground: const Color(0xFF4DA7D8),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${progress.toStringAsFixed(0)}%',
                style: const TextStyle(
                  color: Color(0xFF58A9D5),
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  key: const Key('subject-score-progress'),
                  value: progress / 100,
                  minHeight: 6,
                  backgroundColor: const Color(0xFFE7F0F4),
                  color: const Color(0xFF58B2E3),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GradeItem extends StatelessWidget {
  final String label;
  final String value;
  final Color background;
  final Color foreground;

  const _GradeItem({
    super.key,
    required this.label,
    required this.value,
    required this.background,
    required this.foreground,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Color(0xFF7793A2)),
        ),
        const SizedBox(width: 4),
        Container(
          constraints: const BoxConstraints(minWidth: 30),
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Text(
            value,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: foreground,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

String _numberText(double value) =>
    value == value.roundToDouble() ? '${value.toInt()}' : '$value';
