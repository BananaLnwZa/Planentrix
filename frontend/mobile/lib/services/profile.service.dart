import 'package:dio/dio.dart';

import '../interfaces/profile.interface.dart';
import 'api.service.dart';

class ProfileException implements Exception {
  final String message;

  const ProfileException(this.message);

  @override
  String toString() => message;
}

abstract class ProfileRepository {
  Future<UserProfile> getProfile();
  Future<UserConstraint> getConstraints();
  Future<UserProfile> updateProfile(UpdateProfileInput input);
  Future<UserConstraint> updateConstraints(UpdateConstraintInput input);
  Future<String> updateAvatar({
    required List<int> bytes,
    required String filename,
  });
}

class ProfileService implements ProfileRepository {
  final ApiService _apiService;

  ProfileService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<UserProfile> getProfile() async {
    try {
      final response = await _apiService.get('/user/profile/page');
      return UserProfile.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } on TypeError {
      throw const ProfileException('ข้อมูลโปรไฟล์จากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<UserConstraint> getConstraints() async {
    try {
      final response = await _apiService.get('/user/profile/constraints');
      return UserConstraint.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถโหลดข้อจำกัดได้');
    } on TypeError {
      throw const ProfileException('ข้อมูลข้อจำกัดจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<UserProfile> updateProfile(UpdateProfileInput input) async {
    try {
      final response = await _apiService.put(
        '/user/profile',
        data: input.toJson(),
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      return UserProfile.fromJson(
        Map<String, dynamic>.from(body['user'] as Map),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถแก้ไขโปรไฟล์ได้');
    }
  }

  @override
  Future<UserConstraint> updateConstraints(UpdateConstraintInput input) async {
    try {
      final response = await _apiService.put(
        '/user/profile/constraints',
        data: input.toJson(),
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      return UserConstraint.fromJson(
        Map<String, dynamic>.from(body['constraint'] as Map),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถแก้ไขข้อจำกัดได้');
    }
  }

  @override
  Future<String> updateAvatar({
    required List<int> bytes,
    required String filename,
  }) async {
    try {
      final formData = FormData.fromMap({
        'avatar': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final response = await _apiService.put(
        '/user/profile/avatar',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      final imageUrl = body['image_url']?.toString();
      if (imageUrl == null || imageUrl.isEmpty) {
        throw const ProfileException('ระบบไม่ได้ส่งที่อยู่รูปโปรไฟล์กลับมา');
      }
      return imageUrl;
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้');
    }
  }

  ProfileException _exception(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return ProfileException(data['message'] as String);
    }
    return ProfileException(fallback);
  }
}
