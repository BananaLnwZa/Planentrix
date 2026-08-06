import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import 'Component/GpaCard.dart';

class ScorePage extends StatelessWidget {
  const ScorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const NotebookSectionPage(
      activeTab: NotebookTabId.score,
      contentKey: Key('score-page'),
      centerContent: false,
      child: Column(
        children: [SizedBox(height: 49), GpaCard(), SizedBox(height: 40)],
      ),
    );
  }
}
