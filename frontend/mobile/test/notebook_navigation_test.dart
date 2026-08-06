import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart' as app;
import 'package:mobile/pages/Homework/Homework.dart';
import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/MainPage.dart';
import 'package:mobile/pages/Score/Score.dart';
import 'package:mobile/pages/Test/Test.dart';
import 'package:mobile/pages/Timer/Timer.dart';
import 'package:mobile/services/term.service.dart';

class EmptyTermRepository implements TermRepository {
  @override
  Future<CurrentTerm?> getCurrentTerm() async => null;

  @override
  Future<CurrentTerm> createTerm(CreateTermRequest request) async =>
      request.toCurrentTerm(1);

  @override
  Future<void> endCurrentTerm() async {}
}

void setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 640);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

void main() {
  test('mobile app routes change pages without transition animations', () {
    for (final routeName in [
      '/login',
      '/main',
      '/score',
      '/homework',
      '/timer',
      '/test',
      '/signIn',
    ]) {
      final route = app.generateAppRoute(RouteSettings(name: routeName));
      expect(route, isA<app.InstantMaterialPageRoute<void>>());

      final pageRoute = route! as PageRoute<void>;
      expect(pageRoute.transitionDuration, Duration.zero);
      expect(pageRoute.reverseTransitionDuration, Duration.zero);
    }
  });

  testWidgets('notebook tabs navigate between mobile pages', (tester) async {
    setPhoneSize(tester);
    await tester.pumpWidget(
      MaterialApp(
        home: MainPage(
          username: 'Nicha',
          userId: 42,
          termRepository: EmptyTermRepository(),
        ),
        routes: {
          '/main': (_) => MainPage(
            username: 'Nicha',
            userId: 42,
            termRepository: EmptyTermRepository(),
          ),
          '/score': (_) => const ScorePage(),
          '/homework': (_) => const HomeworkPage(),
          '/timer': (_) => const TimerPage(),
          '/test': (_) => const TestPage(),
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('notebook-tab-score')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('notebook-tab-score')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('score-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-homework')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('homework-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-timer')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('timer-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-test')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('test-page')), findsOneWidget);

    await tester.tap(find.byKey(const Key('notebook-tab-main')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('main-tab-content')), findsOneWidget);
  });
}
