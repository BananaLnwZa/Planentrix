import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class TestSubjectTabs extends StatelessWidget {
  final List<ExamSummary> subjects;
  final String selectedSubjectId;
  final ValueChanged<String> onSelected;

  const TestSubjectTabs({
    super.key,
    required this.subjects,
    required this.selectedSubjectId,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final selectedIndex = subjects.indexWhere(
      (subject) => subject.subjectId == selectedSubjectId,
    );
    final resolvedSelectedIndex = selectedIndex < 0 ? 0 : selectedIndex;
    final order = <int>[
      resolvedSelectedIndex,
      for (var index = 0; index < subjects.length; index++)
        if (index != resolvedSelectedIndex) index,
    ];
    final contentWidth = subjects.isEmpty
        ? 0.0
        : 104.0 + (52.0 * (subjects.length - 1));

    return SizedBox(
      key: const Key('test-subject-tabs'),
      width: double.infinity,
      height: 44,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SizedBox(
          width: contentWidth,
          height: 44,
          child: Stack(
            children: [
              for (
                var visualIndex = order.length - 1;
                visualIndex >= 0;
                visualIndex--
              )
                Positioned(
                  left: visualIndex * 52,
                  top: order[visualIndex] == resolvedSelectedIndex ? 0 : 4,
                  child: _TestSubjectTab(
                    subject: subjects[order[visualIndex]],
                    selected: order[visualIndex] == resolvedSelectedIndex,
                    onPressed: () =>
                        onSelected(subjects[order[visualIndex]].subjectId),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TestSubjectTab extends StatelessWidget {
  final ExamSummary subject;
  final bool selected;
  final VoidCallback onPressed;

  const _TestSubjectTab({
    required this.subject,
    required this.selected,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFF78C0E4) : const Color(0xFFDDEEF6),
      elevation: selected ? 3 : 1,
      shadowColor: const Color(0x2E458CAF),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(9)),
        side: BorderSide(
          color: selected ? const Color(0xFF68B1D6) : const Color(0xFFBDD7E4),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: Key('test-subject-tab-${subject.subjectId}'),
        onTap: onPressed,
        child: SizedBox(
          width: 104,
          height: selected ? 42 : 38,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
            child: Center(
              child: Text(
                subject.subjectName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selected ? Colors.white : const Color(0xFF7392A2),
                  fontSize: 10,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  height: 1.15,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
