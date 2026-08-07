import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import '../../interfaces/score.interface.dart';
import '../../services/score.service.dart';
import 'Component/GpaCard.dart';
import 'Component/SubjectScoreSection.dart';

class ScorePage extends StatefulWidget {
  final ScoreRepository? repository;

  const ScorePage({super.key, this.repository});

  @override
  State<ScorePage> createState() => _ScorePageState();
}

class _ScorePageState extends State<ScorePage> {
  late final ScoreRepository _repository;
  OverallGradeSummary? _overall;
  bool _goalsReady = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? ScoreService();
  }

  @override
  Widget build(BuildContext context) {
    final overall = _overall;
    return NotebookSectionPage(
      activeTab: NotebookTabId.score,
      contentKey: const Key('score-page'),
      contentPadding: const EdgeInsets.fromLTRB(12, 24, 12, 24),
      centerContent: false,
      child: Column(
        children: [
          if (_goalsReady) ...[
            GpaCard(
              gpa: overall?.actualGpa ?? 0,
              maximumGpa: overall?.targetGpa ?? 0,
            ),
            const SizedBox(height: 26),
          ],
          SubjectScoreSection(
            repository: _repository,
            onOverallChanged: (value) {
              if (!mounted || identical(_overall, value)) return;
              setState(() => _overall = value);
            },
            onGoalStateChanged: (value) {
              if (!mounted || _goalsReady == value) return;
              setState(() => _goalsReady = value);
            },
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}
