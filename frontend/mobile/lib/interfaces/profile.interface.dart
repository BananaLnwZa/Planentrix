class UserProfile {
  final int userId;
  final String userName;
  final String? firstName;
  final String? lastName;
  final String? fullName;
  final String? email;
  final String? userPicUrl;
  final DateTime? birthdate;
  final String? gender;
  final dynamic academicYear;
  final int? departmentId;
  final String? departmentCode;
  final String? departmentName;
  final int? facultyId;
  final String? facultyName;
  final int? studentTermId;
  final int? yearLevel;
  final int? semesterNo;
  final String? studentTermStatus;
  final String? accountStatus;
  final String? accountCreatedAt;
  final String? lastLogin;

  const UserProfile({
    required this.userId,
    required this.userName,
    this.firstName,
    this.lastName,
    this.fullName,
    this.email,
    this.userPicUrl,
    this.birthdate,
    this.gender,
    this.academicYear,
    this.departmentId,
    this.departmentCode,
    this.departmentName,
    this.facultyId,
    this.facultyName,
    this.studentTermId,
    this.yearLevel,
    this.semesterNo,
    this.studentTermStatus,
    this.accountStatus,
    this.accountCreatedAt,
    this.lastLogin,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    userId: _asInt(json['user_id']),
    userName: '${json['user_name'] ?? ''}',
    firstName: json['first_name']?.toString(),
    lastName: json['last_name']?.toString(),
    fullName: json['full_name']?.toString(),
    email: json['email']?.toString(),
    userPicUrl: json['user_pic_url']?.toString(),
    birthdate: _asDate(json['user_birthdate']),
    gender: json['user_gender']?.toString(),
    academicYear: json['academic_year'],
    departmentId: _nullableInt(json['department_id']),
    departmentCode: json['department_code']?.toString(),
    departmentName: json['department_name']?.toString(),
    facultyId: _nullableInt(json['faculty_id']),
    facultyName: json['faculty_name']?.toString(),
    studentTermId: _nullableInt(json['student_term_id']),
    yearLevel: _nullableInt(json['year_level']),
    semesterNo: _nullableInt(json['semester_no']),
    studentTermStatus: json['student_term_status']?.toString(),
    accountStatus: json['account_status']?.toString(),
    accountCreatedAt: json['account_created_at']?.toString(),
    lastLogin: json['last_login']?.toString(),
  );
}

class BusyTime {
  final int day;
  final String start;
  final String end;

  const BusyTime({required this.day, required this.start, required this.end});

  factory BusyTime.fromJson(Map<String, dynamic> json) => BusyTime(
    day: _asInt(json['day']),
    start: _time(json['start']),
    end: _time(json['end']),
  );

  Map<String, dynamic> toJson() => {'day': day, 'start': start, 'end': end};
}

class UserConstraint {
  final int constraintId;
  final int userId;
  final int? dayOff;
  final int? continuousWorkingDuration;
  final int? breakDuration;
  final String? startTime;
  final String? endTime;
  final List<BusyTime> busyDays;

  const UserConstraint({
    required this.constraintId,
    required this.userId,
    this.dayOff,
    this.continuousWorkingDuration,
    this.breakDuration,
    this.startTime,
    this.endTime,
    this.busyDays = const [],
  });

  factory UserConstraint.fromJson(Map<String, dynamic> json) {
    final rawBusyDays = json['busy_days'];
    return UserConstraint(
      constraintId: _asInt(json['constraint_id']),
      userId: _asInt(json['user_id']),
      dayOff: _nullableInt(json['day_off']),
      continuousWorkingDuration: _nullableInt(
        json['continuous_working_duration'],
      ),
      breakDuration: _nullableInt(json['break']),
      startTime: json['start_time'] == null ? null : _time(json['start_time']),
      endTime: json['end_time'] == null ? null : _time(json['end_time']),
      busyDays: rawBusyDays is List
          ? rawBusyDays
                .whereType<Map>()
                .map(
                  (item) => BusyTime.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
    );
  }
}

class UpdateProfileInput {
  final String userName;
  final DateTime? birthdate;
  final String? gender;

  const UpdateProfileInput({
    required this.userName,
    this.birthdate,
    this.gender,
  });

  Map<String, dynamic> toJson() => {
    'user_name': userName,
    if (birthdate != null) 'user_birthdate': _dateOnly(birthdate!),
    if (gender != null && gender!.isNotEmpty) 'user_gender': gender,
  };
}

class UpdateConstraintInput {
  final int? dayOff;
  final int? continuousWorkingDuration;
  final int? breakDuration;
  final String? startTime;
  final String? endTime;
  final List<BusyTime> busyDays;

  const UpdateConstraintInput({
    this.dayOff,
    this.continuousWorkingDuration,
    this.breakDuration,
    this.startTime,
    this.endTime,
    this.busyDays = const [],
  });

  Map<String, dynamic> toJson() => {
    'day_off': dayOff,
    'continuous_working_duration': continuousWorkingDuration,
    'break': breakDuration,
    'start_time': startTime,
    'end_time': endTime,
    'busy_days': busyDays.map((item) => item.toJson()).toList(),
  };
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

int? _nullableInt(dynamic value) => value == null ? null : _asInt(value);

DateTime? _asDate(dynamic value) =>
    value == null ? null : DateTime.tryParse('$value');

String _time(dynamic value) {
  final text = '$value';
  return text.length >= 5 ? text.substring(0, 5) : text;
}

String _dateOnly(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-'
    '${value.month.toString().padLeft(2, '0')}-'
    '${value.day.toString().padLeft(2, '0')}';
