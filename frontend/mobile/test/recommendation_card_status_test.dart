import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/recommendation.interface.dart';
import 'package:mobile/pages/Main/Component/RecommendationCard.dart';
import 'package:mobile/services/recommendation.service.dart';

class _RecommendationRepository implements RecommendationRepository {
  WeeklyRecommendation? latest;

  _RecommendationRepository(this.latest);

  @override
  Future<WeeklyRecommendation?> getLatest({String? weekStart}) async => latest;

  @override
  Future<WeeklyRecommendation> accept(int recommendationId) async =>
      _withStatus('accepted');

  WeeklyRecommendation _withStatus(String status) {
    final current = latest!;
    final updated = WeeklyRecommendation(
      recommendationId: current.recommendationId,
      userId: current.userId,
      termId: current.termId,
      version: current.version,
      weekStart: current.weekStart,
      weekEnd: current.weekEnd,
      triggerType: current.triggerType,
      examWorkflowPhase: current.examWorkflowPhase,
      status: status,
      items: current.items,
      blocks: current.blocks,
    );
    latest = updated;
    return updated;
  }

  @override
  Future<AcceptedWeeklySchedule> getWeeklySchedule({String? weekStart}) =>
      throw UnimplementedError();
  @override
  Future<WeeklyRecommendation> addBlock(int id, WeeklyBlockInput input) =>
      throw UnimplementedError();
  @override
  Future<WeeklyRecommendation> updateBlock(
    int id,
    int blockId,
    WeeklyBlockInput input,
  ) => throw UnimplementedError();
  @override
  Future<WeeklyRecommendation> deleteBlock(int id, int blockId) =>
      throw UnimplementedError();
}

WeeklyRecommendation _pending({bool hasChanges = true, String? phase}) =>
    WeeklyRecommendation(
      recommendationId: 7,
      userId: 4,
      termId: 3,
      version: 1,
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      triggerType: 'exam_submitted',
      examWorkflowPhase: phase,
      status: 'pending',
      items: [
        WeeklyRecommendationItem(
          recommendationItemId: 1,
          subjectId: 'BI101',
          subjectName: 'Business Intelligence',
          scheduleTypeId: 2,
          scheduleTypeName: 'Review',
          scheduleTypeCode: 'review',
          currentMinutes: 30,
          targetMinutes: hasChanges ? 60 : 30,
          allocatedMinutes: hasChanges ? 60 : 30,
          unallocatedMinutes: 0,
          differenceMinutes: hasChanges ? 30 : 0,
          primaryAction: hasChanges ? 'increase' : 'keep',
          capApplied: false,
          capacityLimited: false,
        ),
      ],
    );

void main() {
  test('parses the source exam workflow phase from the API', () {
    for (final phase in ['checkpoint', 'midterm_2w', 'final_2w']) {
      expect(
        WeeklyRecommendation.fromJson({
          'exam_workflow_phase': phase,
        }).examWorkflowPhase,
        phase,
      );
    }
    expect(WeeklyRecommendation.fromJson({}).examWorkflowPhase, isNull);
  });

  for (final phase in ['midterm_2w', 'final_2w']) {
    testWidgets(
      '$phase shows unchanged final recommendation and allows accepting',
      (tester) async {
        final repository = _RecommendationRepository(
          _pending(hasChanges: false, phase: phase),
        );
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: RecommendationCard(repository: repository),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.textContaining('ระบบแนะนำให้คงตารางเดิม'), findsOneWidget);
        expect(find.text('Business Intelligence'), findsOneWidget);
        expect(
          find.byKey(const Key('recommendation-preview-button')),
          findsOneWidget,
        );
        final accept = find.byKey(const Key('recommendation-accept-button'));
        expect(accept, findsOneWidget);
        await tester.ensureVisible(accept);
        await tester.tap(accept);
        await tester.pumpAndSettle();
        expect(repository.latest?.status, 'accepted');
        expect(
          find.textContaining('คุณยอมรับคำแนะนำล่าสุดแล้ว'),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('recommendation-accept-button')),
          findsNothing,
        );
      },
    );
  }

  testWidgets('first final checkpoint assessment shows an unchanged plan', (
    tester,
  ) async {
    final repository = _RecommendationRepository(
      _pending(hasChanges: false, phase: 'checkpoint'),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: RecommendationCard(repository: repository),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('หลังทำแบบทดสอบ ระบบแนะนำให้คงตารางเดิม'), findsNothing);
    expect(find.text('Business Intelligence'), findsOneWidget);
    expect(find.byKey(const Key('recommendation-preview-button')), findsOneWidget);
    final accept = find.byKey(const Key('recommendation-accept-button'));
    expect(accept, findsOneWidget);
    await tester.ensureVisible(accept);
    await tester.tap(accept);
    await tester.pumpAndSettle();
    expect(repository.latest?.status, 'accepted');
  });

  testWidgets('no recommendation and no changes do not show action buttons', (
    tester,
  ) async {
    for (final latest in <WeeklyRecommendation?>[
      null,
      _pending(hasChanges: false),
    ]) {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RecommendationCard(
              key: ValueKey(latest?.recommendationId ?? 0),
              repository: _RecommendationRepository(latest),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('recommendation-preview-button')),
        findsNothing,
      );
      expect(
        find.byKey(const Key('recommendation-accept-button')),
        findsNothing,
      );
      expect(
        find.byKey(const Key('recommendation-reject-button')),
        findsNothing,
      );
    }
  });

  testWidgets('pending recommendations can be accepted but not rejected', (
    tester,
  ) async {
    final repository = _RecommendationRepository(_pending());
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: RecommendationCard(repository: repository)),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.byKey(const Key('recommendation-accept-button')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('recommendation-reject-button')), findsNothing);

    await tester.tap(find.byKey(const Key('recommendation-accept-button')));
    await tester.pumpAndSettle();
    expect(find.textContaining('คุณยอมรับคำแนะนำล่าสุดแล้ว'), findsOneWidget);
    expect(
      find.byKey(const Key('recommendation-preview-button')),
      findsNothing,
    );
  });
}
