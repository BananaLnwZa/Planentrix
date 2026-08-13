import '../common/HomeworkTimeFormat.dart';

enum HomeworkSectionType { tomorrow, date, overdue }

class HomeworkSubject {
  final int scheduleTimeId;
  final String subjectId;
  final String subjectName;
  final String teacherName;

  const HomeworkSubject({
    required this.scheduleTimeId,
    required this.subjectId,
    required this.subjectName,
    required this.teacherName,
  });

  factory HomeworkSubject.fromJson(Map<String, dynamic> json) {
    return HomeworkSubject(
      scheduleTimeId: _asInt(json['schedule_time_id']),
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      teacherName: '${json['teacher_name'] ?? ''}',
    );
  }
}

class HomeworkTypeOption {
  final int id;
  final String name;

  const HomeworkTypeOption(this.id, this.name);
}

const homeworkTypeOptions = [
  HomeworkTypeOption(4, 'quiz'),
  HomeworkTypeOption(2, 'final'),
  HomeworkTypeOption(1, 'midterm'),
  HomeworkTypeOption(5, 'project'),
  HomeworkTypeOption(3, 'assignment'),
];

class CreateHomeworkInput {
  final HomeworkSubject subject;
  final HomeworkTypeOption type;
  final String assignment;
  final DateTime deadline;
  final String note;

  const CreateHomeworkInput({
    required this.subject,
    required this.type,
    required this.assignment,
    required this.deadline,
    required this.note,
  });
}

class UpdateHomeworkInput {
  final String assignment;
  final DateTime deadline;
  final String note;

  const UpdateHomeworkInput({
    required this.assignment,
    required this.deadline,
    required this.note,
  });
}

class HomeworkTaskData {
  final int workloadId;
  final int scheduleTimeId;
  final int workloadTypeId;
  final String workloadTypeName;
  final String subjectId;
  final String subject;
  final String assignment;
  final DateTime deadline;
  final String dueDate;
  final String dueTime;
  final String note;

  const HomeworkTaskData({
    required this.workloadId,
    required this.scheduleTimeId,
    required this.workloadTypeId,
    required this.workloadTypeName,
    required this.subjectId,
    required this.subject,
    required this.assignment,
    required this.deadline,
    required this.dueDate,
    required this.dueTime,
    this.note = '',
  });

  factory HomeworkTaskData.fromJson(Map<String, dynamic> json) {
    final deadline = _parseDeadline(
      json['deadline_date'],
      json['deadline_time'],
    );
    return HomeworkTaskData(
      workloadId: _asInt(json['workload_id']),
      scheduleTimeId: _asInt(json['schedule_time_id']),
      workloadTypeId: _asInt(json['workload_type_id']),
      workloadTypeName: '${json['workload_type_name'] ?? 'งาน'}',
      subjectId: '${json['subject_id'] ?? ''}',
      subject: '${json['subject_name'] ?? ''}',
      assignment: '${json['workload_name'] ?? ''}',
      deadline: deadline,
      dueDate: formatHomeworkDisplayDate(deadline),
      dueTime: formatHomeworkDisplayTime(deadline),
      note: '${json['note'] ?? ''}',
    );
  }

  HomeworkTaskData copyWith({
    String? assignment,
    DateTime? deadline,
    String? note,
  }) {
    final updatedDeadline = deadline ?? this.deadline;
    return HomeworkTaskData(
      workloadId: workloadId,
      scheduleTimeId: scheduleTimeId,
      workloadTypeId: workloadTypeId,
      workloadTypeName: workloadTypeName,
      subjectId: subjectId,
      subject: subject,
      assignment: assignment ?? this.assignment,
      deadline: updatedDeadline,
      dueDate: formatHomeworkDisplayDate(updatedDeadline),
      dueTime: formatHomeworkDisplayTime(updatedDeadline),
      note: note ?? this.note,
    );
  }
}

class HomeworkOverview {
  final List<HomeworkTaskData> tasks;
  final bool hasCurrentTerm;
  final bool hasWorkloads;

  const HomeworkOverview({
    required this.tasks,
    required this.hasCurrentTerm,
    required this.hasWorkloads,
  });
}

class HomeworkSectionData {
  final String title;
  final HomeworkSectionType type;
  final double spacingAfter;
  final List<HomeworkTaskData> tasks;

  const HomeworkSectionData({
    required this.title,
    required this.type,
    this.spacingAfter = 0,
    required this.tasks,
  });
}

DateTime _parseDeadline(dynamic dateValue, dynamic timeValue) {
  final dateText = '$dateValue';
  final parsedDate = DateTime.tryParse(dateText);
  final date = dateText.contains('T') && parsedDate != null
      ? parsedDate.toLocal()
      : DateTime.tryParse(
          dateText.length >= 10 ? dateText.substring(0, 10) : dateText,
        );
  final timeParts = '$timeValue'.split(':');
  final hour = timeParts.isNotEmpty ? int.tryParse(timeParts[0]) ?? 0 : 0;
  final minute = timeParts.length > 1 ? int.tryParse(timeParts[1]) ?? 0 : 0;
  final safeDate = date ?? DateTime.now();
  return DateTime(safeDate.year, safeDate.month, safeDate.day, hour, minute);
}

int _asInt(dynamic value) {
  if (value is int) return value;
  return int.tryParse('$value') ?? 0;
}
