import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/recommendation.interface.dart';
import 'package:mobile/pages/Main/Component/RecommendationPreviewSheet.dart';
import 'package:mobile/services/recommendation.service.dart';

class _PreviewRepository implements RecommendationRepository {
  final WeeklyRecommendation recommendation;
  final List<RecurringClassBlock> classes;
  int updateCalls = 0;

  _PreviewRepository(this.recommendation, this.classes);

  @override
  Future<AcceptedWeeklySchedule> getWeeklySchedule({String? weekStart}) async =>
      AcceptedWeeklySchedule(
        weekStart: '2026-10-12',
        weekEnd: '2026-10-18',
        recurringClasses: classes,
        weeklyBlocks: recommendation.blocks,
      );

  @override
  Future<WeeklyRecommendation?> getLatest({String? weekStart}) async =>
      recommendation;

  @override
  Future<WeeklyRecommendation> updateBlock(
    int recommendationId,
    int weeklyBlockId,
    WeeklyBlockInput input,
  ) async {
    updateCalls++;
    return recommendation;
  }

  @override
  Future<WeeklyRecommendation> accept(int recommendationId) async =>
      recommendation;
  @override
  Future<WeeklyRecommendation> addBlock(int id, WeeklyBlockInput input) async =>
      recommendation;
  @override
  Future<WeeklyRecommendation> deleteBlock(int id, int blockId) async =>
      recommendation;
}

WeeklyScheduleBlock _block(int id, String start, String end) =>
    WeeklyScheduleBlock(
      weeklyBlockId: id,
      recommendationId: 7,
      subjectId: 'BI101',
      subjectName: 'Business Intelligence',
      scheduleTypeId: 2,
      scheduleTypeName: 'Review',
      scheduleTypeCode: 'review',
      scheduledDate: '2026-10-15',
      startTime: start,
      endTime: end,
      source: 'recommendation',
      isUserModified: false,
    );

WeeklyRecommendation _recommendation(List<WeeklyScheduleBlock> blocks) =>
    WeeklyRecommendation(
      recommendationId: 7,
      userId: 4,
      termId: 3,
      version: 1,
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      triggerType: 'weekend',
      status: 'pending',
      blocks: blocks,
    );

void main() {
  for (final conflictType in ['block', 'class']) {
    testWidgets('cannot save a preview block overlapping a $conflictType', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 780);
      addTearDown(() {
        tester.view.resetDevicePixelRatio();
        tester.view.resetPhysicalSize();
      });
      final recommendation = _recommendation([
        _block(1, '09:30', '10:30'),
        if (conflictType == 'block') _block(2, '10:00', '11:00'),
      ]);
      final classes = conflictType == 'class'
          ? const [
              RecurringClassBlock(
                scheduleTimeId: 12,
                subjectId: 'BI101',
                subjectName: 'Business Intelligence',
                scheduleDay: 4,
                startTime: '10:00',
                endTime: '11:00',
              ),
            ]
          : const <RecurringClassBlock>[];
      final repository = _PreviewRepository(recommendation, classes);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => showRecommendationPreviewSheet(
                  context,
                  recommendation: recommendation,
                  repository: repository,
                ),
                child: const Text('Open preview'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open preview'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('recommendation-adjust-button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('09:30–10:30'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('บันทึก'));
      await tester.pumpAndSettle();

      expect(find.textContaining('เวลานี้ทับกับ'), findsOneWidget);
      expect(repository.updateCalls, 0);
      expect(tester.takeException(), isNull);
    });
  }
}
