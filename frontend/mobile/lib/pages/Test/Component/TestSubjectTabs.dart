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
    return SizedBox(
      key: const Key('test-subject-tabs'),
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 2),
        itemCount: subjects.length,
        separatorBuilder: (_, _) => const SizedBox(width: 7),
        itemBuilder: (context, index) {
          final subject = subjects[index];
          final selected = subject.subjectId == selectedSubjectId;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            decoration: BoxDecoration(
              color: selected
                  ? const Color(0xFF8CCBE8)
                  : const Color(0xFFDDF1FA),
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: const Color(0xFFB7D9E8)),
              boxShadow: selected
                  ? const [
                      BoxShadow(
                        color: Color(0x2482B6CF),
                        blurRadius: 5,
                        offset: Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                key: Key('test-subject-tab-${subject.subjectId}'),
                onTap: () => onSelected(subject.subjectId),
                borderRadius: BorderRadius.circular(17),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 15),
                  child: Center(
                    child: Text(
                      subject.subjectName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: selected
                            ? Colors.white
                            : const Color(0xFF587587),
                        fontSize: 12,
                        fontWeight: selected
                            ? FontWeight.w600
                            : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
