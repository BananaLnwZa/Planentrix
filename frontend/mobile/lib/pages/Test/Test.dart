import 'dart:async';

import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import '../../interfaces/exam.interface.dart';
import '../../services/exam.service.dart';
import 'Component/ExamDetailsPopup.dart';
import 'Component/ExamHistorySection.dart';
import 'Component/ExamList.dart';
import 'Component/ExamNavigationButtons.dart';
import 'Component/ExamProgressHeader.dart';
import 'Component/ExamQuestionCard.dart';
import 'Component/ExamResultPopup.dart';
import 'Component/SubjectReviewFeedbackCard.dart';
import 'Component/SubmitExamPopup.dart';
import 'Component/TestSubjectTabs.dart';

class TestPage extends StatefulWidget {
  final ExamRepository? repository;

  const TestPage({super.key, this.repository});

  @override
  State<TestPage> createState() => _TestPageState();
}

class _TestPageState extends State<TestPage> {
  late final ExamRepository _repository;
  List<ExamSummary> _exams = const [];
  List<ExamHistoryItem> _history = const [];
  ExamInsights _insights = const ExamInsights();
  String? _selectedSubjectId;
  ExamDetail? _activeExam;
  final Map<int, int> _answers = {};
  int _currentQuestionIndex = 0;
  int? _openingExamId;
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _showAnswerWarning = false;
  String? _error;
  Duration _remainingTime = Duration.zero;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? ExamService();
    _loadData();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        _repository.getExams(),
        _repository.getHistory(),
        _repository.getInsights(),
      ]);
      if (!mounted) return;
      final exams = results[0] as List<ExamSummary>;
      setState(() {
        _exams = exams;
        _history = results[1] as List<ExamHistoryItem>;
        _insights = results[2] as ExamInsights;
        _selectedSubjectId = _resolveSelectedSubject(exams);
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isLoading = false;
      });
    }
  }

  String? _resolveSelectedSubject(List<ExamSummary> exams) {
    if (exams.isEmpty) return null;
    if (exams.any((exam) => exam.subjectId == _selectedSubjectId)) {
      return _selectedSubjectId;
    }
    return exams.first.subjectId;
  }

  Future<void> _openExam(ExamSummary summary) async {
    if (_openingExamId != null) return;
    setState(() => _openingExamId = summary.examRepositoryId);
    try {
      final detail = await _repository.getExamDetail(summary.examRepositoryId);
      if (!mounted) return;
      setState(() => _openingExamId = null);
      final shouldStart = await showExamDetailsPopup(context, exam: detail);
      if (!shouldStart || !mounted) return;
      _beginExam(detail);
    } catch (error) {
      if (mounted) {
        setState(() => _openingExamId = null);
        _showError('$error');
      }
    }
  }

  void _beginExam(ExamDetail detail) {
    _timer?.cancel();
    setState(() {
      _activeExam = detail;
      _answers.clear();
      _currentQuestionIndex = 0;
      _showAnswerWarning = false;
      _remainingTime = Duration(
        minutes: detail.summary.timeLimitMinutes.clamp(1, 1440),
      );
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _activeExam == null || _isSubmitting) return;
      if (_remainingTime.inSeconds <= 1) {
        _timer?.cancel();
        setState(() => _remainingTime = Duration.zero);
        _submitExam(skipConfirmation: true);
      } else {
        setState(() {
          _remainingTime = Duration(seconds: _remainingTime.inSeconds - 1);
        });
      }
    });
  }

  Future<void> _submitExam({bool skipConfirmation = false}) async {
    final exam = _activeExam;
    if (exam == null || _isSubmitting) return;
    if (!skipConfirmation && !_hasAnsweredCurrentQuestion(exam)) {
      _showAnswerRequiredWarning();
      return;
    }
    if (!skipConfirmation) {
      final confirmed = await showSubmitExamPopup(
        context,
        unansweredCount: exam.questions.length - _answers.length,
      );
      if (!confirmed || !mounted) return;
    }

    setState(() => _isSubmitting = true);
    try {
      final result = await _repository.submitExam(
        exam.summary.examRepositoryId,
        _answers.entries
            .map(
              (entry) =>
                  ExamAnswer(questionId: entry.key, choiceId: entry.value),
            )
            .toList(),
      );
      if (!mounted) return;
      _timer?.cancel();
      setState(() {
        _activeExam = null;
        _isSubmitting = false;
      });
      await showExamResultPopup(context, result: result);
      if (mounted) await _loadData();
    } catch (error) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        _showError('$error');
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  bool _hasAnsweredCurrentQuestion(ExamDetail exam) {
    final question = exam.questions[_currentQuestionIndex];
    return _answers.containsKey(question.questionId);
  }

  void _showAnswerRequiredWarning() {
    setState(() => _showAnswerWarning = true);
  }

  void _goToNextQuestion() {
    final exam = _activeExam;
    if (exam == null) return;
    if (!_hasAnsweredCurrentQuestion(exam)) {
      _showAnswerRequiredWarning();
      return;
    }
    setState(() {
      _currentQuestionIndex += 1;
      _showAnswerWarning = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return NotebookSectionPage(
      activeTab: NotebookTabId.test,
      contentKey: const Key('test-page'),
      contentPadding: const EdgeInsets.fromLTRB(13, 22, 13, 26),
      centerContent: false,
      child: _activeExam == null ? _buildExamHome() : _buildExamRunner(),
    );
  }

  Widget _buildExamHome() {
    if (_isLoading) {
      return const _TestState(
        key: Key('test-loading'),
        child: CircularProgressIndicator(strokeWidth: 2.5),
      );
    }
    if (_error != null) {
      return _TestState(
        key: const Key('test-error'),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, color: Color(0xFFE56B8A)),
            const SizedBox(height: 8),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 10),
            OutlinedButton(onPressed: _loadData, child: const Text('ลองใหม่')),
          ],
        ),
      );
    }
    final uniqueSubjects = <String, ExamSummary>{};
    for (final exam in _exams) {
      uniqueSubjects.putIfAbsent(exam.subjectId, () => exam);
    }
    final visibleExams = _selectedSubjectId == null
        ? const <ExamSummary>[]
        : _exams.where((exam) => exam.subjectId == _selectedSubjectId).toList();
    final feedbackSubjectIds = <String>{
      ..._insights.weakTopics.map((topic) => topic.subjectId),
      ..._insights.nextCheckpoints.map((checkpoint) => checkpoint.subjectId),
    };
    return Column(
      key: const Key('test-home-content'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'แบบทดสอบ',
          style: TextStyle(
            fontSize: 22,
            color: Color(0xFF405B69),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'แบบทดสอบที่ถึงรอบ Checkpoint',
          style: TextStyle(fontSize: 11, color: Color(0xFF82969F)),
        ),
        const SizedBox(height: 14),
        if (_exams.isEmpty)
          const _NoAvailableExam()
        else ...[
          TestSubjectTabs(
            subjects: uniqueSubjects.values.toList(),
            selectedSubjectId: _selectedSubjectId!,
            onSelected: (value) => setState(() => _selectedSubjectId = value),
          ),
          const SizedBox(height: 14),
          ExamList(
            exams: visibleExams,
            loadingExamId: _openingExamId,
            onSelected: _openExam,
          ),
        ],
        if (feedbackSubjectIds.isNotEmpty) ...[
          const SizedBox(height: 18),
          for (final subjectId in feedbackSubjectIds) ...[
            SubjectReviewFeedbackCard(
              subjectId: subjectId,
              topics: _insights.weakTopics
                  .where((topic) => topic.subjectId == subjectId)
                  .toList(),
              checkpoints: _insights.nextCheckpoints
                  .where((checkpoint) => checkpoint.subjectId == subjectId)
                  .toList(),
              now: DateTime.now(),
            ),
            if (subjectId != feedbackSubjectIds.last)
              const SizedBox(height: 12),
          ],
        ],
        const SizedBox(height: 25),
        ExamHistorySection(history: _history),
      ],
    );
  }

  Widget _buildExamRunner() {
    final exam = _activeExam!;
    final question = exam.questions[_currentQuestionIndex];
    return Column(
      key: const Key('exam-runner'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ExamProgressHeader(
          examName: exam.summary.examName,
          currentQuestion: _currentQuestionIndex + 1,
          totalQuestions: exam.questions.length,
          remainingTime: _remainingTime,
        ),
        const SizedBox(height: 13),
        ExamQuestionCard(
          question: question,
          selectedChoiceId: _answers[question.questionId],
          showAnswerWarning: _showAnswerWarning,
          onChoiceSelected: (choiceId) {
            setState(() {
              _answers[question.questionId] = choiceId;
              _showAnswerWarning = false;
            });
          },
        ),
        const SizedBox(height: 16),
        ExamNavigationButtons(
          canGoBack: _currentQuestionIndex > 0,
          isLastQuestion: _currentQuestionIndex == exam.questions.length - 1,
          isSubmitting: _isSubmitting,
          onBack: () => setState(() {
            _currentQuestionIndex -= 1;
            _showAnswerWarning = false;
          }),
          onNext: _goToNextQuestion,
          onSubmit: _submitExam,
        ),
      ],
    );
  }
}

class _NoAvailableExam extends StatelessWidget {
  const _NoAvailableExam();

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('test-no-checkpoint-exam'),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 22),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F8EE),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD9E8CD)),
      ),
      child: const Column(
        children: [
          Icon(Icons.task_alt_rounded, color: Color(0xFF83AA68)),
          SizedBox(height: 7),
          Text(
            'ยังไม่มีแบบทดสอบที่ถึงรอบ',
            style: TextStyle(fontSize: 13, color: Color(0xFF667A5A)),
          ),
          SizedBox(height: 3),
          Text(
            'ทบทวนตามคำแนะนำระหว่างรอ Checkpoint ถัดไป',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10, color: Color(0xFF8A9982)),
          ),
        ],
      ),
    );
  }
}

class _TestState extends StatelessWidget {
  final Widget child;

  const _TestState({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 280),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(20),
      child: DefaultTextStyle(
        style: const TextStyle(fontSize: 13, color: Color(0xFF7897AC)),
        child: child,
      ),
    );
  }
}
