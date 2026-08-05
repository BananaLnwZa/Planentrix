import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';

class TimerPage extends StatelessWidget {
  const TimerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const NotebookSectionPage(
      activeTab: NotebookTabId.timer,
      title: 'Timer',
      contentKey: Key('timer-page'),
    );
  }
}
