import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import 'ExamHistoryCard.dart';

class ExamHistorySection extends StatefulWidget {
  final List<ExamHistoryItem> history;

  const ExamHistorySection({super.key, required this.history});

  @override
  State<ExamHistorySection> createState() => _ExamHistorySectionState();
}

class _ExamHistorySectionState extends State<ExamHistorySection> {
  int _selectedIndex = 0;

  @override
  void didUpdateWidget(covariant ExamHistorySection oldWidget) {
    super.didUpdateWidget(oldWidget);
    final subjectCount = _groupHistory(widget.history).length;
    if (subjectCount == 0) {
      _selectedIndex = 0;
    } else if (_selectedIndex >= subjectCount) {
      _selectedIndex = subjectCount - 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final subjects = _groupHistory(widget.history);
    return Column(
      key: const Key('exam-history-section'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ประวัติการทำข้อสอบ',
          style: TextStyle(
            fontSize: 15,
            color: Color(0xFF536C77),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 10),
        if (subjects.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 13),
            child: Text(
              'ยังไม่มีประวัติการทำข้อสอบ',
              style: TextStyle(fontSize: 11, color: Color(0xFF94A3A9)),
            ),
          )
        else ...[
          _HistorySubjectTabs(
            subjects: subjects,
            selectedIndex: _selectedIndex,
            onSelected: (index) => setState(() => _selectedIndex = index),
          ),
          Transform.translate(
            offset: const Offset(0, -1),
            child: _SubjectHistoryPanel(subject: subjects[_selectedIndex]),
          ),
        ],
      ],
    );
  }
}

class _SubjectHistoryPanel extends StatelessWidget {
  final _HistorySubject subject;

  const _SubjectHistoryPanel({required this.subject});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: Key('exam-history-subject-${subject.subjectKey}'),
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(7, 8, 7, 7),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFEFB),
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFD7E3E8)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C000000),
            blurRadius: 5,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 0, 2, 7),
            child: Text(
              subject.subjectName,
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF6C6668)),
            ),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(11),
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFBDB8B9), width: 0.7),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Column(
                children: [
                  const _HistoryTableHeader(),
                  for (var index = 0; index < subject.items.length; index++)
                    ExamHistoryCard(
                      item: subject.items[index],
                      attemptNumber: index + 1,
                    ),
                  const SizedBox(
                    key: Key('exam-history-table-footer'),
                    width: double.infinity,
                    height: 17,
                    child: ColoredBox(color: Color(0xFFFBC5D1)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTableHeader extends StatelessWidget {
  const _HistoryTableHeader();

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 10, color: Color(0xFF75696C));
    return SizedBox(
      height: 33,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _HeaderCell(width: 44, text: 'รอบ', style: style),
          _HeaderCell(width: 66, text: 'คะแนน', style: style),
          const Expanded(
            child: _HeaderCell(
              text: 'เรื่องที่อ่อน',
              style: style,
              showRightBorder: false,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderCell extends StatelessWidget {
  final double? width;
  final String text;
  final TextStyle style;
  final bool showRightBorder;

  const _HeaderCell({
    this.width,
    required this.text,
    required this.style,
    this.showRightBorder = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFFFBC5D1),
        border: Border(
          right: showRightBorder
              ? const BorderSide(color: Color(0xFFB18F96), width: 0.7)
              : BorderSide.none,
          bottom: const BorderSide(color: Color(0xFFB18F96), width: 0.7),
        ),
      ),
      child: Text(text, style: style),
    );
  }
}

class _HistorySubjectTabs extends StatelessWidget {
  final List<_HistorySubject> subjects;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _HistorySubjectTabs({
    required this.subjects,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final order = <int>[
      selectedIndex,
      for (var index = 0; index < subjects.length; index++)
        if (index != selectedIndex) index,
    ];
    final contentWidth = 104.0 + (52.0 * (subjects.length - 1));

    return SizedBox(
      key: const Key('exam-history-subject-tabs'),
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
                  top: order[visualIndex] == selectedIndex ? 0 : 4,
                  child: _HistorySubjectTab(
                    subject: subjects[order[visualIndex]],
                    selected: order[visualIndex] == selectedIndex,
                    onPressed: () => onSelected(order[visualIndex]),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HistorySubjectTab extends StatelessWidget {
  final _HistorySubject subject;
  final bool selected;
  final VoidCallback onPressed;

  const _HistorySubjectTab({
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
        key: Key('exam-history-subject-tab-${subject.subjectKey}'),
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

class _HistorySubject {
  final String subjectKey;
  final String subjectName;
  final List<ExamHistoryItem> items;

  const _HistorySubject({
    required this.subjectKey,
    required this.subjectName,
    required this.items,
  });
}

List<_HistorySubject> _groupHistory(List<ExamHistoryItem> history) {
  final grouped = <String, List<ExamHistoryItem>>{};
  final names = <String, String>{};
  for (final item in history) {
    final key = item.subjectId.isNotEmpty ? item.subjectId : item.subjectName;
    grouped.putIfAbsent(key, () => []).add(item);
    names[key] = item.subjectName;
  }
  return grouped.entries.map((entry) {
    final items = [...entry.value]
      ..sort((left, right) {
        final leftDate = left.examDate;
        final rightDate = right.examDate;
        if (leftDate != null && rightDate != null) {
          final dateOrder = leftDate.compareTo(rightDate);
          if (dateOrder != 0) return dateOrder;
        }
        return left.historyId.compareTo(right.historyId);
      });
    return _HistorySubject(
      subjectKey: entry.key,
      subjectName: names[entry.key] ?? entry.key,
      items: items,
    );
  }).toList();
}
