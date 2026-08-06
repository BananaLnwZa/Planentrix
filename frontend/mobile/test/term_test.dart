import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/interfaces/term.interface.dart';
import 'package:mobile/pages/Main/Component/Term.dart';
import 'package:mobile/services/term.service.dart';

class FakeTermRepository implements TermRepository {
  CurrentTerm? currentTerm;
  bool ended = false;

  FakeTermRepository(this.currentTerm);

  @override
  Future<CurrentTerm?> getCurrentTerm() async => currentTerm;

  @override
  Future<CurrentTerm> createTerm(CreateTermRequest request) async {
    currentTerm = request.toCurrentTerm(7);
    return currentTerm!;
  }

  @override
  Future<void> endCurrentTerm() async {
    ended = true;
    currentTerm = null;
  }
}

void setPhoneSize(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 640);
  addTearDown(() {
    tester.view.resetDevicePixelRatio();
    tester.view.resetPhysicalSize();
  });
}

Widget buildTerm(TermRepository repository) {
  return MaterialApp(
    theme: ThemeData(fontFamily: 'Sansation'),
    home: Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Term(repository: repository),
        ),
      ),
    ),
  );
}

void main() {
  test('maps term data to the API contract used by web', () {
    final request = CreateTermRequest(
      yearLevel: '3',
      term: '2',
      academicYear: '2569',
      midtermStartDate: DateTime(2026, 7, 1),
      midtermEndDate: DateTime(2026, 7, 7),
      finalStartDate: DateTime(2026, 10, 1),
      finalEndDate: DateTime(2026, 10, 8),
    );

    expect(request.toJson(), {
      'academic_year': 3,
      'semester': '2569',
      'term': 2,
      'start_midterm': '2026-07-01',
      'end_midterm': '2026-07-07',
      'start_final': '2026-10-01',
      'end_final': '2026-10-08',
    });

    final parsed = CurrentTerm.fromJson({
      'term_id': 4,
      'academic_year': 3,
      'semester': '2569',
      'term': 2,
    });
    expect(parsed.yearLevel, '3');
    expect(parsed.academicYear, '2569');
  });

  testWidgets('shows add button and opens create popup when term is empty', (
    tester,
  ) async {
    setPhoneSize(tester);
    await tester.pumpWidget(buildTerm(FakeTermRepository(null)));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('term-empty')), findsOneWidget);
    expect(find.byKey(const Key('add-term-button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('add-term-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('term-create-popup')), findsOneWidget);
    expect(find.byKey(const Key('year-level-field')), findsOneWidget);
    expect(find.byKey(const Key('academic-year-field')), findsOneWidget);
    expect(find.byKey(const Key('term-number-field')), findsOneWidget);
    expect(find.byKey(const Key('midterm-start-field')), findsOneWidget);
    expect(find.byKey(const Key('midterm-end-field')), findsOneWidget);
    expect(find.byKey(const Key('final-start-field')), findsOneWidget);
    expect(find.byKey(const Key('final-end-field')), findsOneWidget);
    expect(find.byKey(const Key('confirm-term-button')), findsOneWidget);
  });

  testWidgets('opens term details and returns to add state after ending term', (
    tester,
  ) async {
    setPhoneSize(tester);
    final repository = FakeTermRepository(
      CurrentTerm(
        termId: 3,
        yearLevel: '3',
        term: '1',
        academicYear: '2569',
        startMidterm: DateTime(2026, 7, 1),
        endMidterm: DateTime(2026, 7, 7),
        startFinal: DateTime(2026, 7, 16),
        endFinal: DateTime(2026, 7, 22),
      ),
    );
    await tester.pumpWidget(buildTerm(repository));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('current-term-card')), findsOneWidget);
    expect(find.text('2569'), findsOneWidget);

    await tester.tap(find.byKey(const Key('current-term-card')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('term-details-popup')), findsOneWidget);
    expect(find.text('รายละเอียดเทอมปัจจุบัน'), findsOneWidget);
    expect(find.text('1 กรกฎาคม – 7 กรกฎาคม'), findsWidgets);
    expect(find.text('16 กรกฎาคม – 22 กรกฎาคม'), findsWidgets);

    await tester.tap(find.byKey(const Key('end-term-button')));
    await tester.pumpAndSettle();

    expect(repository.ended, isTrue);
    expect(find.byKey(const Key('term-details-popup')), findsNothing);
    expect(find.byKey(const Key('term-empty')), findsOneWidget);
  });
}
