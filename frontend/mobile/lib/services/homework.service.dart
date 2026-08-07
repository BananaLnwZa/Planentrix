import 'package:dio/dio.dart';

import '../common/HomeworkTimeFormat.dart';
import '../interfaces/homework.interface.dart';
import 'api.service.dart';

class HomeworkException implements Exception {
  final String message;

  const HomeworkException(this.message);

  @override
  String toString() => message;
}

abstract class HomeworkRepository {
  Future<List<HomeworkTaskData>> getPendingHomework();
  Future<List<HomeworkSubject>> getSubjects();
  Future<HomeworkTaskData> createHomework(CreateHomeworkInput input);
  Future<HomeworkTaskData> updateHomework(
    HomeworkTaskData task,
    UpdateHomeworkInput input,
  );
  Future<void> deleteHomework(int workloadId);
  Future<void> finishHomework(int workloadId);
}

class HomeworkService implements HomeworkRepository {
  final ApiService _apiService;

  HomeworkService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  @override
  Future<List<HomeworkTaskData>> getPendingHomework() async {
    try {
      final response = await _apiService.get('/user/workload/pending');
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map(
            (item) =>
                HomeworkTaskData.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList()
        ..sort((left, right) => left.deadline.compareTo(right.deadline));
    } on DioException catch (error) {
      throw _toHomeworkException(error, 'ไม่สามารถโหลดรายการงานได้');
    } on TypeError {
      throw const HomeworkException('ข้อมูลรายการงานจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<HomeworkTaskData> updateHomework(
    HomeworkTaskData task,
    UpdateHomeworkInput input,
  ) async {
    try {
      await _apiService.put(
        '/user/workload/update/${task.workloadId}',
        data: {
          'workload_name': input.assignment.trim(),
          'deadline_date': _dateValue(input.deadline),
          'deadline_time': formatHomeworkApiTime(input.deadline),
          'note': input.note.trim().isEmpty ? null : input.note.trim(),
        },
      );
      return task.copyWith(
        assignment: input.assignment.trim(),
        deadline: input.deadline,
        note: input.note.trim(),
      );
    } on DioException catch (error) {
      throw _toHomeworkException(error, 'ไม่สามารถแก้ไขงานได้');
    }
  }

  @override
  Future<List<HomeworkSubject>> getSubjects() async {
    try {
      final response = await _apiService.get(
        '/user/workload/subjects',
        queryParameters: {'schedule_type_id': 1},
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      final data = body['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map(
            (item) => HomeworkSubject.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw _toHomeworkException(error, 'ไม่สามารถโหลดรายวิชาได้');
    } on TypeError {
      throw const HomeworkException('ข้อมูลรายวิชาจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<void> deleteHomework(int workloadId) async {
    try {
      await _apiService.delete('/user/workload/delete/$workloadId');
    } on DioException catch (error) {
      throw _toHomeworkException(error, 'ไม่สามารถลบงานได้');
    }
  }

  @override
  Future<HomeworkTaskData> createHomework(CreateHomeworkInput input) async {
    try {
      final response = await _apiService.post(
        '/user/workload/add',
        data: {
          'schedule_time_id': input.subject.scheduleTimeId,
          'workload_type_id': input.type.id,
          'workload_name': input.assignment,
          'deadline_date': _dateValue(input.deadline),
          'deadline_time': formatHomeworkApiTime(input.deadline),
          'note': input.note.trim().isEmpty ? null : input.note.trim(),
        },
      );
      final body = Map<String, dynamic>.from(response.data as Map);
      return HomeworkTaskData(
        workloadId: _asInt(body['workload_id']),
        scheduleTimeId: input.subject.scheduleTimeId,
        workloadTypeId: input.type.id,
        workloadTypeName: '${body['workload_type_name'] ?? input.type.name}',
        subjectId: input.subject.subjectId,
        subject: input.subject.subjectName,
        assignment: input.assignment,
        deadline: input.deadline,
        dueDate:
            '${input.deadline.day}/${input.deadline.month}/${input.deadline.year + 543}',
        dueTime: formatHomeworkDisplayTime(input.deadline),
        note: input.note,
      );
    } on DioException catch (error) {
      throw _toHomeworkException(error, 'ไม่สามารถเพิ่มงานได้');
    } on TypeError {
      throw const HomeworkException('ข้อมูลการเพิ่มงานจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<void> finishHomework(int workloadId) async {
    try {
      await _apiService.put('/user/workload/finish/$workloadId');
    } on DioException catch (error) {
      throw _toHomeworkException(error, 'ไม่สามารถส่งงานได้');
    }
  }

  HomeworkException _toHomeworkException(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return HomeworkException(data['message'] as String);
    }
    return HomeworkException(fallback);
  }
}

String _dateValue(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-'
    '${value.month.toString().padLeft(2, '0')}-'
    '${value.day.toString().padLeft(2, '0')}';

int _asInt(dynamic value) {
  if (value is int) return value;
  return int.tryParse('$value') ?? 0;
}
