import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/common/NotebookSectionPage.dart';
import 'package:mobile/common/NotebookTabs.dart';
import 'package:mobile/interfaces/term.interface.dart';

void main() {
  testWidgets('post-final workflow sends other notebook pages back to main', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: NotebookSectionPage(
          activeTab: NotebookTabId.score,
          title: 'Score',
          workflowLoader: () async =>
              const TermWorkflow(phase: 'final_post', postFinal: true),
        ),
        routes: {'/main': (_) => const Scaffold(body: Text('Main summary'))},
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Main summary'), findsOneWidget);
    expect(find.text('Score'), findsNothing);
  });

  testWidgets('ordinary workflow leaves notebook pages available', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: NotebookSectionPage(
          activeTab: NotebookTabId.score,
          title: 'Score',
          workflowLoader: () async => const TermWorkflow(phase: 'final_2w'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Score'), findsNWidgets(2));
    expect(find.byKey(const Key('notebook-tabs')), findsOneWidget);
  });

  for (final phase in ['final_1w', 'final_exam']) {
    testWidgets('$phase hides homework from other notebook pages', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: NotebookSectionPage(
            activeTab: NotebookTabId.score,
            title: 'Score',
            workflowLoader: () async => TermWorkflow(phase: phase),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('notebook-tab-homework')), findsNothing);
      expect(find.byKey(const Key('notebook-tab-score')), findsOneWidget);
      expect(find.byKey(const Key('notebook-tab-timer')), findsOneWidget);
    });

    testWidgets('$phase redirects a direct homework visit to main', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: NotebookSectionPage(
            activeTab: NotebookTabId.homework,
            title: 'Homework',
            workflowLoader: () async => TermWorkflow(phase: phase),
          ),
          routes: {'/main': (_) => const Scaffold(body: Text('Main'))},
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Main'), findsOneWidget);
      expect(find.text('Homework'), findsNothing);
    });
  }
}
