import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/Component/StudentCard.dart';
import 'package:mobile/pages/Main/MainPage.dart';
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
  testWidgets('student card fits a small phone and displays profile data', (
    tester,
  ) async {
    setPhoneSize(tester);

    var wasTapped = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: StudentCard(
                name: 'Nicha',
                studentNumber: '42',
                gender: 'Female',
                major: 'COMSCI',
                year: '3',
                birthDate: '16/07/2004',
                onTap: () => wasTapped = true,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byKey(const Key('student-card')), findsOneWidget);
    expect(find.byKey(const Key('student-card-shadow')), findsOneWidget);
    final surface = tester.widget<Material>(
      find.byKey(const Key('student-card-surface')),
    );
    expect(surface.clipBehavior, Clip.antiAlias);
    expect(find.text('Nicha'), findsOneWidget);
    expect(find.text('42'), findsOneWidget);
    expect(find.text('Female'), findsOneWidget);
    expect(find.text('COMSCI'), findsOneWidget);
    expect(find.text('16/07/2004'), findsOneWidget);
    expect(tester.getSize(find.byKey(const Key('student-card'))).width, 320);
    await tester.tap(find.byKey(const Key('student-card')));
    expect(wasTapped, isTrue);
  });

  testWidgets('main page opens student details from the card', (tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      MaterialApp(
        home: MainPage(
          username: 'Nicha',
          userId: 42,
          logoutAction: () async {},
          termRepository: EmptyTermRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('student-card')), findsOneWidget);
    expect(find.byKey(const Key('student-number')), findsOneWidget);
    expect(find.byKey(const Key('notebook-tabs')), findsOneWidget);
    expect(find.byKey(const Key('notebook-tab-main')), findsOneWidget);
    expect(find.byKey(const Key('schedule')), findsOneWidget);
    expect(find.text('42'), findsOneWidget);
    expect(find.byType(AppBar), findsNothing);

    final background = tester.widget<Container>(
      find.byKey(const Key('main-background')),
    );
    final backgroundDecoration = background.decoration! as BoxDecoration;
    final backgroundImage = backgroundDecoration.image!.image as AssetImage;
    final notebookCover = tester.widget<Container>(
      find.byKey(const Key('main-notebook-cover')),
    );
    final coverDecoration = notebookCover.decoration! as BoxDecoration;
    final notebookPaper = tester.widget<Container>(
      find.byKey(const Key('main-notebook-paper')),
    );
    final paperDecoration = notebookPaper.decoration! as BoxDecoration;

    expect(backgroundImage.assetName, 'assets/images/bg.png');
    expect(coverDecoration.borderRadius, BorderRadius.circular(28));
    expect(coverDecoration.gradient, isA<LinearGradient>());
    expect(paperDecoration.color, const Color(0xFFFEFBEA));
    expect(paperDecoration.borderRadius, BorderRadius.circular(20));

    final paperPosition = tester.getTopLeft(
      find.byKey(const Key('main-notebook-paper')),
    );
    final coverPosition = tester.getTopLeft(
      find.byKey(const Key('main-notebook-cover')),
    );
    final tabPosition = tester.getTopLeft(
      find.byKey(const Key('notebook-tabs')),
    );
    final cardPosition = tester.getTopLeft(
      find.byKey(const Key('student-card')),
    );

    await tester.drag(
      find.byKey(const Key('notebook-content-scroll-main')),
      const Offset(0, -180),
    );
    await tester.pumpAndSettle();

    expect(
      tester.getTopLeft(find.byKey(const Key('main-notebook-paper'))),
      paperPosition,
    );
    expect(
      tester.getTopLeft(find.byKey(const Key('main-notebook-cover'))),
      coverPosition,
    );
    expect(
      tester.getTopLeft(find.byKey(const Key('notebook-tabs'))),
      tabPosition,
    );
    expect(
      tester.getTopLeft(find.byKey(const Key('student-card'))).dy,
      lessThan(cardPosition.dy),
    );

    await tester.drag(
      find.byKey(const Key('notebook-content-scroll-main')),
      const Offset(0, 180),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('student-card')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('student-card-popup')), findsOneWidget);
    expect(find.byKey(const Key('student-popup-name')), findsOneWidget);
    expect(find.text('ID 42'), findsOneWidget);
    expect(find.byKey(const Key('edit-profile-button')), findsOneWidget);
    expect(find.byKey(const Key('delete-profile-button')), findsOneWidget);
    expect(find.byKey(const Key('profile-tab')), findsOneWidget);
    expect(find.byKey(const Key('constraint-tab')), findsOneWidget);
    expect(find.byKey(const Key('profile-panel')), findsOneWidget);
    expect(find.byKey(const Key('popup-logout-button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('constraint-tab')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('constraint-panel')), findsOneWidget);
    expect(find.text('วันเวลาไม่ว่างประจำ'), findsOneWidget);
  });
}
