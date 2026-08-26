import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/homework_reminder.service.dart';

void main() {
  group('homework reminder timing', () {
    test('schedules at 09:00 on the day before the deadline', () {
      final deadline = DateTime(2026, 8, 22, 17, 30);

      expect(homeworkReminderTime(deadline), DateTime(2026, 8, 21, 9));
    });

    test('does not notify before 09:00 on the previous day', () {
      final deadline = DateTime(2026, 8, 22, 17, 30);
      final now = DateTime(2026, 8, 21, 8, 59);

      expect(
        shouldShowHomeworkReminderImmediately(deadline: deadline, now: now),
        isFalse,
      );
    });

    test('notifies immediately after 09:00 on the previous day', () {
      final deadline = DateTime(2026, 8, 22, 17, 30);
      final now = DateTime(2026, 8, 21, 9, 1);

      expect(
        shouldShowHomeworkReminderImmediately(deadline: deadline, now: now),
        isTrue,
      );
    });

    test('does not notify for an overdue task', () {
      final deadline = DateTime(2026, 8, 21, 17, 30);
      final now = DateTime(2026, 8, 21, 18);

      expect(
        shouldShowHomeworkReminderImmediately(deadline: deadline, now: now),
        isFalse,
      );
    });

    test('uses a stable notification id for each homework item', () {
      expect(homeworkReminderNotificationId(42), 1000042);
      expect(
        homeworkReminderNotificationId(42),
        homeworkReminderNotificationId(42),
      );
      expect(
        homeworkReminderNotificationId(42),
        isNot(homeworkReminderNotificationId(43)),
      );
    });
  });
}
