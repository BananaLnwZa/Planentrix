import 'package:dio/dio.dart';

import '../interfaces/recommendation.interface.dart';
import 'api.service.dart';

class RecommendationException implements Exception {
  final String message;

  const RecommendationException(this.message);

  @override
  String toString() => message;
}

abstract class RecommendationRepository {
  Future<WeeklyRecommendation?> getLatest({String? weekStart});
  Future<AcceptedWeeklySchedule> getWeeklySchedule({String? weekStart});
  Future<WeeklyRecommendation> accept(int recommendationId);
  Future<WeeklyRecommendation> reject(int recommendationId);
  Future<WeeklyRecommendation> addBlock(
    int recommendationId,
    WeeklyBlockInput input,
  );
  Future<WeeklyRecommendation> updateBlock(
    int recommendationId,
    int weeklyBlockId,
    WeeklyBlockInput input,
  );
  Future<WeeklyRecommendation> deleteBlock(
    int recommendationId,
    int weeklyBlockId,
  );
}

class RecommendationService implements RecommendationRepository {
  final ApiService _apiService;

  RecommendationService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<WeeklyRecommendation?> getLatest({String? weekStart}) async {
    try {
      final response = await _apiService.get(
        '/user/recommendations/latest',
        queryParameters: weekStart == null ? null : {'week_start': weekStart},
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      return data is Map
          ? WeeklyRecommendation.fromJson(Map<String, dynamic>.from(data))
          : null;
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถโหลดคำแนะนำล่าสุดได้');
    } on TypeError {
      throw const RecommendationException('ข้อมูลคำแนะนำไม่ถูกต้อง');
    }
  }

  @override
  Future<AcceptedWeeklySchedule> getWeeklySchedule({String? weekStart}) async {
    try {
      final response = await _apiService.get(
        '/user/recommendations/schedule',
        queryParameters: weekStart == null ? null : {'week_start': weekStart},
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      return AcceptedWeeklySchedule.fromJson(
        Map<String, dynamic>.from(body['data'] as Map),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถโหลดแผนประจำสัปดาห์ได้');
    } on TypeError {
      throw const RecommendationException('ข้อมูลแผนประจำสัปดาห์ไม่ถูกต้อง');
    }
  }

  @override
  Future<WeeklyRecommendation> accept(int recommendationId) =>
      _postAction(recommendationId, 'accept', 'ไม่สามารถยอมรับคำแนะนำได้');

  @override
  Future<WeeklyRecommendation> reject(int recommendationId) =>
      _postAction(recommendationId, 'reject', 'ไม่สามารถปฏิเสธคำแนะนำได้');

  @override
  Future<WeeklyRecommendation> addBlock(
    int recommendationId,
    WeeklyBlockInput input,
  ) async {
    try {
      final response = await _apiService.post(
        '/user/recommendations/$recommendationId/blocks',
        data: input.toJson(),
      );
      return _recommendation(response.data);
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถเพิ่มบล็อกเวลาได้');
    }
  }

  @override
  Future<WeeklyRecommendation> updateBlock(
    int recommendationId,
    int weeklyBlockId,
    WeeklyBlockInput input,
  ) async {
    try {
      final response = await _apiService.put(
        '/user/recommendations/$recommendationId/blocks/$weeklyBlockId',
        data: input.toJson(includeSubject: false),
      );
      return _recommendation(response.data);
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถแก้ไขบล็อกเวลาได้');
    }
  }

  @override
  Future<WeeklyRecommendation> deleteBlock(
    int recommendationId,
    int weeklyBlockId,
  ) async {
    try {
      final response = await _apiService.delete(
        '/user/recommendations/$recommendationId/blocks/$weeklyBlockId',
      );
      return _recommendation(response.data);
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถลบบล็อกเวลาได้');
    }
  }

  Future<WeeklyRecommendation> _postAction(
    int recommendationId,
    String action,
    String fallback,
  ) async {
    try {
      final response = await _apiService.post(
        '/user/recommendations/$recommendationId/$action',
      );
      return _recommendation(response.data);
    } on DioException catch (error) {
      throw _exception(error, fallback);
    }
  }

  WeeklyRecommendation _recommendation(dynamic responseData) {
    final body = Map<String, dynamic>.from(responseData as Map);
    return WeeklyRecommendation.fromJson(
      Map<String, dynamic>.from(body['data'] as Map),
    );
  }

  RecommendationException _exception(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return RecommendationException(data['message'] as String);
    }
    return RecommendationException(fallback);
  }
}
