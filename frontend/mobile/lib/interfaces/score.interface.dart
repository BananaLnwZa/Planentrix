class OverallGradeSummary {
  final double targetGpa;
  final double actualGpa;
  final String grade;
  final double percent;
  final double maximumGpa;

  const OverallGradeSummary({
    required this.targetGpa,
    required this.actualGpa,
    required this.grade,
    required this.percent,
    required this.maximumGpa,
  });

  factory OverallGradeSummary.fromJson(Map<String, dynamic> json) {
    return OverallGradeSummary(
      targetGpa: _asDouble(json['overall_target_gpa']),
      actualGpa: _asDouble(json['overall_actual_gpa']),
      grade: '${json['overall_grade'] ?? 'F'}',
      percent: _asDouble(json['overall_percent']),
      maximumGpa: _asDouble(json['max_gpa'], fallback: 4),
    );
  }
}

class GradeBoundary {
  final String gradeCode;
  final double minimumPercentage;

  const GradeBoundary({
    required this.gradeCode,
    required this.minimumPercentage,
  });

  factory GradeBoundary.fromJson(Map<String, dynamic> json) => GradeBoundary(
    gradeCode: '${json['grade_code'] ?? ''}',
    minimumPercentage: _asDouble(json['minimum_percentage']),
  );
}

class SubjectScore {
  final int scheduleTimeId;
  final String subjectId;
  final String subjectName;
  final double credits;
  final String teacherName;
  final double? targetScore;
  final String? targetGradeCode;
  final double? targetMinimumPercentage;
  final String? gradingSchemeType;
  final List<GradeBoundary> gradeBoundaries;
  final List<WorkloadScore> workloads;

  const SubjectScore({
    required this.scheduleTimeId,
    required this.subjectId,
    required this.subjectName,
    required this.credits,
    required this.teacherName,
    required this.targetScore,
    this.targetGradeCode,
    this.targetMinimumPercentage,
    this.gradingSchemeType,
    this.gradeBoundaries = const [],
    required this.workloads,
  });

  factory SubjectScore.fromJson(Map<String, dynamic> json) {
    final hasCompletedWorkloads = json.containsKey('completed_workloads');
    final rawWorkloads = hasCompletedWorkloads
        ? json['completed_workloads'] ?? const <dynamic>[]
        : json['workloads'] ?? const <dynamic>[];
    final rawScheme = json['grading_scheme'];
    final scheme = rawScheme is Map
        ? Map<String, dynamic>.from(rawScheme)
        : null;
    final rawBoundaries = scheme?['boundaries'];
    final boundaries = rawBoundaries is List
        ? rawBoundaries
              .whereType<Map>()
              .map(
                (item) =>
                    GradeBoundary.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList()
        : const <GradeBoundary>[];
    final workloads = rawWorkloads is List
        ? rawWorkloads
              .whereType<Map>()
              .map(
                (item) =>
                    WorkloadScore.fromJson(Map<String, dynamic>.from(item)),
              )
              .where(
                (workload) => hasCompletedWorkloads || workload.isCompleted,
              )
              .toList()
        : const <WorkloadScore>[];
    return SubjectScore(
      scheduleTimeId: _asInt(json['schedule_time_id']),
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      credits: _asDouble(json['credits']),
      teacherName: '${json['teacher_name'] ?? '—'}',
      targetScore: _asNullableDouble(json['target_score']),
      targetGradeCode: json['target_grade'] == null
          ? null
          : '${json['target_grade']}',
      targetMinimumPercentage: _asNullableDouble(
        json['target_minimum_percentage'],
      ),
      gradingSchemeType: scheme?['scheme_type'] == null
          ? null
          : '${scheme!['scheme_type']}',
      gradeBoundaries: boundaries,
      workloads: workloads,
    );
  }

  double get totalActualScore =>
      workloads.fold(0, (sum, workload) => sum + (workload.actualScore ?? 0));

  double get totalMaximumScore =>
      workloads.fold(0, (sum, workload) => sum + (workload.maxScore ?? 0));

  double get actualPercent =>
      totalMaximumScore <= 0 ? 0 : totalActualScore.clamp(0, 100).toDouble();

  double? minimumForGrade(String grade) {
    for (final boundary in gradeBoundaries) {
      if (boundary.gradeCode == grade) return boundary.minimumPercentage;
    }
    return null;
  }

  double? get pointsNeeded {
    final minimum = targetMinimumPercentage;
    if (minimum == null) return null;
    return (minimum - totalActualScore).clamp(0, double.infinity).toDouble();
  }

  double get progressPercent {
    final targetMinimumScore = targetMinimumPercentage;
    if (targetMinimumScore == null) return 0;
    if (targetMinimumScore == 0) return 100;
    return ((totalActualScore / targetMinimumScore) * 100)
        .clamp(0, 100)
        .toDouble();
  }

  String get actualGrade =>
      gradeFromPercent(actualPercent, gradeBoundaries) ?? 'รอเกณฑ์';

  String get targetGrade =>
      targetGradeCode ??
      (targetScore == null ? '—' : gradeFromGpa(targetScore!));

  SubjectScore copyWith({
    double? targetScore,
    bool replaceTargetScore = false,
    String? targetGradeCode,
    bool replaceTargetGradeCode = false,
    double? targetMinimumPercentage,
    bool replaceTargetMinimumPercentage = false,
    List<WorkloadScore>? workloads,
  }) {
    return SubjectScore(
      scheduleTimeId: scheduleTimeId,
      subjectId: subjectId,
      subjectName: subjectName,
      credits: credits,
      teacherName: teacherName,
      targetScore: replaceTargetScore ? targetScore : this.targetScore,
      targetGradeCode: replaceTargetGradeCode
          ? targetGradeCode
          : this.targetGradeCode,
      targetMinimumPercentage: replaceTargetMinimumPercentage
          ? targetMinimumPercentage
          : this.targetMinimumPercentage,
      gradingSchemeType: gradingSchemeType,
      gradeBoundaries: gradeBoundaries,
      workloads: workloads ?? this.workloads,
    );
  }
}

class WorkloadScore {
  final int workloadId;
  final String workloadName;
  final int workloadTypeId;
  final String workloadTypeCode;
  final String workloadTypeName;
  final dynamic workloadStatus;
  final double? actualScore;
  final double? maxScore;

  const WorkloadScore({
    required this.workloadId,
    required this.workloadName,
    required this.workloadTypeId,
    this.workloadTypeCode = '',
    required this.workloadTypeName,
    required this.workloadStatus,
    this.actualScore,
    this.maxScore,
  });

  factory WorkloadScore.fromJson(Map<String, dynamic> json) {
    return WorkloadScore(
      workloadId: _asInt(json['workload_id']),
      workloadName: '${json['workload_name'] ?? ''}',
      workloadTypeId: _asInt(json['workload_type_id']),
      workloadTypeCode: '${json['workload_type_code'] ?? ''}'
          .trim()
          .toLowerCase(),
      workloadTypeName: '${json['workload_type_name'] ?? 'งาน'}',
      workloadStatus: json['workload_status'],
      actualScore: _asNullableDouble(json['actual_score']),
      maxScore: _asNullableDouble(json['max_score']),
    );
  }

  bool get hasScore => actualScore != null && maxScore != null;

  bool get isCompleted {
    if (workloadStatus == true || workloadStatus == 1) return true;
    final normalized = '$workloadStatus'.toLowerCase().trim();
    return const {'1', 'completed', 'complete', 'done'}.contains(normalized);
  }

  WorkloadScore copyWith({double? actualScore, double? maxScore}) {
    return WorkloadScore(
      workloadId: workloadId,
      workloadName: workloadName,
      workloadTypeId: workloadTypeId,
      workloadTypeCode: workloadTypeCode,
      workloadTypeName: workloadTypeName,
      workloadStatus: workloadStatus,
      actualScore: actualScore ?? this.actualScore,
      maxScore: maxScore ?? this.maxScore,
    );
  }
}

class WorkloadScoreInput {
  final double actualScore;
  final double maximumScore;

  const WorkloadScoreInput({
    required this.actualScore,
    required this.maximumScore,
  });
}

const gradeOptions = <String>['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];

double gpaFromGrade(String grade) {
  return switch (grade.toUpperCase()) {
    'A' => 4,
    'B+' => 3.5,
    'B' => 3,
    'C+' => 2.5,
    'C' => 2,
    'D+' => 1.5,
    'D' => 1,
    _ => 0,
  };
}

String gradeFromGpa(double gpa) {
  if (gpa >= 4) return 'A';
  if (gpa >= 3.5) return 'B+';
  if (gpa >= 3) return 'B';
  if (gpa >= 2.5) return 'C+';
  if (gpa >= 2) return 'C';
  if (gpa >= 1.5) return 'D+';
  if (gpa >= 1) return 'D';
  return 'F';
}

String? gradeFromPercent(double percent, List<GradeBoundary> boundaries) {
  final ordered = [...boundaries]
    ..sort(
      (left, right) =>
          right.minimumPercentage.compareTo(left.minimumPercentage),
    );
  for (final boundary in ordered) {
    if (percent >= boundary.minimumPercentage) return boundary.gradeCode;
  }
  return null;
}

int _asInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  return int.tryParse('$value') ?? fallback;
}

double _asDouble(dynamic value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? fallback;
}

double? _asNullableDouble(dynamic value) {
  if (value == null || '$value'.isEmpty) return null;
  return _asDouble(value);
}
