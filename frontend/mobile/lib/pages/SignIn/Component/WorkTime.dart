import 'package:flutter/material.dart';

class WorkTime extends StatefulWidget {
  const WorkTime({super.key});

  @override
  State<WorkTime> createState() => _WorkTimeState();
}

class _WorkTimeState extends State<WorkTime> {
  String? selected;

  Widget buildButton({
    required String id,
    required String label,
    required Color color,
  }) {
    final bool isSelected = selected == id;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            selected = id;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(
            vertical: 12,
          ),
          decoration: BoxDecoration(
            color: isSelected
                ? color
                : Colors.white,
            borderRadius:
                BorderRadius.circular(30),
            border: Border.all(
              color: isSelected
                  ? color
                  : Colors.grey.shade300,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected
                    ? Colors.white
                    : Colors.black87,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        const Text(
          "ช่วงเวลาทำงาน",
          style: TextStyle(
            fontSize: 14,
          ),
        ),

        const SizedBox(height: 10),

        Row(
          children: [
            buildButton(
              id: "morning",
              label: "ช่วงเช้า",
              color: const Color(0xFFBBDEF4),
            ),

            const SizedBox(width: 10),

            buildButton(
              id: "noon",
              label: "ช่วงกลางวัน",
              color: const Color(0xFFF7E380),
            ),

            const SizedBox(width: 10),

            buildButton(
              id: "evening",
              label: "ช่วงเย็น",
              color: const Color(0xFFFB9A92),
            ),
          ],
        ),
      ],
    );
  }
}