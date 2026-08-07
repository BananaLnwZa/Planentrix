import 'package:flutter/material.dart';

import '../../../interfaces/homework.interface.dart';
import 'SubmitHomeworkButton.dart';

class HomeworkTaskCard extends StatelessWidget {
  final HomeworkTaskData task;
  final double scale;
  final VoidCallback onSubmit;
  final VoidCallback onOpenDetails;
  final bool isSubmitting;

  const HomeworkTaskCard({
    super.key,
    required this.task,
    required this.scale,
    required this.onSubmit,
    required this.onOpenDetails,
    this.isSubmitting = false,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'ดูรายละเอียด ${task.assignment}',
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onOpenDetails,
          child: Container(
            height: 35 * scale,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8 * scale),
              border: Border.all(color: const Color(0x4D000000), width: scale),
              boxShadow: [
                BoxShadow(
                  color: const Color(0x40000000),
                  blurRadius: 3 * scale,
                  offset: Offset(scale, scale),
                ),
              ],
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                return Stack(
                  children: [
                    Positioned(
                      left: width * 0.0438,
                      top: 14 * scale,
                      width: width * 0.36,
                      child: _CardText(task.subject, fontSize: 8 * scale),
                    ),
                    Positioned(
                      left: width * 0.4234,
                      top: 14 * scale,
                      width: width * 0.25,
                      child: _CardText(task.assignment, fontSize: 8 * scale),
                    ),
                    Positioned(
                      left: width * 0.6934,
                      top: 5 * scale,
                      width: width * 0.14,
                      child: _CardText('กำหนดส่ง', fontSize: 6 * scale),
                    ),
                    Positioned(
                      left: width * 0.6861,
                      top: 14 * scale,
                      width: width * 0.15,
                      child: _CardText(task.dueDate, fontSize: 6 * scale),
                    ),
                    Positioned(
                      left: width * 0.6934,
                      top: 23 * scale,
                      width: width * 0.14,
                      child: _CardText(task.dueTime, fontSize: 6 * scale),
                    ),
                    Positioned(
                      left: width * 0.8504,
                      top: 10 * scale,
                      width: width * 0.1095,
                      height: 15 * scale,
                      child: SubmitHomeworkButton(
                        scale: scale,
                        onPressed: onSubmit,
                        isLoading: isSubmitting,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _CardText extends StatelessWidget {
  final String text;
  final double fontSize;

  const _CardText(this.text, {required this.fontSize});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        color: const Color(0xFF374957),
        fontSize: fontSize,
        height: 1,
      ),
    );
  }
}
