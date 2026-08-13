// ignore_for_file: file_names

import 'package:flutter/material.dart';

class AppSundayFirstCalendar extends StatelessWidget {
  final Widget child;

  const AppSundayFirstCalendar({super.key, required this.child});

  @override
  Widget build(BuildContext context) => Localizations.override(
    context: context,
    delegates: const [_AppCalendarLocalizationsDelegate()],
    child: child,
  );
}

class _AppCalendarLocalizations extends DefaultMaterialLocalizations {
  const _AppCalendarLocalizations();

  @override
  int get firstDayOfWeekIndex => 0;

  @override
  List<String> get narrowWeekdays => const [
    'อา.',
    'จ.',
    'อ.',
    'พ.',
    'พฤ.',
    'ศ.',
    'ส.',
  ];
}

class _AppCalendarLocalizationsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const _AppCalendarLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<MaterialLocalizations> load(Locale locale) async =>
      const _AppCalendarLocalizations();

  @override
  bool shouldReload(_AppCalendarLocalizationsDelegate old) => false;
}
