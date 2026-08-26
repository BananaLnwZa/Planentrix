import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';

class ExamChoiceButton extends StatelessWidget {
  final ExamChoice choice;
  final bool selected;
  final VoidCallback onPressed;

  const ExamChoiceButton({
    super.key,
    required this.choice,
    required this.selected,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 130),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFBFE59E) : const Color(0xFFF8FBFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? const Color(0xFF74A951) : const Color(0xFFBFC8CC),
        ),
        boxShadow: selected
            ? const [
                BoxShadow(
                  color: Color(0x33538436),
                  blurRadius: 5,
                  offset: Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: Key('exam-choice-${choice.choiceId}'),
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          hoverColor: selected ? Colors.transparent : const Color(0xFFDDEFF6),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: selected
                        ? const Color(0xFF6FA64C)
                        : const Color(0xFFDCE8ED),
                  ),
                  child: Text(
                    String.fromCharCode(64 + choice.order.clamp(1, 26)),
                    style: TextStyle(
                      fontSize: 11,
                      color: selected ? Colors.white : const Color(0xFF536D78),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    choice.text,
                    style: TextStyle(
                      fontSize: 13,
                      color: selected
                          ? const Color(0xFF365327)
                          : const Color(0xFF405B69),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
