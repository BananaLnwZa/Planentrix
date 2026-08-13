import 'package:dio/dio.dart';

import '../interfaces/score.interface.dart';
import 'api.service.dart';

class ScoreException implements Exception {
  final String message;

  const ScoreException(this.message);

  @override
  String toString() => message;
}

class NoCurrentTermScoreException extends ScoreException {
  const NoCurrentTermScoreException() : super('ยังไม่มีเทอมปัจจุบัน');
}

abstract class ScoreRepository {
  Future<List<SubjectScore>> getCompletedSubjectScores();
  Future<OverallGradeSummary> getOverallGrade();
  Future<void> saveTargetGrades(Map<int, String> goals);
  Future<void> saveWorkloadScore(int workloadId, WorkloadScoreInput input);
}

class ScoreService implements ScoreRepository {
  final ApiService _apiService;

  ScoreService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<List<SubjectScore>> getCompletedSubjectScores() async {
    try {
      final response = await _apiService.get('/user/grade/goals');
      final body = response.data as Map<String, dynamic>;
      final data = body['data'];
      if (data is! List) return const <SubjectScore>[];
      return data
          .whereType<Map>()
          .map((item) => SubjectScore.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) {
        throw const NoCurrentTermScoreException();
      }
      throw _toScoreException(error, 'ไม่สามารถโหลดข้อมูลคะแนนได้');
    } on TypeError {
      throw const ScoreException('ข้อมูลคะแนนจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<OverallGradeSummary> getOverallGrade() async {
    try {
      final response = await _apiService.get('/user/grade/overall');
      return OverallGradeSummary.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) {
        throw const NoCurrentTermScoreException();
      }
      throw _toScoreException(error, 'ไม่สามารถโหลด GPA ได้');
    } on TypeError {
      throw const ScoreException('ข้อมูล GPA จากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<void> saveTargetGrades(Map<int, String> goals) async {
    try {
      await _apiService.post(
        '/user/grade/goals',
        data: {
          'goals': goals.entries
              .map(
                (entry) => {
                  'schedule_time_id': entry.key,
                  'grade': entry.value,
                },
              )
              .toList(),
        },
      );
    } on DioException catch (error) {
      throw _toScoreException(error, 'ไม่สามารถบันทึกเกรดเป้าหมายได้');
    }
  }

  @override
  Future<void> saveWorkloadScore(
    int workloadId,
    WorkloadScoreInput input,
  ) async {
    try {
      await _apiService.post(
        '/user/workload/score',
        data: {
          'workload_id': workloadId,
          'actual_score': input.actualScore,
          'max_score': input.maximumScore,
        },
      );
    } on DioException catch (error) {
      throw _toScoreException(error, 'ไม่สามารถบันทึกคะแนนได้');
    }
  }

  ScoreException _toScoreException(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return ScoreException(data['message'] as String);
    }
    return ScoreException(fallback);
  }
}
