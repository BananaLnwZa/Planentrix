import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class ExamHistoryCard extends StatelessWidget {
  final ExamHistoryItem item;
  final int attemptNumber;

  const ExamHistoryCard({
    super.key,
    required this.item,
    required this.attemptNumber,
  });

  @override
  Widget build(BuildContext context) {
    final weakestTopic = _weakestTopic(item.weakTopics);
    return ConstrainedBox(
      key: Key('exam-history-${item.historyId}'),
      constraints: const BoxConstraints(minHeight: 35),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _HistoryCell(
              width: 44,
              alignment: Alignment.center,
              child: Text(
                '$attemptNumber',
                style: const TextStyle(fontSize: 10, color: Color(0xFF776E70)),
              ),
            ),
            _HistoryCell(
              width: 66,
              alignment: Alignment.center,
              child: Text(
                '${_number(item.actualScore)}/${_number(item.maximumScore)}',
                style: const TextStyle(fontSize: 10, color: Color(0xFF776E70)),
              ),
            ),
            Expanded(
              child: _HistoryCell(
                alignment: Alignment.centerLeft,
                showRightBorder: false,
                child: Text(
                  weakestTopic?.topicName ?? '—',
                  key: Key('exam-history-weak-topic-${item.historyId}'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFF776E70),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryCell extends StatelessWidget {
  final double? width;
  final Alignment alignment;
  final bool showRightBorder;
  final Widget child;

  const _HistoryCell({
    this.width,
    required this.alignment,
    this.showRightBorder = true,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          right: showRightBorder
              ? const BorderSide(color: Color(0xFFBDB8B9), width: 0.7)
              : BorderSide.none,
          bottom: const BorderSide(color: Color(0xFFBDB8B9), width: 0.7),
        ),
      ),
      child: child,
    );
  }
}

ExamHistoryWeakTopic? _weakestTopic(List<ExamHistoryWeakTopic> topics) {
  if (topics.isEmpty) return null;
  return topics.reduce(
    (weakest, current) =>
        current.percentage < weakest.percentage ? current : weakest,
  );
}

String _number(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toStringAsFixed(1);
