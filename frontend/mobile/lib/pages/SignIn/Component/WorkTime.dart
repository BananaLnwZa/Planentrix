import 'package:flutter/material.dart';

const String _fontFamily = 'Sansation';
const Color _inputBorderColor = Color(0x4D000000);

class WorkTime extends StatefulWidget {
  const WorkTime({super.key});

  @override
  State<WorkTime> createState() => _WorkTimeState();
}

class _WorkTimeState extends State<WorkTime> {
  String? selected;
  String? hovered;

  final List<Map<String, dynamic>> timeSlots = [
    {"id": "morning", "label": "เช้า", "color": const Color(0xFFBBDEF4)},
    {"id": "noon", "label": "กลางวัน", "color": const Color(0xFFF7E380)},
    {"id": "evening", "label": "เย็น", "color": const Color(0xFFFB9A92)},
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "เลือกช่วงเวลาทำงาน",
          style: TextStyle(
            fontFamily: _fontFamily,
            fontWeight: FontWeight.w300,
            fontSize: 14,
            color: Colors.black87,
          ),
        ),

        const SizedBox(height: 10),

        Row(
          children: List.generate(timeSlots.length, (index) {
            final slot = timeSlots[index];

            final String id = slot["id"];
            final String label = slot["label"];
            final Color color = slot["color"];

            final bool isSelected = selected == id;
            final bool isHovered = hovered == id;
            final bool isActive = isSelected || isHovered;

            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                  left: index == 0 ? 0 : 4,
                  right: index == timeSlots.length - 1 ? 0 : 4,
                ),
                child: MouseRegion(
                  cursor: SystemMouseCursors.click,
                  onEnter: (_) {
                    setState(() {
                      hovered = id;
                    });
                  },
                  onExit: (_) {
                    setState(() {
                      hovered = null;
                    });
                  },
                  child: AnimatedScale(
                    scale: isHovered ? 1.03 : 1,
                    duration: const Duration(milliseconds: 180),
                    child: SizedBox(
                      height: 46,
                      child: OutlinedButton(
                        key: Key('work-time-$id'),
                        onPressed: () {
                          setState(() {
                            selected = id;
                          });
                        },
                        style: ButtonStyle(
                          elevation: WidgetStateProperty.all(0),

                          backgroundColor: WidgetStateProperty.all(
                            isActive ? color : Colors.white,
                          ),

                          foregroundColor: WidgetStateProperty.all(
                            isActive ? Colors.white : Colors.black87,
                          ),

                          side: WidgetStateProperty.all(
                            BorderSide(
                              color: isActive ? color : _inputBorderColor,
                              width: 1,
                            ),
                          ),

                          overlayColor: WidgetStateProperty.all(
                            Colors.transparent,
                          ),

                          padding: WidgetStateProperty.all(
                            const EdgeInsets.symmetric(horizontal: 8),
                          ),

                          shape: WidgetStateProperty.all(
                            RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(25),
                            ),
                          ),
                        ),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            label,
                            maxLines: 1,
                            style: TextStyle(
                              fontFamily: _fontFamily,
                              fontSize: 14,
                              fontWeight: FontWeight.w300,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
