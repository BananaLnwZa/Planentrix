import 'package:dio/dio.dart';

import '../interfaces/time.interface.dart';
import 'api.service.dart';

class TimeException implements Exception {
  final String message;
  final String? code;
  final StudySession? session;

  const TimeException(this.message, {this.code, this.session});

  @override
  String toString() => message;
}

abstract class TimeRepository {
  Future<TimerSetup> getSetup();
  Future<ActiveStudySession> getActiveSession();
  Future<StudyDashboard> getDashboard();
  Future<StudySession> startSession({
    required int scheduleTimeId,
    required int studyTypeId,
  });
  Future<StudySession> pauseSession(int studyTimeId, int version);
  Future<StudySession> resumeSession(int studyTimeId, int version);
  Future<StudySession> finishSession(int studyTimeId, int version);
  Future<StudySession> heartbeatSession(int studyTimeId, int version);
  Future<StudySession> recoverSession(
    int studyTimeId,
    int version,
    String action,
  );
}

class TimeService implements TimeRepository {
  final ApiService _apiService;

  TimeService({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  static const _errorMessages = <String, String>{
    'NO_CURRENT_TERM': 'ยังไม่มีเทอมปัจจุบัน กรุณาสร้างเทอมก่อนเริ่มจับเวลา',
    'INVALID_TIMER_SELECTION': 'กรุณาเลือกวิชาและวิธีทบทวนให้ครบถ้วน',
    'SUBJECT_NOT_FOUND': 'ไม่พบวิชานี้ในตารางเรียนของเทอมปัจจุบัน',
    'STUDY_TYPE_NOT_FOUND': 'ไม่พบวิธีทบทวนที่เลือก',
    'OPEN_SESSION_EXISTS': 'มีรายการจับเวลาที่ยังจัดการไม่เสร็จอยู่แล้ว',
    'SESSION_NOT_FOUND': 'ไม่พบรายการจับเวลานี้ในเทอมปัจจุบัน',
    'SESSION_VERSION_CONFLICT':
        'รายการนี้ถูกแก้ไขจากอุปกรณ์อื่น ระบบจะโหลดข้อมูลล่าสุดให้',
    'INVALID_SESSION_STATE': 'สถานะรายการจับเวลาไม่รองรับคำสั่งนี้',
    'SESSION_HARD_LIMIT_REACHED':
        'รายการนี้ถึงเวลาสูงสุด 4 ชั่วโมงแล้ว กรุณาบันทึกหรือยกเลิก',
    'SESSION_NOT_STALE': 'รายการนี้ไม่จำเป็นต้องกู้คืนแล้ว',
    'INVALID_SESSION_REQUEST': 'ข้อมูลรายการจับเวลาไม่ถูกต้อง',
    'INVALID_RECOVERY_REQUEST': 'ตัวเลือกการกู้รายการจับเวลาไม่ถูกต้อง',
  };

  @override
  Future<TimerSetup> getSetup() async {
    try {
      final response = await _apiService.get('/user/time/setup');
      return TimerSetup.fromJson(_body(response.data));
    } on DioException catch (error) {
      throw _toException(error, 'ไม่สามารถโหลดข้อมูลสำหรับจับเวลาได้');
    } on TypeError {
      throw const TimeException('ข้อมูลสำหรับจับเวลาจากระบบไม่ถูกต้อง');
    }
  }

  @override
  Future<ActiveStudySession> getActiveSession() async {
    try {
      final response = await _apiService.get('/user/time/active');
      return ActiveStudySession.fromJson(_body(response.data));
    } on DioException catch (error) {
      throw _toException(error, 'ไม่สามารถตรวจสอบรายการที่กำลังจับเวลาได้');
    } on TypeError {
      throw const TimeException('ข้อมูลรายการจับเวลาไม่ถูกต้อง');
    }
  }

  @override
  Future<StudyDashboard> getDashboard() async {
    try {
      final response = await _apiService.get('/user/time/dashboard');
      return StudyDashboard.fromJson(_body(response.data));
    } on DioException catch (error) {
      throw _toException(error, 'ไม่สามารถโหลดสถิติการทบทวนได้');
    } on TypeError {
      throw const TimeException('ข้อมูลสถิติการทบทวนไม่ถูกต้อง');
    }
  }

  @override
  Future<StudySession> startSession({
    required int scheduleTimeId,
    required int studyTypeId,
  }) async {
    try {
      final response = await _apiService.post(
        '/user/time/start',
        data: {
          'schedule_time_id': scheduleTimeId,
          'study_type_id': studyTypeId,
        },
      );
      return _session(response.data);
    } on DioException catch (error) {
      throw _toException(error, 'ไม่สามารถเริ่มจับเวลาได้');
    }
  }

  @override
  Future<StudySession> pauseSession(int studyTimeId, int version) =>
      _patchSession(studyTimeId, 'pause', {
        'version': version,
      }, 'ไม่สามารถพักเวลาได้');

  @override
  Future<StudySession> resumeSession(int studyTimeId, int version) =>
      _patchSession(studyTimeId, 'resume', {
        'version': version,
      }, 'ไม่สามารถจับเวลาต่อได้');

  @override
  Future<StudySession> finishSession(int studyTimeId, int version) =>
      _patchSession(studyTimeId, 'finish', {
        'version': version,
      }, 'ไม่สามารถบันทึกเวลาทบทวนได้');

  @override
  Future<StudySession> heartbeatSession(int studyTimeId, int version) async {
    try {
      final response = await _apiService.post(
        '/user/time/$studyTimeId/heartbeat',
        data: {'version': version},
      );
      return _session(response.data);
    } on DioException catch (error) {
      throw _toException(error, 'ไม่สามารถซิงก์รายการจับเวลาได้');
    }
  }

  @override
  Future<StudySession> recoverSession(
    int studyTimeId,
    int version,
    String action,
  ) => _patchSession(studyTimeId, 'recover', {
    'version': version,
    'action': action,
  }, 'ไม่สามารถจัดการรายการจับเวลาที่ค้างอยู่ได้');

  Future<StudySession> _patchSession(
    int studyTimeId,
    String action,
    Map<String, dynamic> data,
    String fallback,
  ) async {
    try {
      final response = await _apiService.dio.patch(
        '/user/time/$studyTimeId/$action',
        data: data,
      );
      return _session(response.data);
    } on DioException catch (error) {
      throw _toException(error, fallback);
    }
  }

  StudySession _session(dynamic responseData) {
    final data = _body(responseData)['data'];
    if (data is! Map) {
      throw const TimeException('ข้อมูลรายการจับเวลาไม่ถูกต้อง');
    }
    return StudySession.fromJson(Map<String, dynamic>.from(data));
  }

  Map<String, dynamic> _body(dynamic value) =>
      Map<String, dynamic>.from(value as Map);

  TimeException _toException(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map) {
      final body = Map<String, dynamic>.from(data);
      final code = body['code']?.toString();
      final rawSession = body['data'];
      return TimeException(
        code == null
            ? body['message']?.toString() ?? fallback
            : _errorMessages[code] ?? body['message']?.toString() ?? fallback,
        code: code,
        session: rawSession is Map
            ? StudySession.fromJson(Map<String, dynamic>.from(rawSession))
            : null,
      );
    }
    return TimeException(fallback);
  }
}
