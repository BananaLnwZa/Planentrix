// ignore_for_file: file_names

import 'package:flutter/material.dart';

import 'AppCalendarLocalizations.dart';
import 'AppTimePicker.dart';
import 'AppYearSelector.dart';
import 'DateTimeFormat.dart';

const appDateTimePickerColor = appTimePickerColor;

Future<DateTime?> showAppDateTimePicker({
  required BuildContext context,
  required DateTime initialDateTime,
  required DateTime firstDate,
  required DateTime lastDate,
  String title = 'เลือกวันและเวลา',
}) {
  return showDialog<DateTime>(
    context: context,
    useRootNavigator: true,
    barrierColor: const Color(0x26000000),
    builder: (_) => _AppDateTimePickerDialog(
      initialDateTime: initialDateTime,
      firstDate: firstDate,
      lastDate: lastDate,
      title: title,
    ),
  );
}

class _AppDateTimePickerDialog extends StatefulWidget {
  final DateTime initialDateTime;
  final DateTime firstDate;
  final DateTime lastDate;
  final String title;

  const _AppDateTimePickerDialog({
    required this.initialDateTime,
    required this.firstDate,
    required this.lastDate,
    required this.title,
  });

  @override
  State<_AppDateTimePickerDialog> createState() =>
      _AppDateTimePickerDialogState();
}

class _AppDateTimePickerDialogState extends State<_AppDateTimePickerDialog> {
  late DateTime _date;
  late int _hour;
  late int _minute;

  @override
  void initState() {
    super.initState();
    _date = widget.initialDateTime;
    _hour = widget.initialDateTime.hour;
    _minute = widget.initialDateTime.minute;
  }

  DateTime get _value =>
      DateTime(_date.year, _date.month, _date.day, _hour, _minute);

  DateTime get _firstDateInSelectedYear {
    final firstOfYear = DateTime(_date.year);
    return firstOfYear.isBefore(widget.firstDate)
        ? widget.firstDate
        : firstOfYear;
  }

  DateTime get _lastDateInSelectedYear {
    final lastOfYear = DateTime(_date.year, 12, 31);
    return lastOfYear.isAfter(widget.lastDate) ? widget.lastDate : lastOfYear;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('app-date-time-picker-dialog'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 370, maxHeight: 610),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFDFB),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: appDateTimePickerColor.withValues(alpha: 0.45),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x24000000),
              blurRadius: 30,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.calendar_month_rounded,
                    color: appDateTimePickerColor,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: const TextStyle(
                        color: Color(0xFF374957),
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, size: 20),
                    color: const Color(0xFF839198),
                  ),
                ],
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF8F1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  formatDisplayDateTime(_value),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF385B44),
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              AppYearSelector(
                value: _date.year,
                firstYear: widget.firstDate.year,
                lastYear: widget.lastDate.year,
                accentColor: appDateTimePickerColor,
                onChanged: (year) => setState(() {
                  _date = appDateWithYear(
                    value: _date,
                    year: year,
                    firstDate: widget.firstDate,
                    lastDate: widget.lastDate,
                  );
                }),
              ),
              Theme(
                data: Theme.of(context).copyWith(
                  colorScheme: Theme.of(context).colorScheme.copyWith(
                    primary: appDateTimePickerColor,
                    onPrimary: Colors.white,
                    surface: const Color(0xFFFFFDFB),
                  ),
                ),
                child: AppSundayFirstCalendar(
                  child: CalendarDatePicker(
                    key: ValueKey('app-date-time-calendar-${_date.year}'),
                    initialDate: _date,
                    firstDate: _firstDateInSelectedYear,
                    lastDate: _lastDateInSelectedYear,
                    onDateChanged: (value) => setState(() => _date = value),
                  ),
                ),
              ),
              Row(
                children: [
                  const Icon(
                    Icons.access_time_rounded,
                    color: appDateTimePickerColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _DateTimeNumberSelector(
                      label: 'ชั่วโมง',
                      count: 24,
                      value: _hour,
                      onChanged: (value) => setState(() => _hour = value),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(8, 22, 8, 0),
                    child: Text(
                      ':',
                      style: TextStyle(fontSize: 22, color: Color(0xFF587064)),
                    ),
                  ),
                  Expanded(
                    child: _DateTimeNumberSelector(
                      label: 'นาที',
                      count: 60,
                      value: _minute,
                      onChanged: (value) => setState(() => _minute = value),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text(
                      'ยกเลิก',
                      style: TextStyle(color: Color(0xFF71838C)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () => Navigator.pop(context, _value),
                    style: FilledButton.styleFrom(
                      backgroundColor: appDateTimePickerColor,
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('ตกลง'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateTimeNumberSelector extends StatelessWidget {
  final String label;
  final int count;
  final int value;
  final ValueChanged<int> onChanged;

  const _DateTimeNumberSelector({
    required this.label,
    required this.count,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Color(0xFF84959D)),
        ),
        const SizedBox(height: 4),
        Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: const Color(0xFFD5E5DA)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: value,
              isExpanded: true,
              borderRadius: BorderRadius.circular(16),
              iconEnabledColor: appDateTimePickerColor,
              items: List.generate(
                count,
                (index) => DropdownMenuItem(
                  value: index,
                  child: Center(
                    child: Text(
                      index.toString().padLeft(2, '0'),
                      style: const TextStyle(
                        color: Color(0xFF385B44),
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ),
              onChanged: (next) {
                if (next != null) onChanged(next);
              },
            ),
          ),
        ),
      ],
    );
  }
}
