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
        color: selected ? const Color(0xFFDDF3C8) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: selected ? const Color(0xFF92BE6E) : const Color(0xFFD7D7D7),
          width: selected ? 1.4 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: Key('exam-choice-${choice.choiceId}'),
          onTap: onPressed,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            child: Row(
              children: [
                Container(
                  width: 23,
                  height: 23,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: selected
                        ? const Color(0xFF96C671)
                        : const Color(0xFFF3F3F3),
                  ),
                  child: Text(
                    String.fromCharCode(64 + choice.order.clamp(1, 26)),
                    style: TextStyle(
                      fontSize: 11,
                      color: selected ? Colors.white : const Color(0xFF6F7C82),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    choice.text,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF455E69),
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
