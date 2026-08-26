import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../interfaces/homework.interface.dart';

DateTime homeworkReminderTime(DateTime deadline) {
  return DateTime(deadline.year, deadline.month, deadline.day - 1, 9);
}

bool shouldShowHomeworkReminderImmediately({
  required DateTime deadline,
  required DateTime now,
}) {
  return deadline.isAfter(now) && !homeworkReminderTime(deadline).isAfter(now);
}

int homeworkReminderNotificationId(int workloadId) {
  return 1000000 + (workloadId.abs() % 1000000000);
}

abstract class HomeworkReminderScheduler {
  Future<void> initialize();
  Future<bool> requestPermissions();
  Future<void> syncTasks(List<HomeworkTaskData> tasks);
  Future<void> scheduleTask(HomeworkTaskData task);
  Future<void> cancelTask(int workloadId);
  Future<void> cancelAllHomeworkReminders();
}

class NoopHomeworkReminderScheduler implements HomeworkReminderScheduler {
  const NoopHomeworkReminderScheduler();

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> requestPermissions() async => false;

  @override
  Future<void> syncTasks(List<HomeworkTaskData> tasks) async {}

  @override
  Future<void> scheduleTask(HomeworkTaskData task) async {}

  @override
  Future<void> cancelTask(int workloadId) async {}

  @override
  Future<void> cancelAllHomeworkReminders() async {}
}

class HomeworkReminderService implements HomeworkReminderScheduler {
  HomeworkReminderService._();

  static final HomeworkReminderService instance = HomeworkReminderService._();

  static const String _trackedIdsKey = 'homework_reminder_workload_ids';
  static const String _signaturePrefix = 'homework_reminder_signature_';
  static const String _channelId = 'homework_deadline_reminders';
  static const String _channelName = 'Homework deadlines';
  static const String _channelDescription =
      'แจ้งเตือนเวลาเก้าโมงของวันก่อนถึงกำหนดส่ง';

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  bool get _supportsScheduledNotifications {
    if (kIsWeb) return false;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  @override
  Future<void> initialize() async {
    if (_initialized || !_supportsScheduledNotifications) return;

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
      debugPrint('Unable to initialize homework reminders: $error');
      _initialized = false;
    }
  }

  @override
  Future<bool> requestPermissions() async {
    if (!_supportsScheduledNotifications) return false;
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
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        return await _notifications
                .resolvePlatformSpecificImplementation<
                  IOSFlutterLocalNotificationsPlugin
                >()
                ?.requestPermissions(alert: true, badge: true, sound: true) ??
            false;
      }
    } catch (error) {
      debugPrint('Unable to request notification permission: $error');
    }
    return false;
  }

  @override
  Future<void> syncTasks(List<HomeworkTaskData> tasks) async {
    if (!await requestPermissions()) return;

    final activeIds = tasks
        .where((task) => task.workloadId > 0)
        .map((task) => task.workloadId)
        .toSet();
    final preferences = await SharedPreferences.getInstance();
    final trackedIds = _readTrackedIds(preferences);

    for (final staleId in trackedIds.difference(activeIds)) {
      await _cancelTask(staleId, preferences);
    }
    for (final task in tasks) {
      await _scheduleTask(task, preferences);
    }
  }

  @override
  Future<void> scheduleTask(HomeworkTaskData task) async {
    if (!await requestPermissions()) return;
    final preferences = await SharedPreferences.getInstance();
    await _scheduleTask(task, preferences);
  }

  Future<void> _scheduleTask(
    HomeworkTaskData task,
    SharedPreferences preferences,
  ) async {
    if (task.workloadId <= 0) return;

    final now = DateTime.now();
    if (!task.deadline.isAfter(now)) {
      await _cancelTask(task.workloadId, preferences);
      return;
    }

    final signature = _taskSignature(task);
    final signatureKey = '$_signaturePrefix${task.workloadId}';
    if (preferences.getString(signatureKey) == signature) return;

    final notificationId = homeworkReminderNotificationId(task.workloadId);
    await _notifications.cancel(id: notificationId);

    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
        importance: Importance.high,
        priority: Priority.high,
        category: AndroidNotificationCategory.reminder,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        threadIdentifier: 'homework-deadlines',
      ),
    );
    final title = _isSameCalendarDay(task.deadline, now)
        ? 'งานที่ต้องส่งวันนี้'
        : 'งานที่ต้องส่งพรุ่งนี้';
    final body =
        'วิชา: ${task.subject} • งาน: ${task.assignment} • '
        'กำหนดส่ง: ${task.dueDate} เวลา ${task.dueTime} น.';
    final payload = 'homework:${task.workloadId}';
    final reminderAt = homeworkReminderTime(task.deadline);

    if (shouldShowHomeworkReminderImmediately(
      deadline: task.deadline,
      now: now,
    )) {
      await _notifications.show(
        id: notificationId,
        title: title,
        body: body,
        notificationDetails: details,
        payload: payload,
      );
    } else {
      await _notifications.zonedSchedule(
        id: notificationId,
        title: title,
        body: body,
        scheduledDate: tz.TZDateTime.from(reminderAt, tz.local),
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: payload,
      );
    }

    final trackedIds = _readTrackedIds(preferences)..add(task.workloadId);
    await preferences.setString(signatureKey, signature);
    await _writeTrackedIds(preferences, trackedIds);
  }

  @override
  Future<void> cancelTask(int workloadId) async {
    if (workloadId <= 0) return;
    await initialize();
    final preferences = await SharedPreferences.getInstance();
    await _cancelTask(workloadId, preferences);
  }

  Future<void> _cancelTask(
    int workloadId,
    SharedPreferences preferences,
  ) async {
    if (_initialized) {
      try {
        await _notifications.cancel(
          id: homeworkReminderNotificationId(workloadId),
        );
      } catch (error) {
        debugPrint('Unable to cancel homework reminder: $error');
      }
    }

    final trackedIds = _readTrackedIds(preferences)..remove(workloadId);
    await preferences.remove('$_signaturePrefix$workloadId');
    await _writeTrackedIds(preferences, trackedIds);
  }

  @override
  Future<void> cancelAllHomeworkReminders() async {
    await initialize();
    final preferences = await SharedPreferences.getInstance();
    final trackedIds = _readTrackedIds(preferences);
    for (final workloadId in trackedIds) {
      if (_initialized) {
        try {
          await _notifications.cancel(
            id: homeworkReminderNotificationId(workloadId),
          );
        } catch (error) {
          debugPrint('Unable to cancel homework reminder: $error');
        }
      }
      await preferences.remove('$_signaturePrefix$workloadId');
    }
    await preferences.remove(_trackedIdsKey);
  }

  Set<int> _readTrackedIds(SharedPreferences preferences) {
    return (preferences.getStringList(_trackedIdsKey) ?? const <String>[])
        .map(int.tryParse)
        .whereType<int>()
        .toSet();
  }

  Future<void> _writeTrackedIds(
    SharedPreferences preferences,
    Set<int> ids,
  ) async {
    final values = ids.map((id) => '$id').toList()..sort();
    await preferences.setStringList(_trackedIdsKey, values);
  }

  String _taskSignature(HomeworkTaskData task) {
    return 'day-before-0900|${task.deadline.millisecondsSinceEpoch}|'
        '${task.subject}|${task.assignment}';
  }
}

bool _isSameCalendarDay(DateTime left, DateTime right) =>
    left.year == right.year &&
    left.month == right.month &&
    left.day == right.day;
