class ScheduleTerm {
  final int termId;
  final int term;
  final int academicYear;
  final String semester;

  const ScheduleTerm({
    required this.termId,
    required this.term,
    required this.academicYear,
    required this.semester,
  });

  factory ScheduleTerm.fromJson(Map<String, dynamic> json) => ScheduleTerm(
    termId: _asInt(json['term_id']),
    term: _asInt(json['term']),
    academicYear: _asInt(json['academic_year']),
    semester: '${json['semester'] ?? ''}',
  );
}

class ScheduleItem {
  final int scheduleTimeId;
  final int scheduleTypeId;
  final String scheduleTypeName;
  final String subjectId;
  final String subjectName;
  final String teacherName;
  final double credits;
  final int scheduleDay;
  final String startTime;
  final String endTime;
  final String? classroom;
  final String? note;

  const ScheduleItem({
    required this.scheduleTimeId,
    required this.scheduleTypeId,
    required this.scheduleTypeName,
    required this.subjectId,
    required this.subjectName,
    this.teacherName = '',
    this.credits = 0,
    required this.scheduleDay,
    required this.startTime,
    required this.endTime,
    this.classroom,
    this.note,
  });

  factory ScheduleItem.fromJson(Map<String, dynamic> json) => ScheduleItem(
    scheduleTimeId: _asInt(json['schedule_time_id']),
    scheduleTypeId: _asInt(json['schedule_type_id']),
    scheduleTypeName: '${json['schedule_type_name'] ?? ''}',
    subjectId: '${json['subject_id'] ?? ''}',
    subjectName: '${json['subject_name'] ?? ''}',
    teacherName: '${json['teacher_name'] ?? ''}',
    credits: _asDouble(json['credits']),
    scheduleDay: _asInt(json['schedule_day'], fallback: 1),
    startTime: _time(json['start_time']),
    endTime: _time(json['end_time']),
    classroom: json['classroom']?.toString(),
    note: json['note']?.toString(),
  );

  ScheduleItem copyWith({
    int? scheduleDay,
    String? startTime,
    String? endTime,
    String? classroom,
    String? note,
  }) => ScheduleItem(
    scheduleTimeId: scheduleTimeId,
    scheduleTypeId: scheduleTypeId,
    scheduleTypeName: scheduleTypeName,
    subjectId: subjectId,
    subjectName: subjectName,
    teacherName: teacherName,
    credits: credits,
    scheduleDay: scheduleDay ?? this.scheduleDay,
    startTime: startTime ?? this.startTime,
    endTime: endTime ?? this.endTime,
    classroom: classroom,
    note: note,
  );
}

class ScheduleSubject {
  final String subjectId;
  final String subjectName;

  const ScheduleSubject({required this.subjectId, required this.subjectName});

  factory ScheduleSubject.fromJson(Map<String, dynamic> json) =>
      ScheduleSubject(
        subjectId: '${json['subject_id'] ?? ''}',
        subjectName: '${json['subject_name'] ?? ''}',
      );
}

class CurrentSchedule {
  final ScheduleTerm currentTerm;
  final List<ScheduleItem> items;

  const CurrentSchedule({required this.currentTerm, this.items = const []});

  factory CurrentSchedule.fromJson(Map<String, dynamic> json) {
    final rawItems = json['data'];
    return CurrentSchedule(
      currentTerm: ScheduleTerm.fromJson(
        Map<String, dynamic>.from(json['current_term'] as Map),
      ),
      items: rawItems is List
          ? rawItems
                .whereType<Map>()
                .map(
                  (item) =>
                      ScheduleItem.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
    );
  }
}

class AddScheduleInput {
  final int scheduleTypeId;
  final String subjectId;
  final int scheduleDay;
  final String startTime;
  final String endTime;

  const AddScheduleInput({
    required this.scheduleTypeId,
    required this.subjectId,
    required this.scheduleDay,
    required this.startTime,
    required this.endTime,
  });

  Map<String, dynamic> toJson() => {
    'schedule_type_id': scheduleTypeId,
    'subject_id': subjectId,
    'schedule_day': scheduleDay,
    'start_time': startTime,
    'end_time': endTime,
  };
}

class UpdateScheduleInput {
  final int scheduleDay;
  final String startTime;
  final String endTime;
  final String? classroom;
  final String? note;

  const UpdateScheduleInput({
    required this.scheduleDay,
    required this.startTime,
    required this.endTime,
    this.classroom,
    this.note,
  });

  Map<String, dynamic> toJson() => {
    'schedule_day': scheduleDay,
    'start_time': startTime,
    'end_time': endTime,
    'classroom': classroom,
    'note': note,
  };
}

int _asInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? fallback;
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}

String _time(dynamic value) {
  final text = '${value ?? ''}';
  return text.length >= 5 ? text.substring(0, 5) : text;
}
