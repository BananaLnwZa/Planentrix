import 'dart:async';

import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import '../../interfaces/score.interface.dart';
import '../../interfaces/term.interface.dart';
import '../../services/score.service.dart';
import '../../services/term.service.dart';
import 'Component/GpaCard.dart';
import 'Component/SubjectScoreSection.dart';

class ScorePage extends StatefulWidget {
  final ScoreRepository? repository;
  final Future<TermWorkflow?> Function()? workflowLoader;

  const ScorePage({super.key, this.repository, this.workflowLoader});

  @override
  State<ScorePage> createState() => _ScorePageState();
}

class _ScorePageState extends State<ScorePage> with WidgetsBindingObserver {
  late final ScoreRepository _repository;
  OverallGradeSummary? _overall;
  bool _goalsReady = false;
  bool _workloadLocked = false;
  bool _showFinalScoreTarget = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _repository = widget.repository ?? ScoreService();
    if (widget.repository == null || widget.workflowLoader != null) {
      unawaited(_loadWorkflow());
    }
  }

  Future<void> _loadWorkflow() async {
    try {
      final workflow =
          await (widget.workflowLoader?.call() ?? TermService().getWorkflow());
      if (!mounted) return;
      setState(() {
        _workloadLocked = workflow?.workloadLocked ?? false;
        _showFinalScoreTarget =
            workflow?.finalTargetReady == true ||
            workflow?.phase == 'final_1w' ||
            workflow?.phase == 'final_exam';
      });
    } catch (_) {
      // The server remains the authority for workload writes when offline.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        (widget.repository == null || widget.workflowLoader != null)) {
      unawaited(_loadWorkflow());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final overall = _overall;
    return NotebookSectionPage(
      activeTab: NotebookTabId.score,
      workflowLoader: widget.workflowLoader,
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
            canEditScores: !_workloadLocked,
            showFinalScoreTarget: _showFinalScoreTarget,
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
