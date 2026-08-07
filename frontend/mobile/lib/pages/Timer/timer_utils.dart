import 'package:flutter/material.dart';

const studyTypeLabels = <String, String>{
  'reading': 'อ่านตำรา/เอกสาร',
  'practice': 'ทำโจทย์/ฝึกปฏิบัติ',
  'video': 'ดูวิดีโอ/lecture',
  'review': 'ทบทวน/สรุปบทเรียน',
};

const studyTypeColors = <String, Color>{
  'reading': Color(0xFF91C9EF),
  'practice': Color(0xFFF6B7CC),
  'video': Color(0xFFF5C779),
  'review': Color(0xFF9ED7BD),
};

String formatClock(int totalSeconds) {
  final safeSeconds = totalSeconds.clamp(0, 359999);
  final hours = safeSeconds ~/ 3600;
  final minutes = (safeSeconds % 3600) ~/ 60;
  final seconds = safeSeconds % 60;
  return [
    hours,
    minutes,
    seconds,
  ].map((value) => value.toString().padLeft(2, '0')).join(':');
}

String formatStudyDuration(double minutes, {bool compact = false}) {
  final safeMinutes = minutes.round().clamp(0, 999999);
  final hours = safeMinutes ~/ 60;
  final remainingMinutes = safeMinutes % 60;
  if (compact) {
    return '${hours.toString().padLeft(2, '0')} ชม. '
        '${remainingMinutes.toString().padLeft(2, '0')} นาที';
  }
  if (hours > 0) return '$hours ชั่วโมง $remainingMinutes นาที';
  return '$remainingMinutes นาที';
}

String formatThaiMonth(String monthKey) {
  const months = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];
  final parts = monthKey.split('-');
  final year = parts.isNotEmpty ? int.tryParse(parts[0]) : null;
  final month = parts.length > 1 ? int.tryParse(parts[1]) : null;
  if (year == null || month == null || month < 1 || month > 12) {
    return monthKey;
  }
  return '${months[month - 1]} ${year + 543}';
}

String formatThaiDateTime(DateTime? value) {
  if (value == null) return 'ไม่ทราบเวลา';
  final local = value.toLocal();
  const months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  return '${local.day} ${months[local.month - 1]} ${local.year + 543} '
      '${local.hour.toString().padLeft(2, '0')}:'
      '${local.minute.toString().padLeft(2, '0')} น.';
}
