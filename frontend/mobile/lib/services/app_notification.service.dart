import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../interfaces/app_alert.interface.dart';

class AppNotificationService {
  AppNotificationService._();

  static final AppNotificationService instance = AppNotificationService._();

  static const _trackedKeys = 'planentrix_alert_keys_v1';
  static const _signaturePrefix = 'planentrix_alert_signature_v1_';
  static const _channelId = 'planentrix_schedule_alerts';
  static const _channelName = 'Planentrix reminders';
  static const _channelDescription =
      'แจ้งเตือนเวลาเรียน ทบทวน การบ้าน Checkpoint และกำหนดส่ง';

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  bool get _supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  Future<void> initialize() async {
    if (_initialized || !_supported) return;
    try {
      tz_data.initializeTimeZones();
      tz.setLocalLocation(tz.getLocation('Asia/Bangkok'));
      const settings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      );
      _initialized =
          await _notifications.initialize(settings: settings) ?? false;
    } catch (error) {
      debugPrint('Unable to initialize Planentrix notifications: $error');
      _initialized = false;
    }
  }

  Future<bool> requestPermissions() async {
    if (!_supported) return false;
    await initialize();
    if (!_initialized) return false;
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        return await _notifications
                .resolvePlatformSpecificImplementation<
                  AndroidFlutterLocalNotificationsPlugin
                >()
                ?.requestNotificationsPermission() ??
            true;
      }
      return await _notifications
              .resolvePlatformSpecificImplementation<
                IOSFlutterLocalNotificationsPlugin
              >()
              ?.requestPermissions(alert: true, badge: true, sound: true) ??
          false;
    } catch (error) {
      debugPrint('Unable to request notification permission: $error');
      return false;
    }
  }

  Future<void> syncAlerts(List<AppAlertData> alerts) async {
    if (!await requestPermissions()) return;
    final preferences = await SharedPreferences.getInstance();
    final activeKeys = alerts.map((alert) => alert.id).toSet();
    final tracked = preferences.getStringList(_trackedKeys)?.toSet() ?? {};

    for (final stale in tracked.difference(activeKeys)) {
      await _cancel(stale, preferences);
    }
    for (final alert in alerts) {
      await _schedule(alert, preferences);
    }
  }

  Future<void> scheduleAlert(AppAlertData alert) async {
    if (!await requestPermissions()) return;
    final preferences = await SharedPreferences.getInstance();
    await _schedule(alert, preferences);
  }

  Future<void> cancelAlert(String alertId) async {
    await initialize();
    final preferences = await SharedPreferences.getInstance();
    await _cancel(alertId, preferences);
  }

  Future<void> cancelAll() async {
    await initialize();
    final preferences = await SharedPreferences.getInstance();
    final tracked = preferences.getStringList(_trackedKeys)?.toSet() ?? {};
    for (final key in tracked) {
      await _notifications.cancel(id: _notificationId(key));
      await preferences.remove('$_signaturePrefix$key');
    }
    await preferences.remove(_trackedKeys);
  }

  Future<void> _schedule(
    AppAlertData alert,
    SharedPreferences preferences,
  ) async {
    final now = DateTime.now();
    if (alert.kind == AppAlertKind.homeworkDeadline &&
        !alert.eventAt.isAfter(now)) {
      await _cancel(alert.id, preferences);
      return;
    }
    if (alert.visibleUntil != null && !alert.visibleUntil!.isAfter(now)) {
      await _cancel(alert.id, preferences);
      return;
    }

    final signature = _signature(alert);
    final signatureKey = '$_signaturePrefix${alert.id}';
    if (preferences.getString(signatureKey) == signature) return;

    final id = _notificationId(alert.id);
    await _notifications.cancel(id: id);
    final details = NotificationDetails(
      android: const AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
        importance: Importance.high,
        priority: Priority.high,
        category: AndroidNotificationCategory.reminder,
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        threadIdentifier: 'planentrix-reminders',
      ),
    );
    final title = _title(alert, now);
    final body = _body(alert);
    final notificationAt = appAlertNotificationAt(alert);

    if (!notificationAt.isAfter(now)) {
      await _notifications.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: details,
        payload: alert.id,
      );
    } else {
      await _notifications.zonedSchedule(
        id: id,
        title: title,
        body: body,
        scheduledDate: tz.TZDateTime.from(notificationAt, tz.local),
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: alert.id,
      );
    }

    final tracked = preferences.getStringList(_trackedKeys)?.toSet() ?? {};
    tracked.add(alert.id);
    await preferences.setString(signatureKey, signature);
    await preferences.setStringList(_trackedKeys, tracked.toList()..sort());
  }

  Future<void> _cancel(String alertId, SharedPreferences preferences) async {
    await _notifications.cancel(id: _notificationId(alertId));
    await preferences.remove('$_signaturePrefix$alertId');
    final tracked = preferences.getStringList(_trackedKeys)?.toSet() ?? {};
    tracked.remove(alertId);
    await preferences.setStringList(_trackedKeys, tracked.toList()..sort());
  }

  int _notificationId(String value) {
    if (value.startsWith('deadline:')) {
      final workloadId = int.tryParse(value.substring('deadline:'.length));
      if (workloadId != null) {
        return 1000000 + (workloadId.abs() % 1000000000);
      }
    }
    var hash = 0x811C9DC5;
    for (final unit in value.codeUnits) {
      hash ^= unit;
      hash = (hash * 0x01000193) & 0x7FFFFFFF;
    }
    return 1100000000 + (hash % 900000000);
  }

  String _signature(AppAlertData alert) =>
      '${alert.id}|${appAlertNotificationAt(alert).toIso8601String()}|'
      '${alert.visibleUntil?.toIso8601String() ?? ''}|'
      '${alert.subjectName}|${alert.title}';

  String _title(AppAlertData alert, DateTime now) {
    if (alert.kind == AppAlertKind.homeworkDeadline) {
      return _isSameCalendarDay(alert.eventAt, now)
          ? 'งานที่ต้องส่งวันนี้'
          : 'งานที่ต้องส่งพรุ่งนี้';
    }
    return switch (alert.kind) {
      AppAlertKind.classSession => 'อีก 5 นาทีจะถึงเวลาเรียน',
      AppAlertKind.review => 'ใกล้ถึงเวลาทบทวน',
      AppAlertKind.homeworkSession => 'ใกล้ถึงเวลาทำการบ้าน',
      AppAlertKind.checkpoint => 'ถึงรอบ Checkpoint แล้ว',
      AppAlertKind.homeworkDeadline => 'งานที่ต้องส่งพรุ่งนี้',
    };
  }

  String _body(AppAlertData alert) {
    final hour = alert.eventAt.hour.toString().padLeft(2, '0');
    final minute = alert.eventAt.minute.toString().padLeft(2, '0');
    return '${alert.subjectName.isEmpty ? 'ไม่ระบุวิชา' : alert.subjectName} • '
        '${alert.title} • $hour:$minute น.';
  }
}

bool _isSameCalendarDay(DateTime left, DateTime right) =>
    left.year == right.year &&
    left.month == right.month &&
    left.day == right.day;
