import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../interfaces/auth.interface.dart';

class StorageService {
  // Singleton instance
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  static const _secureStorage = FlutterSecureStorage();

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _sessionKey = 'user_session';

  /// Save a key-value pair to secure storage
  Future<void> write(String key, String value) async {
    await _secureStorage.write(key: key, value: value);
  }

  /// Read a value by key from secure storage
  Future<String?> read(String key) async {
    return await _secureStorage.read(key: key);
  }

  /// Delete a key from secure storage
  Future<void> delete(String key) async {
    await _secureStorage.delete(key: key);
  }

  /// Save Access Token
  Future<void> saveAccessToken(String token) async {
    await write(_accessTokenKey, token);
  }

  /// Read Access Token
  Future<String?> getAccessToken() async {
    return await read(_accessTokenKey);
  }

  /// Delete Access Token
  Future<void> deleteAccessToken() async {
    await delete(_accessTokenKey);
  }

  /// Save Refresh Token
  Future<void> saveRefreshToken(String token) async {
    await write(_refreshTokenKey, token);
  }

  /// Read Refresh Token
  Future<String?> getRefreshToken() async {
    return await read(_refreshTokenKey);
  }

  /// Delete Refresh Token
  Future<void> deleteRefreshToken() async {
    await delete(_refreshTokenKey);
  }

  /// Save User Session (contains userId, username, role, accessToken, etc.)
  Future<void> saveSession(UserSession session) async {
    final sessionJson = jsonEncode(session.toJson());
    await write(_sessionKey, sessionJson);
    await saveAccessToken(session.accessToken);
    if (session.refreshToken != null) {
      await saveRefreshToken(session.refreshToken!);
    }
  }

  /// Read User Session
  Future<UserSession?> getSession() async {
    final sessionJson = await read(_sessionKey);
    if (sessionJson == null) return null;
    try {
      final Map<String, dynamic> jsonMap =
          jsonDecode(sessionJson) as Map<String, dynamic>;
      return UserSession.fromJson(jsonMap);
    } catch (e) {
      // If decoding fails, clear the storage
      await clearSession();
      return null;
    }
  }

  /// Clear User Session and all stored tokens
  Future<void> clearSession() async {
    await delete(_sessionKey);
    await deleteAccessToken();
    await deleteRefreshToken();
  }
}
