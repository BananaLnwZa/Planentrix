import 'package:flutter/material.dart';

import '../../../interfaces/score.interface.dart';
import '../../../services/score.service.dart';
import 'GradeGoalSetupPopup.dart';
import 'ScoreEntryPopup.dart';
import 'SubjectScoreCard.dart';
import 'SubjectTabs.dart';

class SubjectScoreSection extends StatefulWidget {
  final ScoreRepository repository;
  final ValueChanged<OverallGradeSummary> onOverallChanged;
  final ValueChanged<bool> onGoalStateChanged;

  const SubjectScoreSection({
    super.key,
    required this.repository,
    required this.onOverallChanged,
    required this.onGoalStateChanged,
  });

  @override
  State<SubjectScoreSection> createState() => _SubjectScoreSectionState();
}

class _SubjectScoreSectionState extends State<SubjectScoreSection> {
  List<SubjectScore> _subjects = const [];
  int _selectedIndex = 0;
  int? _savingWorkloadId;
  bool _isLoading = true;
  bool _isSavingGoals = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        widget.repository.getCompletedSubjectScores(),
        widget.repository.getOverallGrade(),
      ]);
      if (!mounted) return;
      final subjects = results[0] as List<SubjectScore>;
      final overall = results[1] as OverallGradeSummary;
      setState(() {
        _subjects = subjects;
        _selectedIndex = subjects.isEmpty
            ? 0
            : _selectedIndex.clamp(0, subjects.length - 1);
        _isLoading = false;
      });
      widget.onOverallChanged(overall);
      widget.onGoalStateChanged(
        subjects.isNotEmpty &&
            subjects.every((subject) => subject.targetScore != null),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshOverall() async {
    try {
      final overall = await widget.repository.getOverallGrade();
      if (mounted) widget.onOverallChanged(overall);
    } catch (_) {
      // The subject update already succeeded. Keep it visible even when the
      // overall summary cannot be refreshed temporarily.
    }
  }

  Future<void> _setupGradeGoals() async {
    if (_subjects.isEmpty || _isSavingGoals) return;
    final selections = await showGradeGoalSetupPopup(
      context,
      subjects: _subjects,
    );
    if (selections == null || !mounted) return;

    setState(() => _isSavingGoals = true);
    try {
      await widget.repository.saveTargetGrades(selections);
      if (!mounted) return;
      setState(() {
        _subjects = _subjects.map((subject) {
          final grade = selections[subject.scheduleTimeId];
          if (grade == null) return subject;
          return subject.copyWith(
            targetScore: gpaFromGrade(grade),
            replaceTargetScore: true,
          );
        }).toList();
      });
      await _refreshOverall();
      if (mounted &&
          _subjects.isNotEmpty &&
          _subjects.every((subject) => subject.targetScore != null)) {
        widget.onGoalStateChanged(true);
      }
    } catch (error) {
      if (mounted) _showError('$error');
    } finally {
      if (mounted) setState(() => _isSavingGoals = false);
    }
  }

  Future<void> _enterScore(WorkloadScore workload) async {
    final selectedSubject = _subjects[_selectedIndex];
    final scheduleTimeId = selectedSubject.scheduleTimeId;
    final otherMaximumScore = selectedSubject.workloads
        .where((item) => item.workloadId != workload.workloadId)
        .fold<double>(0, (sum, item) => sum + (item.maxScore ?? 0));
    final maximumAllowed = (100 - otherMaximumScore).clamp(0, 100).toDouble();
    final input = await showScoreEntryPopup(
      context,
      workload: workload,
      maximumAllowed: maximumAllowed,
    );
    if (input == null || !mounted) return;

    setState(() => _savingWorkloadId = workload.workloadId);
    try {
      await widget.repository.saveWorkloadScore(workload.workloadId, input);
      if (!mounted) return;
      final subjectIndex = _subjects.indexWhere(
        (item) => item.scheduleTimeId == scheduleTimeId,
      );
      if (subjectIndex < 0) return;
      final subject = _subjects[subjectIndex];
      final updatedWorkloads = subject.workloads
          .map(
            (item) => item.workloadId == workload.workloadId
                ? item.copyWith(
                    actualScore: input.actualScore,
                    maxScore: input.maximumScore,
                  )
                : item,
          )
          .toList();
      setState(() {
        _subjects = [..._subjects]
          ..[subjectIndex] = subject.copyWith(workloads: updatedWorkloads);
      });
      await _refreshOverall();
    } catch (error) {
      if (mounted) _showError('$error');
    } finally {
      if (mounted) setState(() => _savingWorkloadId = null);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const _ScoreStateCard(
        key: Key('subject-score-loading'),
        child: CircularProgressIndicator(strokeWidth: 2.5),
      );
    }

    if (_error != null) {
      return _ScoreStateCard(
        key: const Key('subject-score-error'),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, color: Color(0xFFE56B8A)),
            const SizedBox(height: 8),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF6A7175)),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              key: const Key('retry-subject-scores'),
              onPressed: _loadData,
              child: const Text('ลองใหม่'),
            ),
          ],
        ),
      );
    }

    if (_subjects.isEmpty) {
      return const _ScoreStateCard(
        key: Key('subject-score-empty'),
        child: Text(
          'ยังไม่มีข้อมูลวิชาในเทอมปัจจุบัน',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 15, color: Color(0xFF7897AC)),
        ),
      );
    }

    if (_subjects.any((subject) => subject.targetScore == null)) {
      return GradeGoalSetupPrompt(
        isSaving: _isSavingGoals,
        onPressed: _setupGradeGoals,
      );
    }

    final subject = _subjects[_selectedIndex];
    return Column(
      key: const Key('subject-score-section'),
      children: [
        SubjectTabs(
          subjects: _subjects,
          selectedIndex: _selectedIndex,
          onSelected: (index) => setState(() => _selectedIndex = index),
        ),
        Transform.translate(
          offset: const Offset(0, -1),
          child: SubjectScoreCard(
            subject: subject,
            savingWorkloadId: _savingWorkloadId,
            onEnterScore: _enterScore,
          ),
        ),
      ],
    );
  }
}

class _ScoreStateCard extends StatelessWidget {
  final Widget child;

  const _ScoreStateCard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 130),
      padding: const EdgeInsets.all(20),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD7D7D7)),
      ),
      child: child,
    );
  }
}
