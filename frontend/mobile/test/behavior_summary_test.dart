import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/time.interface.dart';
import 'package:mobile/pages/Main/Component/BehaviorSummary.dart';

void main() {
  for (final (minutes, expected) in [
    (0.0, '0 ชม. 0 น.'),
    (126.2, '2 ชม. 6 น.'),
    (59.6, '1 ชม. 0 น.'),
  ]) {
    testWidgets('shows $minutes term review minutes as $expected', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: BehaviorSummary(
                loadData: () async => BehaviorSummaryData(
                  study: StudyDashboard(
                    currentTerm: const TimerTerm(
                      termId: 1,
                      term: 1,
                      semester: '1',
                      academicYear: 2569,
                    ),
                    summary: StudySummary(totalTermMinutes: minutes),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(expected), findsOneWidget);
    });
  }
}
