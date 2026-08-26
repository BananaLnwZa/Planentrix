import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/common/ConstraintOverlapWarning.dart';
import 'package:mobile/interfaces/profile.interface.dart';
import 'package:mobile/interfaces/recommendation.interface.dart';

const constraint = UserConstraint(
  constraintId: 1,
  userId: 7,
  dayOff: 1,
  startTime: '08:00',
  endTime: '18:00',
  busyDays: [BusyTime(day: 1, start: '10:00', end: '11:00')],
);

void main() {
  group('constraint overlap', () {
    test('reports day off, busy time, and outside working hours', () {
      final conflict = findConstraintOverlap(
        constraint,
        scheduleDay: 1,
        startTime: '10:30',
        endTime: '19:00',
      );

      expect(conflict, isNotNull);
      expect(conflict!.reasons, hasLength(3));
      expect(
        conflict.reasons.any((reason) => reason.contains('วันหยุด')),
        isTrue,
      );
      expect(
        conflict.reasons.any((reason) => reason.contains('เวลาที่ไม่ว่าง')),
        isTrue,
      );
      expect(
        conflict.reasons.any((reason) => reason.contains('นอกช่วงเวลาทำงาน')),
        isTrue,
      );
    });

    test('allows a block that stays inside every constraint', () {
      expect(
        findConstraintOverlap(
          constraint,
          scheduleDay: 2,
          startTime: '11:00',
          endTime: '12:00',
        ),
        isNull,
      );
    });

    test('confirmed recommendation block sends constraint override', () {
      const input = WeeklyBlockInput(
        subjectId: 'BI101',
        scheduleTypeId: 3,
        scheduledDate: '2026-08-28',
        startTime: '16:00',
        endTime: '19:00',
        allowConstraintOverlap: true,
      );

      expect(input.toJson()['allow_constraint_overlap'], isTrue);
    });
  });

  testWidgets('warning requires explicit confirmation before continuing', (
    tester,
  ) async {
    bool? result;
    final conflict = findConstraintOverlap(
      constraint,
      scheduleDay: 1,
      startTime: '10:30',
      endTime: '11:30',
    )!;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () async {
              result = await showConstraintOverlapWarning(context, conflict);
            },
            child: const Text('เปิด'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('เปิด'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('constraint-overlap-warning')), findsOneWidget);
    expect(result, isNull);

    await tester.tap(find.byKey(const Key('confirm-constraint-overlap')));
    await tester.pumpAndSettle();
    expect(result, isTrue);
  });
}
