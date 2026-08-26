// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../interfaces/profile.interface.dart';

class ConstraintOverlap {
  final int scheduleDay;
  final String startTime;
  final String endTime;
  final List<String> reasons;

  const ConstraintOverlap({
    required this.scheduleDay,
    required this.startTime,
    required this.endTime,
    required this.reasons,
  });
}

ConstraintOverlap? findConstraintOverlap(
  UserConstraint? constraint, {
  required int scheduleDay,
  required String startTime,
  required String endTime,
}) {
  if (constraint == null || scheduleDay < 1 || scheduleDay > 7) return null;
  final start = _minutes(startTime);
  final end = _minutes(endTime);
  if (start == null || end == null || start >= end) return null;

  final reasons = <String>[];
  if (constraint.dayOff == scheduleDay) {
    reasons.add('ตรงกับวันหยุดประจำวัน${constraintDayName(scheduleDay)}');
  }

  for (final busy in constraint.busyDays) {
    if (busy.day != scheduleDay) continue;
    final busyStart = _minutes(busy.start);
    final busyEnd = _minutes(busy.end);
    if (busyStart != null &&
        busyEnd != null &&
        start < busyEnd &&
        end > busyStart) {
      reasons.add(
        'ทับกับเวลาที่ไม่ว่าง ${_trimTime(busy.start)}–${_trimTime(busy.end)}',
      );
    }
  }

  final allowedStart = _minutes(constraint.startTime);
  final allowedEnd = _minutes(constraint.endTime);
  if (allowedStart != null &&
      allowedEnd != null &&
      (start < allowedStart || end > allowedEnd)) {
    reasons.add(
      'อยู่นอกช่วงเวลาทำงาน '
      '${_trimTime(constraint.startTime!)}–${_trimTime(constraint.endTime!)}',
    );
  }

  final uniqueReasons = reasons.toSet().toList(growable: false);
  return uniqueReasons.isEmpty
      ? null
      : ConstraintOverlap(
          scheduleDay: scheduleDay,
          startTime: _trimTime(startTime),
          endTime: _trimTime(endTime),
          reasons: uniqueReasons,
        );
}

Future<bool> showConstraintOverlapWarning(
  BuildContext context,
  ConstraintOverlap conflict,
) async {
  final confirmed = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    barrierColor: const Color(0x6638596A),
    builder: (context) => AlertDialog(
      key: const Key('constraint-overlap-warning'),
      backgroundColor: const Color(0xFFFFFDF5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFE8BF7D)),
      ),
      icon: Container(
        width: 48,
        height: 48,
        decoration: const BoxDecoration(
          color: Color(0xFFFFF0C9),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.warning_amber_rounded,
          color: Color(0xFFB7792B),
        ),
      ),
      title: const Text(
        'เวลานี้ทับกับ Constraint',
        style: TextStyle(fontSize: 18, color: Color(0xFF69533A)),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'วัน${constraintDayName(conflict.scheduleDay)} '
            '${conflict.startTime}–${conflict.endTime} '
            'ขัดกับข้อกำหนดเวลาของคุณ',
            style: const TextStyle(fontSize: 12, color: Color(0xFF806F5C)),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF0D6A9)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final reason in conflict.reasons)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      '• $reason',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF765C3A),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'หากยังต้องการลงเวลานี้ ให้กด “ตกลงและบันทึก”',
            style: TextStyle(fontSize: 11, color: Color(0xFF8A7864)),
          ),
        ],
      ),
      actions: [
        OutlinedButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('ยกเลิก'),
        ),
        FilledButton(
          key: const Key('confirm-constraint-overlap'),
          onPressed: () => Navigator.pop(context, true),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFE5A453),
          ),
          child: const Text('ตกลงและบันทึก'),
        ),
      ],
    ),
  );
  return confirmed == true;
}

String constraintDayName(int day) => const [
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
  'อาทิตย์',
][day - 1];

int? _minutes(String? value) {
  if (value == null) return null;
  final parts = value.split(':');
  if (parts.length < 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  return hour == null || minute == null ? null : hour * 60 + minute;
}

String _trimTime(String value) =>
    value.length >= 5 ? value.substring(0, 5) : value;
