import 'DateTimeFormat.dart';

String formatHomeworkDisplayDate(DateTime value) => formatDisplayDate(value);

String formatHomeworkDisplayTime(DateTime value) => formatDisplayTime24(value);

String formatHomeworkDisplayDateTime(DateTime value) =>
    formatDisplayDateTime(value);

String formatHomeworkApiTime(DateTime value) =>
    '${formatHomeworkDisplayTime(value)}:'
    '${value.second.toString().padLeft(2, '0')}';
