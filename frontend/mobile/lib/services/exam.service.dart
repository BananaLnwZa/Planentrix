import 'package:dio/dio.dart';

import '../interfaces/exam.interface.dart';
import 'api.service.dart';

class ExamException implements Exception {
  final String message;

  const ExamException(this.message);

  @override
  String toString() => message;
}

abstract class ExamRepository {
  Future<List<ExamSummary>> getExams();
  Future<ExamDetail> getExamDetail(int examRepositoryId);
  Future<List<ExamHistoryItem>> getHistory();
  Future<ExamInsights> getInsights();
  Future<ExamSubmissionResult> submitExam(
    int examRepositoryId,
    List<ExamAnswer> answers,
  );
}

class ExamService implements ExamRepository {
  final ApiService _apiService;

  ExamService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<List<ExamSummary>> getExams() async {
    try {
      final response = await _apiService.get('/user/exam');
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map((item) => ExamSummary.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw _toExamException(error, 'ไม่สามารถโหลดชุดข้อสอบได้');
    } on TypeError {
      throw const ExamException('ข้อมูลชุดข้อสอบจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<ExamDetail> getExamDetail(int examRepositoryId) async {
    try {
      final response = await _apiService.get('/user/exam/$examRepositoryId');
      final body = Map<String, dynamic>.from(response.data as Map);
      return ExamDetail.fromJson(
        Map<String, dynamic>.from(body['data'] as Map),
      );
    } on DioException catch (error) {
      throw _toExamException(error, 'ไม่สามารถโหลดรายละเอียดข้อสอบได้');
    } on TypeError {
      throw const ExamException('ข้อมูลรายละเอียดข้อสอบไม่ถูกต้อง');
    }
  }

  @override
  Future<List<ExamHistoryItem>> getHistory() async {
    try {
      final response = await _apiService.get('/user/exam/history');
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map(
            (item) => ExamHistoryItem.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw _toExamException(error, 'ไม่สามารถโหลดประวัติการทำข้อสอบได้');
    } on TypeError {
      throw const ExamException('ข้อมูลประวัติข้อสอบไม่ถูกต้อง');
    }
  }

  @override
  Future<ExamInsights> getInsights() async {
    try {
      final response = await _apiService.get('/user/exam/insights');
      return ExamInsights.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw _toExamException(error, 'ไม่สามารถโหลดคำแนะนำการทบทวนได้');
    } on TypeError {
      throw const ExamException('ข้อมูลคำแนะนำการทบทวนไม่ถูกต้อง');
    }
  }

  @override
  Future<ExamSubmissionResult> submitExam(
    int examRepositoryId,
    List<ExamAnswer> answers,
  ) async {
    try {
      final response = await _apiService.post(
        '/user/exam/$examRepositoryId/submit',
        data: {'answers': answers.map((answer) => answer.toJson()).toList()},
      );
      return ExamSubmissionResult.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw _toExamException(error, 'ไม่สามารถส่งข้อสอบได้');
    } on TypeError {
      throw const ExamException('ผลการส่งข้อสอบไม่ถูกต้อง');
    }
  }

  ExamException _toExamException(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return ExamException(data['message'] as String);
    }
    return ExamException(fallback);
  }
}
