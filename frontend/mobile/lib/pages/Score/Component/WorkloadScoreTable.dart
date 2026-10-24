import 'package:flutter/material.dart';

import '../../../common/WorkloadTypePalette.dart';
import '../../../interfaces/score.interface.dart';

class WorkloadScoreTable extends StatelessWidget {
  final List<WorkloadScore> workloads;
  final ValueChanged<WorkloadScore> onEnterScore;
  final int? savingWorkloadId;
  final bool canEditScores;

  const WorkloadScoreTable({
    super.key,
    required this.workloads,
    required this.onEnterScore,
    this.savingWorkloadId,
    this.canEditScores = true,
  });

  @override
  Widget build(BuildContext context) {
    final scoredWorkloads = workloads.where((workload) => workload.hasScore);
    final actual = scoredWorkloads.fold<double>(
      0,
      (sum, workload) => sum + workload.actualScore!,
    );
    final maximum = scoredWorkloads.fold<double>(
      0,
      (sum, workload) => sum + workload.maxScore!,
    );

    return Container(
      key: const Key('workload-score-table'),
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBFC),
        border: Border.all(color: const Color(0xFFEFC9D7)),
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 210;
          return Column(
            children: [
              _ScoreTableHeader(compact: compact),
              if (workloads.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 28),
                  child: Column(
                    children: [
                      Icon(
                        Icons.assignment_outlined,
                        size: 25,
                        color: Color(0xFFD89BAF),
                      ),
                      SizedBox(height: 7),
                      Text(
                        'ยังไม่มีงานในวิชานี้',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFFA67A89),
                        ),
                      ),
                    ],
                  ),
                )
              else
                ...List.generate(
                  workloads.length,
                  (index) => _WorkloadScoreRow(
                    key: Key('workload-score-row-$index'),
                    number: index + 1,
                    workload: workloads[index],
                    isSaving: savingWorkloadId == workloads[index].workloadId,
                    onEnterScore: () => onEnterScore(workloads[index]),
                    canEditScores: canEditScores,
                    compact: compact,
                  ),
                ),
              Container(
                key: const Key('subject-score-total'),
                constraints: const BoxConstraints(minHeight: 42),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 7,
                ),
                decoration: const BoxDecoration(
                  color: Color(0xFFFCE7EE),
                  border: Border(top: BorderSide(color: Color(0xFFEFC9D7))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    const Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'คะแนนรวม',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF925B70),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      constraints: const BoxConstraints(minWidth: 58),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: const [
                          BoxShadow(color: Color(0x12000000), blurRadius: 3),
                        ],
                      ),
                      child: Text(
                        '${_scoreText(actual)}/${_scoreText(maximum)}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFFB05D79),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ScoreTableHeader extends StatelessWidget {
  final bool compact;

  const _ScoreTableHeader({required this.compact});

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      fontSize: 10,
      color: Color(0xFF925B70),
      fontWeight: FontWeight.w500,
    );
    return Container(
      height: 36,
      color: const Color(0xFFF8D8E3),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          SizedBox(
            width: compact ? 24 : 30,
            child: Text('ลำดับ', style: style),
          ),
          Expanded(child: Text('งาน', style: style)),
          SizedBox(
            width: compact ? 76 : 96,
            child: Text('ประเภท', textAlign: TextAlign.center, style: style),
          ),
          SizedBox(
            width: compact ? 48 : 54,
            child: Text('คะแนน', textAlign: TextAlign.right, style: style),
          ),
        ],
      ),
    );
  }
}

class _WorkloadScoreRow extends StatelessWidget {
  final int number;
  final WorkloadScore workload;
  final bool isSaving;
  final VoidCallback onEnterScore;
  final bool canEditScores;
  final bool compact;

  const _WorkloadScoreRow({
    super.key,
    required this.number,
    required this.workload,
    required this.isSaving,
    required this.onEnterScore,
    required this.canEditScores,
    required this.compact,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 46),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFF5E1E8))),
      ),
      child: Row(
        children: [
          SizedBox(
            width: compact ? 24 : 30,
            child: Text(
              '$number',
              style: const TextStyle(fontSize: 11, color: Color(0xFF9AAEB8)),
            ),
          ),
          Expanded(
            child: Text(
              workload.workloadName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: Color(0xFF765E67)),
            ),
          ),
          SizedBox(
            width: compact ? 76 : 96,
            child: WorkloadTypeChip(
              key: Key('score-workload-type-${workload.workloadId}'),
              typeCode: workload.workloadTypeCode,
              typeName: workload.workloadTypeName,
            ),
          ),
          SizedBox(
            width: compact ? 48 : 54,
            child: isSaving
                ? const Center(
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : workload.hasScore
                ? Text(
                    '${_scoreText(workload.actualScore!)}/${_scoreText(workload.maxScore!)}',
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF765E67),
                      fontWeight: FontWeight.w500,
                    ),
                  )
                : !canEditScores
                ? const Text(
                    '—/—',
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: Color(0xFF765E67)),
                  )
                : TextButton(
                    key: Key('score-entry-${workload.workloadId}'),
                    onPressed: onEnterScore,
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF765E67),
                      minimumSize: const Size(0, 30),
                      padding: EdgeInsets.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('—/—', style: TextStyle(fontSize: 11)),
                  ),
          ),
        ],
      ),
    );
  }
}

class WorkloadTypeChip extends StatelessWidget {
  final String typeCode;
  final String typeName;

  const WorkloadTypeChip({
    super.key,
    required this.typeCode,
    required this.typeName,
  });

  @override
  Widget build(BuildContext context) {
    final palette = workloadTypePalette(typeCode.isEmpty ? typeName : typeCode);
    return Center(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(
          color: palette.normal,
          border: Border.all(color: Colors.black.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(999),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            workloadTypeCodeLabel(typeCode.isEmpty ? typeName : typeCode),
            textAlign: TextAlign.center,
            maxLines: 1,
            style: const TextStyle(fontSize: 10.5, color: Color(0x99000000)),
          ),
        ),
      ),
    );
  }
}

String _scoreText(double value) {
  return value == value.roundToDouble()
      ? value.toInt().toString()
      : value
            .toStringAsFixed(2)
            .replaceFirst(RegExp(r'0+$'), '')
            .replaceFirst(RegExp(r'\.$'), '');
}
