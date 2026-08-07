String formatHomeworkDisplayTime(DateTime value) =>
    '${value.hour.toString().padLeft(2, '0')}:'
    '${value.minute.toString().padLeft(2, '0')}';

String formatHomeworkApiTime(DateTime value) =>
    '${formatHomeworkDisplayTime(value)}:'
    '${value.second.toString().padLeft(2, '0')}';
