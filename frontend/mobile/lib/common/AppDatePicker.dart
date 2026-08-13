// ignore_for_file: file_names

import 'package:flutter/material.dart';

import 'AppCalendarLocalizations.dart';
import 'AppYearSelector.dart';

const appDatePickerColor = Color(0xFFF080A7);

Future<DateTime?> showAppDatePicker({
  required BuildContext context,
  required DateTime initialDate,
  required DateTime firstDate,
  required DateTime lastDate,
  String title = 'เลือกวันที่',
  Color accentColor = appDatePickerColor,
}) {
  return showDialog<DateTime>(
    context: context,
    useRootNavigator: true,
    barrierColor: const Color(0x26000000),
    builder: (_) => _AppDatePickerDialog(
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      title: title,
      accentColor: accentColor,
    ),
  );
}

class _AppDatePickerDialog extends StatefulWidget {
  final DateTime initialDate;
  final DateTime firstDate;
  final DateTime lastDate;
  final String title;
  final Color accentColor;

  const _AppDatePickerDialog({
    required this.initialDate,
    required this.firstDate,
    required this.lastDate,
    required this.title,
    required this.accentColor,
  });

  @override
  State<_AppDatePickerDialog> createState() => _AppDatePickerDialogState();
}

class _AppDatePickerDialogState extends State<_AppDatePickerDialog> {
  late DateTime _selected;

  DateTime get _firstDateInSelectedYear {
    final firstOfYear = DateTime(_selected.year);
    return firstOfYear.isBefore(widget.firstDate)
        ? widget.firstDate
        : firstOfYear;
  }

  DateTime get _lastDateInSelectedYear {
    final lastOfYear = DateTime(_selected.year, 12, 31);
    return lastOfYear.isAfter(widget.lastDate) ? widget.lastDate : lastOfYear;
  }

  @override
  void initState() {
    super.initState();
    _selected = widget.initialDate;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('app-date-picker-dialog'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360, maxHeight: 560),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFDFB),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: widget.accentColor.withValues(alpha: 0.4)),
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
              _PickerHeader(title: widget.title, accent: widget.accentColor),
              AppYearSelector(
                value: _selected.year,
                firstYear: widget.firstDate.year,
                lastYear: widget.lastDate.year,
                accentColor: widget.accentColor,
                onChanged: (year) => setState(() {
                  _selected = appDateWithYear(
                    value: _selected,
                    year: year,
                    firstDate: widget.firstDate,
                    lastDate: widget.lastDate,
                  );
                }),
              ),
              Theme(
                data: Theme.of(context).copyWith(
                  colorScheme: Theme.of(context).colorScheme.copyWith(
                    primary: widget.accentColor,
                    onPrimary: Colors.white,
                    surface: const Color(0xFFFFFDFB),
                  ),
                ),
                child: AppSundayFirstCalendar(
                  child: CalendarDatePicker(
                    key: ValueKey('app-date-calendar-${_selected.year}'),
                    initialDate: _selected,
                    firstDate: _firstDateInSelectedYear,
                    lastDate: _lastDateInSelectedYear,
                    onDateChanged: (value) => setState(() => _selected = value),
                  ),
                ),
              ),
              _PickerActions(
                accent: widget.accentColor,
                onCancel: () => Navigator.pop(context),
                onConfirm: () => Navigator.pop(context, _selected),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PickerHeader extends StatelessWidget {
  final String title;
  final Color accent;

  const _PickerHeader({required this.title, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.calendar_month_rounded, color: accent),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
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
    );
  }
}

class _PickerActions extends StatelessWidget {
  final Color accent;
  final VoidCallback onCancel;
  final VoidCallback onConfirm;

  const _PickerActions({
    required this.accent,
    required this.onCancel,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(
          onPressed: onCancel,
          child: const Text(
            'ยกเลิก',
            style: TextStyle(color: Color(0xFF71838C)),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: onConfirm,
          style: FilledButton.styleFrom(
            backgroundColor: accent,
            shape: const StadiumBorder(),
          ),
          child: const Text('ตกลง'),
        ),
      ],
    );
  }
}
