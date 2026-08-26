import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/interfaces/app_alert.interface.dart';
import 'package:mobile/interfaces/table.interface.dart';

AppAlertData _alert({
  required String id,
  required AppAlertKind kind,
  required DateTime eventAt,
  DateTime? visibleUntil,
}) => AppAlertData(
  id: id,
  kind: kind,
  subjectName: 'BI',
  title: 'Test alert',
  eventAt: eventAt,
  visibleFrom: switch (kind) {
    AppAlertKind.checkpoint => eventAt,
    AppAlertKind.homeworkDeadline => homeworkDeadlineVisibleFrom(eventAt),
    AppAlertKind.classSession => eventAt.subtract(appAlertLeadTime),
    AppAlertKind.review => eventAt.subtract(appAlertLeadTime),
    AppAlertKind.homeworkSession => eventAt.subtract(appAlertLeadTime),
  },
  visibleUntil: visibleUntil,
  destination: '/main',
);

void main() {
  group('unified app alerts', () {
    final eventAt = DateTime(2026, 8, 25, 19);

    test(
      'session appears five minutes before and disappears after it ends',
      () {
        final alert = _alert(
          id: 'review:1',
          kind: AppAlertKind.review,
          eventAt: eventAt,
          visibleUntil: eventAt.add(const Duration(hours: 1)),
        );

        expect(alert.isActiveAt(DateTime(2026, 8, 25, 18, 54)), isFalse);
        expect(alert.isActiveAt(DateTime(2026, 8, 25, 18, 55)), isTrue);
        expect(alert.isActiveAt(DateTime(2026, 8, 25, 20)), isFalse);
      },
    );

    test('class appears five minutes before and schedules device alert', () {
      final alerts = buildAppAlerts(
        homeworkTasks: const [],
        currentSchedule: const CurrentSchedule(
          currentTerm: ScheduleTerm(
            termId: 1,
            term: 1,
            academicYear: 2569,
            semester: '1',
          ),
          items: [
            ScheduleItem(
              scheduleTimeId: 9,
              scheduleTypeId: 1,
              scheduleTypeName: 'Class',
              subjectId: 'BI101',
              subjectName: 'Business Intelligence',
              scheduleDay: 2,
              startTime: '09:00',
              endTime: '10:30',
            ),
          ],
        ),
        now: DateTime(2026, 8, 25, 8, 50),
      );

      final alert = alerts.single;
      expect(alert.kind, AppAlertKind.classSession);
      expect(alert.visibleFrom, DateTime(2026, 8, 25, 8, 55));
      expect(appAlertNotificationAt(alert), DateTime(2026, 8, 25, 8, 55));
      expect(alert.isActiveAt(DateTime(2026, 8, 25, 8, 54)), isFalse);
      expect(alert.isActiveAt(DateTime(2026, 8, 25, 8, 55)), isTrue);
      expect(alert.isActiveAt(DateTime(2026, 8, 25, 10, 30)), isFalse);
    });

    test('checkpoint remains visible after it becomes due', () {
      final alert = _alert(
        id: 'checkpoint:1',
        kind: AppAlertKind.checkpoint,
        eventAt: eventAt,
      );

      expect(alert.isActiveAt(DateTime(2026, 8, 25, 18, 59)), isFalse);
      expect(alert.isActiveAt(DateTime(2026, 8, 26)), isTrue);
    });

    test(
      'homework appears from midnight and notifies at 09:00 the day before',
      () {
        final alert = _alert(
          id: 'deadline:1',
          kind: AppAlertKind.homeworkDeadline,
          eventAt: eventAt,
        );

        expect(alert.visibleFrom, DateTime(2026, 8, 24));
        expect(appAlertNotificationAt(alert), DateTime(2026, 8, 24, 9));
        expect(alert.isActiveAt(DateTime(2026, 8, 23, 23, 59)), isFalse);
        expect(alert.isActiveAt(DateTime(2026, 8, 24)), isTrue);
      },
    );

    test('overdue homework remains visible and has highest priority', () {
      final deadline = _alert(
        id: 'deadline:1',
        kind: AppAlertKind.homeworkDeadline,
        eventAt: eventAt,
      );
      final checkpoint = _alert(
        id: 'checkpoint:1',
        kind: AppAlertKind.checkpoint,
        eventAt: eventAt.subtract(const Duration(days: 1)),
      );
      final now = eventAt.add(const Duration(minutes: 1));

      final active = activeAppAlerts([checkpoint, deadline], now: now);
      expect(active.first.id, 'deadline:1');
      expect(deadline.isOverdueAt(now), isTrue);
    });
  });
}
