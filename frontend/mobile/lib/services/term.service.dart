import 'package:dio/dio.dart';

import '../interfaces/term.interface.dart';
import 'api.service.dart';

class TermException implements Exception {
  final String message;

  const TermException(this.message);

  @override
  String toString() => message;
}

abstract class TermRepository {
  Future<CurrentTerm?> getCurrentTerm();
  Future<CurrentTerm> createTerm(CreateTermRequest request);
  Future<void> endCurrentTerm();
}

class TermService implements TermRepository {
  final ApiService _apiService;

  TermService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<CurrentTerm?> getCurrentTerm() async {
    try {
      final response = await _apiService.get('/user/terms/current');
      final body = response.data as Map<String, dynamic>;
      return CurrentTerm.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) return null;
      throw _toTermException(error, 'ไม่สามารถโหลดข้อมูลเทอมได้');
    } on TypeError {
      throw const TermException('ข้อมูลเทอมจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<CurrentTerm> createTerm(CreateTermRequest request) async {
    try {
      final response = await _apiService.post(
        '/user/terms/add',
        data: request.toJson(),
      );
      final body = response.data as Map<String, dynamic>;
      final termId = int.tryParse('${body['term_id']}') ?? 0;
      return request.toCurrentTerm(termId);
    } on DioException catch (error) {
      throw _toTermException(error, 'ไม่สามารถสร้างเทอมได้');
    }
  }

  @override
  Future<void> endCurrentTerm() async {
    try {
      await _apiService.put('/user/terms/end');
    } on DioException catch (error) {
      throw _toTermException(error, 'ไม่สามารถจบเทอมได้');
    }
  }

  TermException _toTermException(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return TermException(data['message'] as String);
    }
    return TermException(fallback);
  }
}
