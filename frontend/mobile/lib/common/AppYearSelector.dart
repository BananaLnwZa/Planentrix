// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/material.dart';

DateTime appDateWithYear({
  required DateTime value,
  required int year,
  required DateTime firstDate,
  required DateTime lastDate,
}) {
  final lastDay = DateTime(year, value.month + 1, 0).day;
  var next = DateTime(year, value.month, math.min(value.day, lastDay));
  final first = DateUtils.dateOnly(firstDate);
  final last = DateUtils.dateOnly(lastDate);

  if (next.isBefore(first)) next = first;
  if (next.isAfter(last)) next = last;
  return next;
}

class AppYearSelector extends StatelessWidget {
  final int value;
  final int firstYear;
  final int lastYear;
  final Color accentColor;
  final ValueChanged<int> onChanged;

  const AppYearSelector({
    super.key,
    required this.value,
    required this.firstYear,
    required this.lastYear,
    required this.accentColor,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final years = List<int>.generate(
      lastYear - firstYear + 1,
      (index) => firstYear + index,
    );

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        const Text(
          'ปี',
          style: TextStyle(
            color: Color(0xFF657983),
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          width: 108,
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: accentColor.withValues(alpha: 0.45)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              key: const Key('app-year-selector'),
              value: value,
              isExpanded: true,
              menuMaxHeight: 280,
              borderRadius: BorderRadius.circular(16),
              iconEnabledColor: accentColor,
              items: years
                  .map(
                    (year) => DropdownMenuItem<int>(
                      value: year,
                      child: Center(
                        child: Text(
                          year.toString(),
                          style: const TextStyle(
                            color: Color(0xFF405762),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (year) {
                if (year != null) onChanged(year);
              },
            ),
          ),
        ),
      ],
    );
  }
}
