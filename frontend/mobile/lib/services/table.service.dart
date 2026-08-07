import 'package:dio/dio.dart';

import '../interfaces/table.interface.dart';
import 'api.service.dart';

class TableException implements Exception {
  final String message;

  const TableException(this.message);

  @override
  String toString() => message;
}

abstract class TableRepository {
  Future<CurrentSchedule?> getCurrentSchedule();
  Future<ScheduleItem> getScheduleDetail(int scheduleTimeId);
  Future<List<ScheduleSubject>> getCurrentTermSubjects();
  Future<void> addSchedule(AddScheduleInput input);
  Future<void> updateSchedule(int scheduleTimeId, UpdateScheduleInput input);
  Future<void> deleteSchedule(int scheduleTimeId);
}

class TableService implements TableRepository {
  final ApiService _apiService;

  TableService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<CurrentSchedule?> getCurrentSchedule() async {
    try {
      final response = await _apiService.get('/user/schedule');
      return CurrentSchedule.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) return null;
      throw _exception(error, 'ไม่สามารถโหลดตารางเวลาได้');
    } on TypeError {
      throw const TableException('ข้อมูลตารางเวลาจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<ScheduleItem> getScheduleDetail(int scheduleTimeId) async {
    try {
      final response = await _apiService.get(
        '/user/schedule/detail/$scheduleTimeId',
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      return ScheduleItem.fromJson(
        Map<String, dynamic>.from(body['data'] as Map),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถโหลดรายละเอียดตารางเวลาได้');
    } on TypeError {
      throw const TableException('ข้อมูลรายละเอียดตารางเวลาไม่ถูกต้อง');
    }
  }

  @override
  Future<List<ScheduleSubject>> getCurrentTermSubjects() async {
    try {
      final response = await _apiService.get('/user/schedule/subjects');
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map(
            (item) => ScheduleSubject.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถโหลดรายวิชาได้');
    }
  }

  @override
  Future<void> addSchedule(AddScheduleInput input) async {
    try {
      await _apiService.post('/user/schedule/add-time', data: input.toJson());
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถเพิ่มบล็อกเวลาได้');
    }
  }

  @override
  Future<void> updateSchedule(
    int scheduleTimeId,
    UpdateScheduleInput input,
  ) async {
    try {
      await _apiService.put(
        '/user/schedule/edit/$scheduleTimeId',
        data: input.toJson(),
      );
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถแก้ไขตารางเวลาได้');
    }
  }

  @override
  Future<void> deleteSchedule(int scheduleTimeId) async {
    try {
      await _apiService.delete('/user/schedule/$scheduleTimeId');
    } on DioException catch (error) {
      throw _exception(error, 'ไม่สามารถลบบล็อกเวลาได้');
    }
  }

  TableException _exception(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return TableException(data['message'] as String);
    }
    return TableException(fallback);
  }
}
