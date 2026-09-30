import 'package:dio/dio.dart';
import '../interfaces/auth.interface.dart';
import 'api.service.dart';
import 'storage.service.dart';
import 'homework_reminder.service.dart';
import 'app_notification.service.dart';

class AuthException implements Exception {
  final String message;
  final int? statusCode;

  const AuthException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class AuthService {
  static const String supportedRole = 'user';
  static const String studentOnlyMessage =
      'แอปมือถือรองรับเฉพาะบัญชีนักศึกษา อาจารย์และเจ้าหน้าที่กรุณาใช้งานผ่านเว็บไซต์';

  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  // ==============================
  // LOGIN
  // ==============================

  /// Log in with username and password.
  /// Automatically sends `platform: "mobile"` so the backend returns a refresh token.
  /// Stores both access token and refresh token in secure storage for persistent sessions.
  Future<LoginResponse> login(String username, String password) async {
    try {
      final request = LoginRequest(
        userName: username,
        userPassword: password,
        platform: 'mobile',
      );

      final response = await _apiService.post(
        '/auth/login',
        data: {...request.toJson(), 'role': 'user'},
      );

      final loginResponse = LoginResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      // The mobile application is intentionally student-only. Do not keep a
      // privileged session even if the backend ever returns one unexpectedly.
      if (!_isSupportedRole(loginResponse.role)) {
        await _storageService.clearSession();
        throw const AuthException(studentOnlyMessage, statusCode: 403);
      }

      // Save session to secure storage for auto-login on next app launch
      await _storageService.saveSession(
        UserSession(
          userId: loginResponse.userId,
          username: username,
          role: loginResponse.role,
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
        ),
      );

      return loginResponse;
    } on DioException catch (error) {
      throw _toAuthException(
        error,
        fallbackMessage: 'Login failed. Please try again.',
      );
    } on FormatException {
      throw const AuthException('Invalid response from server');
    } on TypeError {
      throw const AuthException('Invalid response from server');
    }
  }

  // ==============================
  // REGISTER
  // ==============================

  Future<RegistrationOptions> getRegistrationOptions() async {
    try {
      final response = await _apiService.get('/auth/registration-options');
      return RegistrationOptions.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw _toAuthException(
        error,
        fallbackMessage: 'ไม่สามารถโหลดข้อมูลคณะและสาขาได้',
      );
    } on TypeError {
      throw const AuthException('ข้อมูลคณะและสาขาจากระบบไม่ถูกต้อง');
    }
  }

  /// Register a new user account with optional constraints and busy days.
  Future<void> register(RegisterRequest request) async {
    try {
      await _apiService.post('/auth/register', data: request.toJson());
    } on DioException catch (error) {
      throw _toAuthException(
        error,
        fallbackMessage: 'Registration failed. Please try again.',
      );
    }
  }

  // ==============================
  // REFRESH TOKEN
  // ==============================

  /// Request a new access token using the stored refresh token.
  /// Returns `true` if the refresh was successful, `false` otherwise.
  Future<bool> refreshToken() async {
    final currentSession = await _storageService.getSession();
    if (currentSession == null || !_isSupportedRole(currentSession.role)) {
      await _storageService.clearSession();
      return false;
    }

    final storedRefreshToken = await _storageService.getRefreshToken();
    if (storedRefreshToken == null || storedRefreshToken.isEmpty) {
      return false;
    }

    try {
      final request = RefreshTokenRequest(refreshToken: storedRefreshToken);
      final response = await _apiService.post(
        '/auth/refresh-token',
        data: request.toJson(),
      );

      final refreshResponse = RefreshTokenResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Update stored access token and session
      await _storageService.saveAccessToken(refreshResponse.accessToken);

      await _storageService.saveSession(
        UserSession(
          userId: currentSession.userId,
          username: currentSession.username,
          role: supportedRole,
          accessToken: refreshResponse.accessToken,
          refreshToken: currentSession.refreshToken,
        ),
      );

      return true;
    } catch (e) {
      // Refresh failed — session is invalid
      await _storageService.clearSession();
      return false;
    }
  }

  // ==============================
  // LOGOUT
  // ==============================

  /// Log out the current user.
  /// Notifies the backend to invalidate the refresh token and clears local storage.
  Future<void> logout() async {
    try {
      await _apiService.post('/auth/logout');
    } catch (_) {
      // Even if the backend call fails, still clear local session
    } finally {
      await _storageService.clearSession();
      await _cancelHomeworkReminders();
    }
  }

  // ==============================
  // ARCHIVE ACCOUNT
  // ==============================

  /// Archive the account while preserving academic history, then clear session.
  Future<void> archiveAccount() async {
    await _apiService.patch('/auth/me/archive');
    await _storageService.clearSession();
    await _cancelHomeworkReminders();
  }

  // ==============================
  // SESSION CHECK (Auto-login)
  // ==============================

  /// Check if a valid session exists on the device.
  /// If the access token is expired but a refresh token is available,
  /// it will attempt to refresh the token silently.
  /// Returns the [UserSession] if logged in, or `null` if not.
  Future<UserSession?> getCurrentSession() async {
    final session = await _storageService.getSession();
    if (session == null) return null;

    if (!_isSupportedRole(session.role)) {
      await _storageService.clearSession();
      return null;
    }

    // Try a lightweight authenticated call to verify the token is still valid
    try {
      await _apiService.get('/user/profile');
      return session;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Token expired — attempt refresh
        final refreshed = await refreshToken();
        if (refreshed) {
          // Re-read updated session from storage
          final refreshedSession = await _storageService.getSession();
          if (refreshedSession != null &&
              _isSupportedRole(refreshedSession.role)) {
            return refreshedSession;
          }
          await _storageService.clearSession();
          return null;
        }
        // Refresh also failed — no valid session
        return null;
      }
      if (e.response?.statusCode == 403) {
        // A stored token belongs to a role that cannot use student endpoints.
        await _storageService.clearSession();
        return null;
      }
      // Other network errors — return session as-is (offline scenario)
      return session;
    }
  }

  /// Quick check whether tokens exist locally (does not verify with backend).
  Future<bool> isLoggedIn() async {
    final session = await _storageService.getSession();
    if (session == null) return false;
    if (_isSupportedRole(session.role)) return true;

    await _storageService.clearSession();
    return false;
  }

  static bool _isSupportedRole(String role) => role == supportedRole;

  AuthException _toAuthException(
    DioException error, {
    required String fallbackMessage,
  }) {
    final data = error.response?.data;
    if (data is Map) {
      final errors = data['errors'];
      if (errors is List) {
        final messages = errors.whereType<String>().toList(growable: false);
        if (messages.isNotEmpty) {
          return AuthException(
            messages.first,
            statusCode: error.response?.statusCode,
          );
        }
      }
    }
    if (data is Map && data['message'] is String) {
      return AuthException(
        data['message'] as String,
        statusCode: error.response?.statusCode,
      );
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return const AuthException(
          'Unable to connect to the server. Please try again.',
        );
      default:
        return AuthException(fallbackMessage);
    }
  }

  Future<void> _cancelHomeworkReminders() async {
    try {
      await HomeworkReminderService.instance.cancelAllHomeworkReminders();
      await AppNotificationService.instance.cancelAll();
    } catch (_) {
      // Logout/account deletion must still complete if notifications fail.
    }
  }
}
