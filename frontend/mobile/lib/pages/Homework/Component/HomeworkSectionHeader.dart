import 'package:flutter/material.dart';

import '../../../interfaces/homework.interface.dart';

class HomeworkSectionHeader extends StatelessWidget {
  final String title;
  final HomeworkSectionType type;
  final double scale;

  const HomeworkSectionHeader({
    super.key,
    required this.title,
    required this.type,
    required this.scale,
  });

  Color get _backgroundColor => switch (type) {
    HomeworkSectionType.tomorrow => const Color(0xFFFFEE9C),
    HomeworkSectionType.date => const Color(0xFFD7F2B6),
    HomeworkSectionType.overdue => const Color(0xFFFFCED5),
  };

  Color get _borderColor => switch (type) {
    HomeworkSectionType.tomorrow => const Color(0xFFD9CB86),
    HomeworkSectionType.date => const Color(0xFFA5BE85),
    HomeworkSectionType.overdue => const Color(0xFFE5A4AE),
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72 * scale,
      height: 21 * scale,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.horizontal(
          right: Radius.circular(8 * scale),
        ),
        border: Border(
          top: BorderSide(color: _borderColor, width: scale),
          right: BorderSide(color: _borderColor, width: scale),
          bottom: BorderSide(color: _borderColor, width: scale),
        ),
      ),
      child: Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: const Color(0xB3000000),
          fontSize: 10 * scale,
          height: 1,
        ),
      ),
    );
  }
}
