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
  Future<AvailableTermSections> getAvailableSections({
    required int yearLevel,
    required int academicYear,
    required int semesterNo,
  }) => Future.error(UnimplementedError());
  Future<List<TermHistoryItem>> getTermHistory() async => const [];
  Future<PendingSystemEvaluation?> getPendingSystemEvaluation() async => null;
  Future<void> submitSystemEvaluation(
    int studentTermId,
    SystemEvaluationAnswers answers,
  ) async {}
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
      return CurrentTerm.fromJson(
        Map<String, dynamic>.from(body['current_term'] as Map),
      );
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

  @override
  Future<AvailableTermSections> getAvailableSections({
    required int yearLevel,
    required int academicYear,
    required int semesterNo,
  }) async {
    try {
      final response = await _apiService.get(
        '/user/terms/available-sections',
        queryParameters: {
          'year_level': yearLevel,
          'academic_year': academicYear,
          'semester_no': semesterNo,
        },
      );
      return AvailableTermSections.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw _toTermException(error, 'ไม่สามารถโหลดกลุ่มเรียนที่เปิดอยู่ได้');
    } on TypeError {
      throw const TermException('ข้อมูลกลุ่มเรียนจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<List<TermHistoryItem>> getTermHistory() async {
    try {
      final response = await _apiService.get('/user/terms/history');
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map(
            (item) => TermHistoryItem.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw _toTermException(error, 'ไม่สามารถโหลดประวัติเทอมได้');
    }
  }

  @override
  Future<PendingSystemEvaluation?> getPendingSystemEvaluation() async {
    try {
      final response = await _apiService.get('/user/terms/evaluation/pending');
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data == null) return null;
      return PendingSystemEvaluation.fromJson(
        Map<String, dynamic>.from(data as Map),
      );
    } on DioException catch (error) {
      throw _toTermException(error, 'ไม่สามารถโหลดแบบประเมินระบบได้');
    }
  }

  @override
  Future<void> submitSystemEvaluation(
    int studentTermId,
    SystemEvaluationAnswers answers,
  ) async {
    try {
      await _apiService.post(
        '/user/terms/evaluation',
        data: {'student_term_id': studentTermId, 'responses': answers.toJson()},
      );
    } on DioException catch (error) {
      throw _toTermException(error, 'ส่งแบบประเมินไม่สำเร็จ');
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
