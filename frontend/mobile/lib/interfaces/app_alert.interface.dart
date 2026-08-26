import 'exam.interface.dart';
import 'homework.interface.dart';
import 'recommendation.interface.dart';
import 'table.interface.dart';

enum AppAlertKind {
  classSession,
  review,
  homeworkSession,
  checkpoint,
  homeworkDeadline,
}

const Duration appAlertLeadTime = Duration(minutes: 5);

DateTime homeworkDeadlineVisibleFrom(DateTime deadline) =>
    DateTime(deadline.year, deadline.month, deadline.day - 1);

DateTime homeworkDeadlineNotificationAt(DateTime deadline) =>
    DateTime(deadline.year, deadline.month, deadline.day - 1, 9);

DateTime appAlertNotificationAt(AppAlertData alert) =>
    alert.kind == AppAlertKind.homeworkDeadline
    ? homeworkDeadlineNotificationAt(alert.eventAt)
    : alert.visibleFrom;

class AppAlertData {
  final String id;
  final AppAlertKind kind;
  final String subjectName;
  final String title;
  final DateTime eventAt;
  final DateTime visibleFrom;
  final DateTime? visibleUntil;
  final String destination;

  const AppAlertData({
    required this.id,
    required this.kind,
    required this.subjectName,
    required this.title,
    required this.eventAt,
    required this.visibleFrom,
    required this.visibleUntil,
    required this.destination,
  });

  bool isActiveAt(DateTime now) =>
      !visibleFrom.isAfter(now) &&
      (visibleUntil == null || visibleUntil!.isAfter(now));

  bool isOverdueAt(DateTime now) =>
      kind == AppAlertKind.homeworkDeadline && eventAt.isBefore(now);

  String get kindLabel => switch (kind) {
    AppAlertKind.classSession => 'เข้าเรียน',
    AppAlertKind.review => 'ทบทวน',
    AppAlertKind.homeworkSession => 'ทำการบ้าน',
    AppAlertKind.checkpoint => 'Checkpoint',
    AppAlertKind.homeworkDeadline => 'กำหนดส่ง',
  };
}

List<AppAlertData> buildAppAlerts({
  required List<HomeworkTaskData> homeworkTasks,
  CurrentSchedule? currentSchedule,
  AcceptedWeeklySchedule? weeklySchedule,
  List<ExamCheckpointInsight> checkpoints = const [],
  DateTime? now,
}) {
  final current = now ?? DateTime.now();
  final alerts = <AppAlertData>[];
  final accepted = weeklySchedule?.acceptedRecommendation;

  for (final item in currentSchedule?.items ?? const <ScheduleItem>[]) {
    if (item.scheduleTypeId != 1) continue;
    final occurrence = _recurringOccurrence(item, current);
    if (occurrence == null) continue;
    alerts.add(
      _sessionAlert(
        id: 'class:${item.scheduleTimeId}:${_dateText(occurrence.start)}',
        kind: AppAlertKind.classSession,
        subjectName: item.subjectName,
        start: occurrence.start,
        end: occurrence.end,
      ),
    );
  }

  if (accepted != null) {
    for (final block
        in weeklySchedule?.weeklyBlocks ?? const <WeeklyScheduleBlock>[]) {
      if (block.scheduleTypeId != 2 && block.scheduleTypeId != 3) continue;
      final start = _parseDateTime(block.scheduledDate, block.startTime);
      final end = _parseDateTime(block.scheduledDate, block.endTime);
      if (start == null || end == null || !end.isAfter(current)) continue;
      alerts.add(
        _sessionAlert(
          id: 'weekly:${block.weeklyBlockId}',
          kind: block.scheduleTypeId == 2
              ? AppAlertKind.review
              : AppAlertKind.homeworkSession,
          subjectName: block.subjectName,
          start: start,
          end: end,
        ),
      );
    }
  } else {
    for (final item in currentSchedule?.items ?? const <ScheduleItem>[]) {
      if (item.scheduleTypeId != 2 && item.scheduleTypeId != 3) continue;
      final occurrence = _recurringOccurrence(item, current);
      if (occurrence == null) continue;
      alerts.add(
        _sessionAlert(
          id: 'schedule:${item.scheduleTimeId}:${_dateText(occurrence.start)}',
          kind: item.scheduleTypeId == 2
              ? AppAlertKind.review
              : AppAlertKind.homeworkSession,
          subjectName: item.subjectName,
          start: occurrence.start,
          end: occurrence.end,
        ),
      );
    }
  }

  for (final checkpoint in checkpoints) {
    alerts.add(
      AppAlertData(
        id: 'checkpoint:${checkpoint.examRepositoryId}',
        kind: AppAlertKind.checkpoint,
        subjectName: checkpoint.subjectName,
        title: checkpoint.examName.isEmpty
            ? 'ถึงรอบ Checkpoint'
            : checkpoint.examName,
        eventAt: checkpoint.nextCheckpointAt,
        visibleFrom: checkpoint.nextCheckpointAt,
        visibleUntil: null,
        destination: '/test',
      ),
    );
  }

  for (final task in homeworkTasks) {
    alerts.add(homeworkDeadlineAlert(task));
  }

  return alerts;
}

AppAlertData homeworkDeadlineAlert(HomeworkTaskData task) => AppAlertData(
  id: 'deadline:${task.workloadId}',
  kind: AppAlertKind.homeworkDeadline,
  subjectName: task.subject,
  title: task.assignment,
  eventAt: task.deadline,
  visibleFrom: homeworkDeadlineVisibleFrom(task.deadline),
  visibleUntil: null,
  destination: '/homework',
);

List<AppAlertData> activeAppAlerts(List<AppAlertData> events, {DateTime? now}) {
  final current = now ?? DateTime.now();
  final active = events.where((event) => event.isActiveAt(current)).toList();
  active.sort((left, right) {
    final priority = _priority(left.kind).compareTo(_priority(right.kind));
    return priority != 0 ? priority : left.eventAt.compareTo(right.eventAt);
  });
  return active;
}

AppAlertData _sessionAlert({
  required String id,
  required AppAlertKind kind,
  required String subjectName,
  required DateTime start,
  required DateTime end,
}) => AppAlertData(
  id: id,
  kind: kind,
  subjectName: subjectName,
  title: switch (kind) {
    AppAlertKind.classSession => 'ใกล้ถึงเวลาเรียน',
    AppAlertKind.review => 'ถึงเวลาทบทวน',
    _ => 'ถึงเวลาทำการบ้าน',
  },
  eventAt: start,
  visibleFrom: start.subtract(appAlertLeadTime),
  visibleUntil: end,
  destination: '/main',
);

({DateTime start, DateTime end})? _recurringOccurrence(
  ScheduleItem item,
  DateTime now,
) {
  final today = DateTime(now.year, now.month, now.day);
  var dayOffset = (item.scheduleDay - now.weekday + 7) % 7;
  var date = today.add(Duration(days: dayOffset));
  var start = _parseDateTime(_dateText(date), item.startTime);
  var end = _parseDateTime(_dateText(date), item.endTime);
  if (start == null || end == null) return null;
  if (dayOffset == 0 && !end.isAfter(now)) {
    dayOffset = 7;
    date = today.add(Duration(days: dayOffset));
    start = _parseDateTime(_dateText(date), item.startTime);
    end = _parseDateTime(_dateText(date), item.endTime);
  }
  return start == null || end == null ? null : (start: start, end: end);
}

DateTime? _parseDateTime(String date, String time) {
  final dateParts = date.split('-');
  final timeParts = time.split(':');
  if (dateParts.length < 3 || timeParts.length < 2) return null;
  final year = int.tryParse(dateParts[0]);
  final month = int.tryParse(dateParts[1]);
  final day = int.tryParse(dateParts[2]);
  final hour = int.tryParse(timeParts[0]);
  final minute = int.tryParse(timeParts[1]);
  if ([year, month, day, hour, minute].contains(null)) return null;
  return DateTime(year!, month!, day!, hour!, minute!);
}

String _dateText(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

int _priority(AppAlertKind kind) => switch (kind) {
  AppAlertKind.homeworkDeadline => 0,
  AppAlertKind.classSession => 1,
  AppAlertKind.review => 1,
  AppAlertKind.homeworkSession => 1,
  AppAlertKind.checkpoint => 2,
};
