class TimerSubject {
  final int scheduleTimeId;
  final String subjectId;
  final String subjectName;
  final String? teacherName;

  const TimerSubject({
    required this.scheduleTimeId,
    required this.subjectId,
    required this.subjectName,
    this.teacherName,
  });

  factory TimerSubject.fromJson(Map<String, dynamic> json) => TimerSubject(
    scheduleTimeId: _asInt(json['schedule_time_id']),
    subjectId: '${json['subject_id'] ?? ''}',
    subjectName: '${json['subject_name'] ?? ''}',
    teacherName: json['teacher_name']?.toString(),
  );
}

class StudyType {
  final int studyTypeId;
  final String studyTypeName;

  const StudyType({required this.studyTypeId, required this.studyTypeName});

  factory StudyType.fromJson(Map<String, dynamic> json) => StudyType(
    studyTypeId: _asInt(json['study_type_id']),
    studyTypeName: '${json['study_type_name'] ?? ''}',
  );
}

class TimerTerm {
  final int termId;
  final int term;
  final String semester;
  final int academicYear;
  final DateTime? createdAt;

  const TimerTerm({
    required this.termId,
    required this.term,
    required this.semester,
    required this.academicYear,
    this.createdAt,
  });

  factory TimerTerm.fromJson(Map<String, dynamic> json) => TimerTerm(
    termId: _asInt(json['term_id']),
    term: _asInt(json['term']),
    semester: '${json['semester'] ?? ''}',
    academicYear: _asInt(json['academic_year']),
    createdAt: _asDate(json['created_at']),
  );
}

class TimerPolicy {
  final int hardLimitSeconds;
  final int staleAfterSeconds;

  const TimerPolicy({
    this.hardLimitSeconds = 14400,
    this.staleAfterSeconds = 300,
  });

  factory TimerPolicy.fromJson(Map<String, dynamic> json) => TimerPolicy(
    hardLimitSeconds: _asInt(json['hard_limit_seconds'], fallback: 14400),
    staleAfterSeconds: _asInt(json['stale_after_seconds'], fallback: 300),
  );
}

class StudySession {
  final int studyTimeId;
  final int scheduleTimeId;
  final int studyTypeId;
  final String studyTypeName;
  final String subjectId;
  final String subjectName;
  final DateTime? startTime;
  final DateTime? endTime;
  final int? timeSpent;
  final String sessionStatus;
  final DateTime? runningSince;
  final int accumulatedSeconds;
  final DateTime? lastSeenAt;
  final int version;
  final DateTime? updatedAt;
  final int elapsedSeconds;
  final bool isStale;
  final DateTime? serverTime;
  final int hardLimitSeconds;

  const StudySession({
    required this.studyTimeId,
    required this.scheduleTimeId,
    required this.studyTypeId,
    required this.studyTypeName,
    required this.subjectId,
    required this.subjectName,
    this.startTime,
    this.endTime,
    this.timeSpent,
    required this.sessionStatus,
    this.runningSince,
    this.accumulatedSeconds = 0,
    this.lastSeenAt,
    this.version = 0,
    this.updatedAt,
    this.elapsedSeconds = 0,
    this.isStale = false,
    this.serverTime,
    this.hardLimitSeconds = 14400,
  });

  factory StudySession.fromJson(Map<String, dynamic> json) => StudySession(
    studyTimeId: _asInt(json['study_time_id']),
    scheduleTimeId: _asInt(json['schedule_time_id']),
    studyTypeId: _asInt(json['study_type_id']),
    studyTypeName: '${json['study_type_name'] ?? ''}',
    subjectId: '${json['subject_id'] ?? ''}',
    subjectName: '${json['subject_name'] ?? ''}',
    startTime: _asDate(json['start_time']),
    endTime: _asDate(json['end_time']),
    timeSpent: json['time_spent'] == null ? null : _asInt(json['time_spent']),
    sessionStatus: '${json['session_status'] ?? ''}',
    runningSince: _asDate(json['running_since']),
    accumulatedSeconds: _asInt(json['accumulated_seconds']),
    lastSeenAt: _asDate(json['last_seen_at']),
    version: _asInt(json['version']),
    updatedAt: _asDate(json['updated_at']),
    elapsedSeconds: _asInt(json['elapsed_seconds']),
    isStale: json['is_stale'] == true || json['is_stale'] == 1,
    serverTime: _asDate(json['server_time']),
    hardLimitSeconds: _asInt(json['hard_limit_seconds'], fallback: 14400),
  );

  bool get isOpen =>
      sessionStatus == 'running' ||
      sessionStatus == 'paused' ||
      sessionStatus == 'interrupted';
}

class TimerSetup {
  final TimerTerm currentTerm;
  final List<TimerSubject> subjects;
  final List<StudyType> studyTypes;
  final TimerPolicy policy;

  const TimerSetup({
    required this.currentTerm,
    required this.subjects,
    required this.studyTypes,
    required this.policy,
  });

  factory TimerSetup.fromJson(Map<String, dynamic> json) {
    final rawSubjects = json['subjects'];
    final rawStudyTypes = json['study_types'];
    return TimerSetup(
      currentTerm: TimerTerm.fromJson(
        Map<String, dynamic>.from(json['current_term'] as Map),
      ),
      subjects: rawSubjects is List
          ? rawSubjects
                .whereType<Map>()
                .map(
                  (item) =>
                      TimerSubject.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
      studyTypes: rawStudyTypes is List
          ? rawStudyTypes
                .whereType<Map>()
                .map(
                  (item) => StudyType.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
      policy: json['timer_policy'] is Map
          ? TimerPolicy.fromJson(
              Map<String, dynamic>.from(json['timer_policy'] as Map),
            )
          : const TimerPolicy(),
    );
  }
}

class ActiveStudySession {
  final StudySession? session;
  final bool requiresRecovery;

  const ActiveStudySession({this.session, this.requiresRecovery = false});

  factory ActiveStudySession.fromJson(Map<String, dynamic> json) =>
      ActiveStudySession(
        session: json['data'] is Map
            ? StudySession.fromJson(
                Map<String, dynamic>.from(json['data'] as Map),
              )
            : null,
        requiresRecovery: json['requires_recovery'] == true,
      );
}

class StudyWeek {
  final int weekNumber;
  final DateTime? weekStart;
  final double totalMinutes;

  const StudyWeek({
    required this.weekNumber,
    this.weekStart,
    required this.totalMinutes,
  });

  factory StudyWeek.fromJson(Map<String, dynamic> json) => StudyWeek(
    weekNumber: _asInt(json['week_number']),
    weekStart: _asDate(json['week_start']),
    totalMinutes: _asDouble(json['total_minutes']),
  );
}

class SubjectStudyHistory {
  final String subjectId;
  final String subjectName;
  final double totalMinutes;
  final int sessionCount;
  final Map<String, double> methods;

  const SubjectStudyHistory({
    required this.subjectId,
    required this.subjectName,
    required this.totalMinutes,
    required this.sessionCount,
    this.methods = const {},
  });

  factory SubjectStudyHistory.fromJson(Map<String, dynamic> json) {
    final rawMethods = json['methods'];
    return SubjectStudyHistory(
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      totalMinutes: _asDouble(json['total_minutes']),
      sessionCount: _asInt(json['session_count']),
      methods: rawMethods is Map
          ? rawMethods.map((key, value) => MapEntry('$key', _asDouble(value)))
          : const {},
    );
  }
}

class MonthlyStudyHistory {
  final String monthKey;
  final double totalMinutes;
  final int sessionCount;
  final List<SubjectStudyHistory> subjects;

  const MonthlyStudyHistory({
    required this.monthKey,
    required this.totalMinutes,
    required this.sessionCount,
    this.subjects = const [],
  });

  factory MonthlyStudyHistory.fromJson(Map<String, dynamic> json) {
    final rawSubjects = json['subjects'];
    return MonthlyStudyHistory(
      monthKey: '${json['month_key'] ?? ''}',
      totalMinutes: _asDouble(json['total_minutes']),
      sessionCount: _asInt(json['session_count']),
      subjects: rawSubjects is List
          ? rawSubjects
                .whereType<Map>()
                .map(
                  (item) => SubjectStudyHistory.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
}

class StudySummary {
  final double currentWeekMinutes;
  final double totalTermMinutes;
  final double averageWeeklyMinutes;
  final double averageMonthlyMinutes;

  const StudySummary({
    this.currentWeekMinutes = 0,
    this.totalTermMinutes = 0,
    this.averageWeeklyMinutes = 0,
    this.averageMonthlyMinutes = 0,
  });

  factory StudySummary.fromJson(Map<String, dynamic> json) => StudySummary(
    currentWeekMinutes: _asDouble(json['current_week_minutes']),
    totalTermMinutes: _asDouble(json['total_term_minutes']),
    averageWeeklyMinutes: _asDouble(json['average_weekly_minutes']),
    averageMonthlyMinutes: _asDouble(json['average_monthly_minutes']),
  );
}

class StudyDashboard {
  final TimerTerm currentTerm;
  final StudySummary summary;
  final List<StudyWeek> weeks;
  final List<MonthlyStudyHistory> history;

  const StudyDashboard({
    required this.currentTerm,
    required this.summary,
    this.weeks = const [],
    this.history = const [],
  });

  factory StudyDashboard.fromJson(Map<String, dynamic> json) {
    final rawWeeks = json['weeks'];
    final rawHistory = json['history'];
    return StudyDashboard(
      currentTerm: TimerTerm.fromJson(
        Map<String, dynamic>.from(json['current_term'] as Map),
      ),
      summary: StudySummary.fromJson(
        Map<String, dynamic>.from(json['summary'] as Map),
      ),
      weeks: rawWeeks is List
          ? rawWeeks
                .whereType<Map>()
                .map(
                  (item) => StudyWeek.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
      history: rawHistory is List
          ? rawHistory
                .whereType<Map>()
                .map(
                  (item) => MonthlyStudyHistory.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
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

DateTime? _asDate(dynamic value) {
  if (value == null || '$value'.isEmpty) return null;
  return DateTime.tryParse('$value')?.toLocal();
}
