class CurrentTerm {
  final int termId;
  final String yearLevel;
  final String term;
  final String academicYear;
  final DateTime? startMidterm;
  final DateTime? endMidterm;
  final DateTime? startFinal;
  final DateTime? endFinal;
  final int termStatus;

  const CurrentTerm({
    required this.termId,
    required this.yearLevel,
    required this.term,
    required this.academicYear,
    this.startMidterm,
    this.endMidterm,
    this.startFinal,
    this.endFinal,
    this.termStatus = 1,
  });

  factory CurrentTerm.fromJson(Map<String, dynamic> json) {
    return CurrentTerm(
      termId: _asInt(json['term_id']),
      yearLevel: '${json['academic_year'] ?? ''}',
      term: '${json['term'] ?? ''}',
      academicYear: '${json['semester'] ?? ''}',
      startMidterm: _asDate(json['start_midterm']),
      endMidterm: _asDate(json['end_midterm']),
      startFinal: _asDate(json['start_final']),
      endFinal: _asDate(json['end_final']),
      termStatus: _asInt(json['term_status'], fallback: 1),
    );
  }

  static int _asInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    return int.tryParse('$value') ?? fallback;
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null || '$value'.isEmpty) return null;
    return DateTime.tryParse('$value');
  }
}

class CreateTermRequest {
  final String yearLevel;
  final String term;
  final String academicYear;
  final List<int> sectionIds;
  final DateTime? midtermStartDate;
  final DateTime? midtermEndDate;
  final DateTime? finalStartDate;
  final DateTime? finalEndDate;

  const CreateTermRequest({
    required this.yearLevel,
    required this.term,
    required this.academicYear,
    this.sectionIds = const [],
    this.midtermStartDate,
    this.midtermEndDate,
    this.finalStartDate,
    this.finalEndDate,
  });

  Map<String, dynamic> toJson() {
    return {
      'academic_year': int.parse(yearLevel),
      'semester': academicYear,
      'term': int.parse(term),
      'section_ids': sectionIds,
    };
  }

  CurrentTerm toCurrentTerm(int termId) {
    return CurrentTerm(
      termId: termId,
      yearLevel: yearLevel,
      term: term,
      academicYear: academicYear,
      startMidterm: midtermStartDate,
      endMidterm: midtermEndDate,
      startFinal: finalStartDate,
      endFinal: finalEndDate,
    );
  }
}

class AvailableSectionInstructor {
  final int instructorId;
  final String role;
  final String firstName;
  final String lastName;
  final String adminName;

  const AvailableSectionInstructor({
    required this.instructorId,
    required this.role,
    required this.firstName,
    required this.lastName,
    required this.adminName,
  });

  factory AvailableSectionInstructor.fromJson(Map<String, dynamic> json) =>
      AvailableSectionInstructor(
        instructorId: CurrentTerm._asInt(json['instructor_id']),
        role: '${json['instructor_role'] ?? ''}',
        firstName: '${json['first_name'] ?? ''}',
        lastName: '${json['last_name'] ?? ''}',
        adminName: '${json['admin_name'] ?? ''}',
      );

  String get displayName {
    final fullName = '$firstName $lastName'.trim();
    return fullName.isNotEmpty ? fullName : adminName;
  }
}

class AvailableSectionMeeting {
  final int classMeetingId;
  final String dayOfWeek;
  final String startTime;
  final String endTime;
  final String? classroom;

  const AvailableSectionMeeting({
    required this.classMeetingId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.classroom,
  });

  factory AvailableSectionMeeting.fromJson(Map<String, dynamic> json) =>
      AvailableSectionMeeting(
        classMeetingId: CurrentTerm._asInt(json['class_meeting_id']),
        dayOfWeek: '${json['day_of_week'] ?? ''}',
        startTime: '${json['start_time'] ?? ''}',
        endTime: '${json['end_time'] ?? ''}',
        classroom: json['classroom'] == null ? null : '${json['classroom']}',
      );
}

class AvailableCourseSection {
  final int sectionId;
  final String subjectId;
  final String subjectName;
  final String sectionNumber;
  final int? capacity;
  final int enrolledCount;
  final bool isFull;
  final List<AvailableSectionInstructor> instructors;
  final List<AvailableSectionMeeting> meetings;

  const AvailableCourseSection({
    required this.sectionId,
    required this.subjectId,
    required this.subjectName,
    required this.sectionNumber,
    this.capacity,
    required this.enrolledCount,
    required this.isFull,
    this.instructors = const [],
    this.meetings = const [],
  });

  factory AvailableCourseSection.fromJson(Map<String, dynamic> json) {
    final rawInstructors = json['instructors'];
    final rawMeetings = json['meetings'];
    return AvailableCourseSection(
      sectionId: CurrentTerm._asInt(json['section_id']),
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      sectionNumber: '${json['section_number'] ?? ''}',
      capacity: json['capacity'] == null
          ? null
          : CurrentTerm._asInt(json['capacity']),
      enrolledCount: CurrentTerm._asInt(json['enrolled_count']),
      isFull:
          json['is_full'] == true ||
          json['is_full'] == 1 ||
          json['is_full'] == '1',
      instructors: rawInstructors is List
          ? rawInstructors
                .whereType<Map>()
                .map(
                  (item) => AvailableSectionInstructor.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
      meetings: rawMeetings is List
          ? rawMeetings
                .whereType<Map>()
                .map(
                  (item) => AvailableSectionMeeting.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
}

class AvailableTermSubject {
  final String subjectId;
  final String subjectName;
  final List<AvailableCourseSection> sections;

  const AvailableTermSubject({
    required this.subjectId,
    required this.subjectName,
    this.sections = const [],
  });

  factory AvailableTermSubject.fromJson(Map<String, dynamic> json) {
    final rawSections = json['sections'];
    return AvailableTermSubject(
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      sections: rawSections is List
          ? rawSections
                .whereType<Map>()
                .map(
                  (item) => AvailableCourseSection.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
}

class AvailableTermSections {
  final int academicTermId;
  final List<AvailableTermSubject> subjects;

  const AvailableTermSections({
    required this.academicTermId,
    this.subjects = const [],
  });

  factory AvailableTermSections.fromJson(Map<String, dynamic> json) {
    final rawSubjects = json['subjects'];
    return AvailableTermSections(
      academicTermId: CurrentTerm._asInt(json['academic_term_id']),
      subjects: rawSubjects is List
          ? rawSubjects
                .whereType<Map>()
                .map(
                  (item) => AvailableTermSubject.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
}

class TermHistoryItem {
  final int studentTermId;
  final int yearLevel;
  final int academicYear;
  final int semesterNo;
  final String status;
  final DateTime? completedAt;

  const TermHistoryItem({
    required this.studentTermId,
    required this.yearLevel,
    required this.academicYear,
    required this.semesterNo,
    required this.status,
    this.completedAt,
  });

  factory TermHistoryItem.fromJson(Map<String, dynamic> json) =>
      TermHistoryItem(
        studentTermId: CurrentTerm._asInt(json['student_term_id']),
        yearLevel: CurrentTerm._asInt(json['year_level']),
        academicYear: CurrentTerm._asInt(json['academic_year']),
        semesterNo: CurrentTerm._asInt(json['semester_no']),
        status: '${json['status'] ?? ''}',
        completedAt: CurrentTerm._asDate(json['completed_at']),
      );
}

class PendingSystemEvaluation {
  final int studentTermId;
  final int academicYear;
  final int semesterNo;
  final DateTime? completedAt;

  const PendingSystemEvaluation({
    required this.studentTermId,
    required this.academicYear,
    required this.semesterNo,
    this.completedAt,
  });

  factory PendingSystemEvaluation.fromJson(Map<String, dynamic> json) =>
      PendingSystemEvaluation(
        studentTermId: CurrentTerm._asInt(json['student_term_id']),
        academicYear: CurrentTerm._asInt(json['academic_year']),
        semesterNo: CurrentTerm._asInt(json['semester_no']),
        completedAt: CurrentTerm._asDate(json['completed_at']),
      );
}

class SystemEvaluationAnswers {
  final int satisfaction;
  final int easeOfUse;
  final int usefulness;
  final String comment;

  const SystemEvaluationAnswers({
    required this.satisfaction,
    required this.easeOfUse,
    required this.usefulness,
    this.comment = '',
  });

  Map<String, dynamic> toJson() => {
    'satisfaction': satisfaction,
    'ease_of_use': easeOfUse,
    'usefulness': usefulness,
    'comment': comment.trim(),
  };
}
