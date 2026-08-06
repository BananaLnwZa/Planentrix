import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/common/NotebookTabs.dart';

void setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 640);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  testWidgets('shows four notebook tabs and changes the active tab', (
    tester,
  ) async {
    setPhoneSize(tester);
    var activeTab = NotebookTabId.main;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return Align(
                alignment: Alignment.bottomCenter,
                child: NotebookTabs(
                  activeTab: activeTab,
                  onTabChange: (tab) => setState(() => activeTab = tab),
                ),
              );
            },
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('notebook-tabs')), findsOneWidget);
    expect(find.text('Main'), findsOneWidget);
    expect(find.text('Score'), findsOneWidget);
    expect(find.text('Homework'), findsOneWidget);
    expect(find.text('Timer'), findsOneWidget);
    expect(find.text('Test'), findsOneWidget);

    final tabSizes = ['main', 'score', 'homework', 'timer', 'test'].map(
      (id) => tester.getSize(find.byKey(Key('notebook-tab-container-$id'))),
    );
    final widths = tabSizes.map((size) => size.width).toList();
    expect(
      widths.reduce((a, b) => a > b ? a : b) -
          widths.reduce((a, b) => a < b ? a : b),
      lessThanOrEqualTo(1),
    );
    expect(tabSizes.map((size) => size.height).toSet(), hasLength(1));

    await tester.tap(find.byKey(const Key('notebook-tab-score')));
    await tester.pumpAndSettle();

    expect(activeTab, NotebookTabId.score);
  });
}
