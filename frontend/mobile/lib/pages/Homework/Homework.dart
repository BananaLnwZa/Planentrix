import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';

class HomeworkPage extends StatelessWidget {
  const HomeworkPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const NotebookSectionPage(
      activeTab: NotebookTabId.homework,
      title: 'Homework',
      contentKey: Key('homework-page'),
    );
  }
}
