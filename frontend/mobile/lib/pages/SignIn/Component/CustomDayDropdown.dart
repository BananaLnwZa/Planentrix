import 'package:flutter/material.dart';

import '../../../common/AppDropdown.dart';

class CustomDayDropdown extends StatelessWidget {
  final String? value;
  final ValueChanged<String> onChanged;

  const CustomDayDropdown({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => AppDropdown<String>(
    value: value,
    hintText: 'เลือกวันที่ต้องการหยุด',
    maxMenuHeight: 340,
    onChanged: (value) => onChanged(value!),
    items: const [
      AppDropdownItem(
        value: 'Monday',
        label: 'Monday',
        accentColor: Color(0xFFB99D00),
        borderColor: Color(0xFFF7E380),
        optionKey: Key('day-dropdown-option-Monday'),
      ),
      AppDropdownItem(
        value: 'Tuesday',
        label: 'Tuesday',
        accentColor: Color(0xFFD86F95),
        borderColor: Color(0xFFF5B5CB),
        optionKey: Key('day-dropdown-option-Tuesday'),
      ),
      AppDropdownItem(
        value: 'Wednesday',
        label: 'Wednesday',
        accentColor: Color(0xFF6FA844),
        borderColor: Color(0xFFB5E48C),
        optionKey: Key('day-dropdown-option-Wednesday'),
      ),
      AppDropdownItem(
        value: 'Thursday',
        label: 'Thursday',
        accentColor: Color(0xFFD97D3E),
        borderColor: Color(0xFFFBC49C),
        optionKey: Key('day-dropdown-option-Thursday'),
      ),
      AppDropdownItem(
        value: 'Friday',
        label: 'Friday',
        accentColor: Color(0xFFAE79C8),
        borderColor: Color(0xFFD8B8E8),
        optionKey: Key('day-dropdown-option-Friday'),
      ),
      AppDropdownItem(
        value: 'Saturday',
        label: 'Saturday',
        accentColor: Color(0xFF4A9BCD),
        borderColor: Color(0xFF71B7E4),
        optionKey: Key('day-dropdown-option-Saturday'),
      ),
      AppDropdownItem(
        value: 'Sunday',
        label: 'Sunday',
        accentColor: Color(0xFFDF6259),
        borderColor: Color(0xFFFB9A92),
        optionKey: Key('day-dropdown-option-Sunday'),
      ),
    ],
  );
}
