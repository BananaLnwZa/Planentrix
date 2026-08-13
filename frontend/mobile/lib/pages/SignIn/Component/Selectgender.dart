import 'package:flutter/material.dart';

import '../../../common/AppDropdown.dart';

class SelectGender extends StatelessWidget {
  final String? value;
  final ValueChanged<String>? onChanged;

  const SelectGender({super.key, this.value, this.onChanged});

  @override
  Widget build(BuildContext context) => AppDropdown<String>(
    value: value,
    labelText: 'gender',
    hintText: 'select gender',
    onChanged: onChanged == null ? null : (value) => onChanged!(value!),
    items: const [
      AppDropdownItem(
        value: 'Male',
        label: 'Male',
        accentColor: Color(0xFF73B6DD),
        borderColor: Color(0xFFBBDEF4),
      ),
      AppDropdownItem(
        value: 'Female',
        label: 'Female',
        accentColor: Color(0xFFDE7898),
        borderColor: Color(0xFFF5B8CA),
      ),
      AppDropdownItem(
        value: 'Other',
        label: 'Other',
        accentColor: Color(0xFFAE79C8),
        borderColor: Color(0xFFD8B8E8),
      ),
    ],
  );
}
