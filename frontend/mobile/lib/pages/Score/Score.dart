import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';

class ScorePage extends StatelessWidget {
  const ScorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const NotebookSectionPage(
      activeTab: NotebookTabId.score,
      title: 'Score',
      contentKey: Key('score-page'),
    );
  }
}
