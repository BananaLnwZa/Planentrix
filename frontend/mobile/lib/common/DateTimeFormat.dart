// ignore_for_file: file_names

import 'package:flutter/material.dart';

String _twoDigits(int value) => value.toString().padLeft(2, '0');

String formatDisplayDate(DateTime value) {
  final local = value.toLocal();
  return '${_twoDigits(local.day)}/${_twoDigits(local.month)}/${local.year}';
}

String formatDisplayTime24(DateTime value) {
  final local = value.toLocal();
  return '${_twoDigits(local.hour)}:${_twoDigits(local.minute)}';
}

String formatDisplayDateTime(DateTime value) =>
    '${formatDisplayDate(value)} ${formatDisplayTime24(value)}';

String formatTimeOfDay24(TimeOfDay value) =>
    '${_twoDigits(value.hour)}:${_twoDigits(value.minute)}';

String formatDisplayMonthYear(int year, int month) =>
    '${_twoDigits(month)}/$year';
