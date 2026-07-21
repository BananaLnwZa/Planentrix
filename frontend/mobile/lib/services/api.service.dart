import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../interfaces/auth.interface.dart';
import 'storage.service.dart';

class ApiService {
  late final Dio dio;
  final StorageService _storageService = StorageService();

  // Singleton pattern
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  ApiService._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: _getBaseUrl(),
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Register Interceptors
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // If the request doesn't already have authorization, fetch token and add it
          if (!options.headers.containsKey('Authorization')) {
            final token = await _storageService.getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Check if error is 401 (Unauthorized) and we haven't retried yet
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['isRetry'] != true) {
            // Avoid refreshing if this was already a refresh-token call to prevent loops
            if (error.requestOptions.path.contains(
                  '/user/auth/refresh-token',
                ) ||
                error.requestOptions.path.contains('/user/auth/login')) {
              return handler.next(error);
            }

            final refreshToken = await _storageService.getRefreshToken();
            if (refreshToken != null && refreshToken.isNotEmpty) {
              try {
                // Set flag to avoid infinite loops
                error.requestOptions.extra['isRetry'] = true;

                // Perform token refresh using a clean Dio instance to avoid interceptor recursion
                final refreshDio = Dio(BaseOptions(baseUrl: _getBaseUrl()));
                final response = await refreshDio.post(
                  '/user/auth/refresh-token',
                  data: {'refreshToken': refreshToken},
                );

                if (response.statusCode == 200 && response.data != null) {
                  final newAccessToken = response.data['accessToken'] as String;

                  // Save new access token
                  await _storageService.saveAccessToken(newAccessToken);

                  // Update current session's access token if session exists
                  final currentSession = await _storageService.getSession();
                  if (currentSession != null) {
                    await _storageService.saveSession(
                      UserSession(
                        userId: currentSession.userId,
                        username: currentSession.username,
                        role: currentSession.role,
                        accessToken: newAccessToken,
                        refreshToken: currentSession.refreshToken,
                      ),
                    );
                  }

                  // Update request options and retry the original call
                  final options = error.requestOptions;
                  options.headers['Authorization'] = 'Bearer $newAccessToken';

                  // Clone request configuration and execute again
                  final retryResponse = await dio.request(
                    options.path,
                    data: options.data,
                    queryParameters: options.queryParameters,
                    options: Options(
                      method: options.method,
                      headers: options.headers,
                      extra: options.extra,
                    ),
                  );
                  return handler.resolve(retryResponse);
                }
              } catch (refreshError) {
                // If token refresh fails, force logout by clearing session storage
                await _storageService.clearSession();
                return handler.reject(
                  DioException(
                    requestOptions: error.requestOptions,
                    error: 'Session expired. Please log in again.',
                    type: DioExceptionType.badResponse,
                  ),
                );
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  /// Resolve backend URL dynamically based on running platform
  String _getBaseUrl() {
    const configuredBaseUrl = String.fromEnvironment('API_BASE_URL');
    if (configuredBaseUrl.isNotEmpty) {
      return configuredBaseUrl;
    }

    if (kIsWeb) {
      // Localhost works fine for Web
      return 'http://localhost:4000';
    }
    // Android emulator routes to host machine via 10.0.2.2
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000';
    }
    // Windows, macOS, iOS simulator
    return 'http://localhost:4000';
  }

  // GET wrapper
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await dio.get(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // POST wrapper
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // PUT wrapper
  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await dio.put(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // DELETE wrapper
  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await dio.delete(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }
}
