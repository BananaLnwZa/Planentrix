import 'package:flutter/material.dart';

import '../../../common/WorkloadTypePalette.dart';
import '../../../interfaces/score.interface.dart';

class WorkloadScoreTable extends StatelessWidget {
  final List<WorkloadScore> workloads;
  final ValueChanged<WorkloadScore> onEnterScore;
  final int? savingWorkloadId;

  const WorkloadScoreTable({
    super.key,
    required this.workloads,
    required this.onEnterScore,
    this.savingWorkloadId,
  });

  @override
  Widget build(BuildContext context) {
    final actual = workloads
        .fold<double>(0, (sum, workload) => sum + (workload.actualScore ?? 0))
        .clamp(0, 100)
        .toDouble();

    return Container(
      key: const Key('workload-score-table'),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBFC),
        border: Border.all(color: const Color(0xFFEFC9D7)),
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          const _ScoreTableHeader(),
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
                    style: TextStyle(fontSize: 12, color: Color(0xFFA67A89)),
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
              ),
            ),
          Container(
            key: const Key('subject-score-total'),
            constraints: const BoxConstraints(minHeight: 42),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
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
                      style: TextStyle(fontSize: 12, color: Color(0xFF925B70)),
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
                    '${_scoreText(actual)}/100',
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
      ),
    );
  }
}

class _ScoreTableHeader extends StatelessWidget {
  const _ScoreTableHeader();

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
      child: const Row(
        children: [
          SizedBox(width: 30, child: Text('ลำดับ', style: style)),
          Expanded(child: Text('งาน', style: style)),
          SizedBox(
            width: 72,
            child: Text('ประเภท', textAlign: TextAlign.center, style: style),
          ),
          SizedBox(
            width: 54,
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

  const _WorkloadScoreRow({
    super.key,
    required this.number,
    required this.workload,
    required this.isSaving,
    required this.onEnterScore,
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
            width: 30,
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
            width: 72,
            child: WorkloadTypeChip(
              key: Key('score-workload-type-${workload.workloadId}'),
              typeName: workload.workloadTypeName,
            ),
          ),
          SizedBox(
            width: 54,
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
  final String typeName;

  const WorkloadTypeChip({super.key, required this.typeName});

  @override
  Widget build(BuildContext context) {
    final palette = workloadTypePalette(typeName);
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 68),
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: palette.normal,
          border: Border.all(color: const Color(0x4D000000)),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          typeName,
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 10, color: Color(0x99000000)),
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
