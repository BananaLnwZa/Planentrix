/// Busy day constraint model used during registration
class BusyDay {
  final int day; // 1 to 7 (Monday to Sunday)
  final String start; // HH:mm or HH:mm:ss
  final String end; // HH:mm or HH:mm:ss

  BusyDay({required this.day, required this.start, required this.end});

  Map<String, dynamic> toJson() {
    return {'day': day, 'start': start, 'end': end};
  }

  factory BusyDay.fromJson(Map<String, dynamic> json) {
    return BusyDay(
      day: json['day'] as int,
      start: json['start'] as String,
      end: json['end'] as String,
    );
  }
}

/// Request payload for user registration
class RegisterRequest {
  final String userName;
  final String userPassword;
  final String? userBirthdate; // YYYY-MM-DD
  final String? userGender; // "male", "female", "other"

  // Constraints
  final int? dayOff; // Day of week (1-7)
  final int? continuousWorkingDuration; // In minutes
  final int? breakTime; // In minutes
  final String? startTime; // HH:mm
  final String? endTime; // HH:mm
  final int? timePreference; // e.g. Morning (1), Afternoon (2), etc.
  final List<BusyDay>? busyDays;

  RegisterRequest({
    required this.userName,
    required this.userPassword,
    this.userBirthdate,
    this.userGender,
    this.dayOff,
    this.continuousWorkingDuration,
    this.breakTime,
    this.startTime,
    this.endTime,
    this.timePreference,
    this.busyDays,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {
      'user_name': userName,
      'user_password': userPassword,
      'user_birthdate': userBirthdate,
      'user_gender': userGender,
      'day_off': dayOff,
      'continuous_working_duration': continuousWorkingDuration,
      'break': breakTime,
      'start_time': startTime,
      'end_time': endTime,
      'time_preference': timePreference,
    };

    if (busyDays != null) {
      data['busy_days'] = busyDays!.map((bd) => bd.toJson()).toList();
    }

    return data;
  }
}

/// Request payload for logging in
class LoginRequest {
  final String userName;
  final String userPassword;
  final String platform; // Should be "mobile" for the mobile app

  LoginRequest({
    required this.userName,
    required this.userPassword,
    this.platform = 'mobile',
  });

  Map<String, dynamic> toJson() {
    return {
      'user_name': userName,
      'user_password': userPassword,
      'platform': platform,
    };
  }
}

/// Response payload for successful login
class LoginResponse {
  final String message;
  final String role;
  final int userId;
  final String accessToken;
  final String expiresIn;
  final String? refreshToken; // Sent only for mobile platform

  LoginResponse({
    required this.message,
    required this.role,
    required this.userId,
    required this.accessToken,
    required this.expiresIn,
    this.refreshToken,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      message: json['message'] as String,
      role: json['role'] as String,
      userId: json['userId'] as int,
      accessToken: json['accessToken'] as String,
      expiresIn: json['expiresIn'] as String,
      refreshToken: json['refreshToken'] as String?,
    );
  }
}

/// Request payload for refreshing access token
class RefreshTokenRequest {
  final String refreshToken;

  RefreshTokenRequest({required this.refreshToken});

  Map<String, dynamic> toJson() {
    return {'refreshToken': refreshToken};
  }
}

/// Response payload for refreshing access token
class RefreshTokenResponse {
  final String accessToken;
  final String expiresIn;

  RefreshTokenResponse({required this.accessToken, required this.expiresIn});

  factory RefreshTokenResponse.fromJson(Map<String, dynamic> json) {
    return RefreshTokenResponse(
      accessToken: json['accessToken'] as String,
      expiresIn: json['expiresIn'] as String,
    );
  }
}

/// Represents the local user session data saved on the device
class UserSession {
  final int userId;
  final String username;
  final String role;
  final String accessToken;
  final String? refreshToken;

  UserSession({
    required this.userId,
    required this.username,
    required this.role,
    required this.accessToken,
    this.refreshToken,
  });

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'username': username,
      'role': role,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
    };
  }

  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      userId: json['userId'] as int,
      username: json['username'] as String,
      role: json['role'] as String,
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String?,
    );
  }
}
