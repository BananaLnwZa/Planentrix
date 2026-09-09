// ignore_for_file: file_names

class ConstraintBusyPeriod {
  final int day;
  final String start;
  final String end;

  const ConstraintBusyPeriod({
    required this.day,
    required this.start,
    required this.end,
  });
}

class ConstraintValidationResult {
  final List<String> errors;
  final List<String> warnings;

  const ConstraintValidationResult({
    this.errors = const [],
    this.warnings = const [],
  });
}

const _dayNames = <String>[
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
  'วันอาทิตย์',
];

int? _timeToMinutes(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  final match = RegExp(
    r'^(\d{2}):(\d{2})(?::\d{2})?$',
  ).firstMatch(value.trim());
  if (match == null) return null;
  final hour = int.tryParse(match.group(1)!);
  final minute = int.tryParse(match.group(2)!);
  if (hour == null || minute == null || hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

String _shortTime(String value) =>
    value.length >= 5 ? value.substring(0, 5) : value;

List<({int start, int end})> _mergeIntervals(
  List<({int start, int end})> intervals,
) {
  intervals.sort((left, right) => left.start.compareTo(right.start));
  final merged = <({int start, int end})>[];
  for (final interval in intervals) {
    if (merged.isEmpty || interval.start > merged.last.end) {
      merged.add(interval);
      continue;
    }
    final latest = merged.removeLast();
    merged.add((
      start: latest.start,
      end: interval.end > latest.end ? interval.end : latest.end,
    ));
  }
  return merged;
}

ConstraintValidationResult validateConstraintInput({
  int? dayOff,
  int? continuousWorkingDuration,
  int? breakDuration,
  String? startTime,
  String? endTime,
  List<ConstraintBusyPeriod> busyDays = const [],
}) {
  final errors = <String>[];
  final warnings = <String>[];
  final start = _timeToMinutes(startTime);
  final end = _timeToMinutes(endTime);

  if (continuousWorkingDuration == null) {
    errors.add('กรุณาระบุระยะเวลาทำงานต่อเนื่อง');
  } else if (continuousWorkingDuration <= 0) {
    errors.add('ระยะเวลาทำงานต่อเนื่องต้องมากกว่า 0 นาที');
  }
  if (breakDuration != null && breakDuration < 0) {
    errors.add('ระยะเวลาพักต้องไม่ติดลบ');
  } else if (breakDuration != null &&
      continuousWorkingDuration != null &&
      continuousWorkingDuration > 0 &&
      breakDuration >= continuousWorkingDuration) {
    errors.add('ระยะเวลาพักต้องน้อยกว่าระยะเวลาทำงานต่อเนื่อง');
  }

  final hasStart = startTime != null && startTime.trim().isNotEmpty;
  final hasEnd = endTime != null && endTime.trim().isNotEmpty;
  if (hasStart != hasEnd) {
    errors.add('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุดการทำงานให้ครบ');
  } else if (hasStart && hasEnd) {
    if (start == null || end == null) {
      errors.add('รูปแบบเวลาทำงานไม่ถูกต้อง');
    } else if (start >= end) {
      errors.add('เวลาเริ่มทำงานต้องน้อยกว่าเวลาสิ้นสุด');
    }
  }

  final validBusy =
      <
        ({
          int day,
          String start,
          String end,
          int index,
          int startMinutes,
          int endMinutes,
        })
      >[];
  for (var index = 0; index < busyDays.length; index++) {
    final busy = busyDays[index];
    final busyStart = _timeToMinutes(busy.start);
    final busyEnd = _timeToMinutes(busy.end);
    if (busy.day < 1 || busy.day > 7) {
      errors.add('วันของรายการไม่ว่างที่ ${index + 1} ไม่ถูกต้อง');
    } else if (busyStart == null || busyEnd == null) {
      errors.add(
        'กรุณาเลือกเวลาเริ่มและสิ้นสุดของรายการไม่ว่างที่ ${index + 1} ให้ครบ',
      );
    } else if (busyStart >= busyEnd) {
      errors.add(
        'เวลาเริ่มของรายการไม่ว่างที่ ${index + 1} ต้องน้อยกว่าเวลาสิ้นสุด',
      );
    } else {
      validBusy.add((
        day: busy.day,
        start: busy.start,
        end: busy.end,
        index: index,
        startMinutes: busyStart,
        endMinutes: busyEnd,
      ));
    }
  }

  for (var leftIndex = 0; leftIndex < validBusy.length; leftIndex++) {
    for (
      var rightIndex = leftIndex + 1;
      rightIndex < validBusy.length;
      rightIndex++
    ) {
      final left = validBusy[leftIndex];
      final right = validBusy[rightIndex];
      if (left.day == right.day &&
          left.startMinutes < right.endMinutes &&
          left.endMinutes > right.startMinutes) {
        warnings.add(
          '${_dayNames[left.day - 1]}: รายการที่ ${left.index + 1} '
          '${_shortTime(left.start)}–${_shortTime(left.end)} ทับกับรายการที่ '
          '${right.index + 1} ${_shortTime(right.start)}–${_shortTime(right.end)}',
        );
      }
    }
  }

  if (start != null && end != null && start < end) {
    final workWindow = end - start;
    if (continuousWorkingDuration != null &&
        continuousWorkingDuration > workWindow) {
      errors.add(
        'ระยะเวลาทำงานต่อเนื่อง $continuousWorkingDuration นาที '
        'ยาวกว่าช่วงเวลาทำงาน $workWindow นาที',
      );
    }
    if (breakDuration != null && breakDuration >= workWindow) {
      warnings.add(
        'ระยะเวลาพัก $breakDuration นาที '
        'ยาวกว่าหรือเท่ากับช่วงเวลาทำงาน $workWindow นาที',
      );
    }

    final unavailableDays = <int>[];
    final busyCoveredDays = <int>[];
    final shortRemainingDays = <int>[];
    for (var day = 1; day <= 7; day++) {
      if (dayOff == day) {
        unavailableDays.add(day);
        continue;
      }
      final intervals = _mergeIntervals(
        validBusy
            .where((busy) => busy.day == day)
            .map(
              (busy) => (
                start: busy.startMinutes > start ? busy.startMinutes : start,
                end: busy.endMinutes < end ? busy.endMinutes : end,
              ),
            )
            .where((interval) => interval.start < interval.end)
            .toList(),
      );
      final freeDurations = <int>[];
      var cursor = start;
      for (final interval in intervals) {
        if (interval.start > cursor) freeDurations.add(interval.start - cursor);
        if (interval.end > cursor) cursor = interval.end;
      }
      if (cursor < end) freeDurations.add(end - cursor);

      if (freeDurations.isEmpty) {
        unavailableDays.add(day);
        busyCoveredDays.add(day);
      } else if (continuousWorkingDuration != null &&
          continuousWorkingDuration > 0 &&
          freeDurations.reduce((left, right) => left > right ? left : right) <
              continuousWorkingDuration) {
        shortRemainingDays.add(day);
      }
    }

    if (unavailableDays.length == 7) {
      errors.add(
        'วันหยุดและเวลาที่ไม่ว่างปิดช่วงเวลาทำงานครบทุกวัน จึงไม่สามารถสร้างตารางได้',
      );
    } else if (busyCoveredDays.isNotEmpty) {
      warnings.add(
        'เวลาที่ไม่ว่างทับช่วงเวลาทำงานทั้งหมดใน'
        '${busyCoveredDays.map((day) => _dayNames[day - 1]).join(',')}',
      );
    }
    if (shortRemainingDays.isNotEmpty) {
      warnings.add(
        'เวลาที่เหลือใน${shortRemainingDays.map((day) => _dayNames[day - 1]).join(',')} '
        'สั้นกว่าระยะเวลาทำงานต่อเนื่องที่กำหนด',
      );
    }
  }

  return ConstraintValidationResult(
    errors: errors.toSet().toList(growable: false),
    warnings: warnings.toSet().toList(growable: false),
  );
}
