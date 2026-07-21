import 'package:dio/dio.dart';
import '../interfaces/auth.interface.dart';
import 'api.service.dart';
import 'storage.service.dart';

class AuthException implements Exception {
  final String message;
  final int? statusCode;

  const AuthException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class AuthService {
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
        '/user/auth/login',
        data: request.toJson(),
      );

      final loginResponse = LoginResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

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

  /// Register a new user account with optional constraints and busy days.
  Future<void> register(RegisterRequest request) async {
    try {
      await _apiService.post('/user/auth/register', data: request.toJson());
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
    final storedRefreshToken = await _storageService.getRefreshToken();
    if (storedRefreshToken == null || storedRefreshToken.isEmpty) {
      return false;
    }

    try {
      final request = RefreshTokenRequest(refreshToken: storedRefreshToken);
      final response = await _apiService.post(
        '/user/auth/refresh-token',
        data: request.toJson(),
      );

      final refreshResponse = RefreshTokenResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Update stored access token and session
      await _storageService.saveAccessToken(refreshResponse.accessToken);

      final currentSession = await _storageService.getSession();
      if (currentSession != null) {
        await _storageService.saveSession(
          UserSession(
            userId: currentSession.userId,
            username: currentSession.username,
            role: currentSession.role,
            accessToken: refreshResponse.accessToken,
            refreshToken: currentSession.refreshToken,
          ),
        );
      }

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
      await _apiService.post('/user/auth/logout');
    } catch (_) {
      // Even if the backend call fails, still clear local session
    } finally {
      await _storageService.clearSession();
    }
  }

  // ==============================
  // DELETE ACCOUNT
  // ==============================

  /// Delete the current user's account and clear the local session.
  Future<void> deleteAccount() async {
    await _apiService.delete('/user/auth/me');
    await _storageService.clearSession();
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

    // Try a lightweight authenticated call to verify the token is still valid
    try {
      await _apiService.get('/user/profile/${session.userId}');
      return session;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Token expired — attempt refresh
        final refreshed = await refreshToken();
        if (refreshed) {
          // Re-read updated session from storage
          return await _storageService.getSession();
        }
        // Refresh also failed — no valid session
        return null;
      }
      // Other network errors — return session as-is (offline scenario)
      return session;
    }
  }

  /// Quick check whether tokens exist locally (does not verify with backend).
  Future<bool> isLoggedIn() async {
    final session = await _storageService.getSession();
    return session != null;
  }

  AuthException _toAuthException(
    DioException error, {
    required String fallbackMessage,
  }) {
    final data = error.response?.data;
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
}
