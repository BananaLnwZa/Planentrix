import 'dart:async';

import 'package:flutter/material.dart';

import '../../common/CurrentTermRequiredState.dart';
import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import '../../interfaces/exam.interface.dart';
import '../../services/exam.service.dart';
import '../../services/term.service.dart';
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
  final TermRepository? termRepository;

  const TestPage({super.key, this.repository, this.termRepository});

  @override
  State<TestPage> createState() => _TestPageState();
}

class _TestPageState extends State<TestPage> {
  late final ExamRepository _repository;
  late final TermRepository? _termRepository;
  List<ExamSummary> _exams = const [];
  List<ExamHistoryItem> _history = const [];
  ExamInsights _insights = const ExamInsights();
  String? _selectedSubjectId;
  ExamDetail? _activeExam;
  final Map<int, int> _answers = {};
  int _currentQuestionIndex = 0;
  int? _openingExamId;
  bool _isLoading = true;
  bool _hasCurrentTerm = true;
  bool _examStarted = false;
  bool _isSubmitting = false;
  bool _showAnswerWarning = false;
  String? _error;
  String? _submitError;
  Duration _remainingTime = Duration.zero;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? ExamService();
    _termRepository =
        widget.termRepository ??
        (widget.repository == null ? TermService() : null);
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
      _hasCurrentTerm = true;
      _error = null;
    });
    try {
      final termRepository = _termRepository;
      if (termRepository != null) {
        final currentTerm = await termRepository.getCurrentTerm();
        if (!mounted) return;
        if (currentTerm == null) {
          setState(() {
            _exams = const [];
            _history = const [];
            _insights = const ExamInsights();
            _selectedSubjectId = null;
            _hasCurrentTerm = false;
            _isLoading = false;
          });
          return;
        }
      }
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
      setState(() {
        _openingExamId = null;
        _activeExam = detail;
        _examStarted = false;
        _submitError = null;
      });
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
      _examStarted = true;
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

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });
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
        _examStarted = false;
        _isSubmitting = false;
      });
      await showExamResultPopup(context, result: result);
      if (mounted) await _loadData();
    } catch (error) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _submitError = '$error';
        });
      }
    }
  }

  void _closeExam() {
    if (_isSubmitting) return;
    _timer?.cancel();
    setState(() {
      _activeExam = null;
      _examStarted = false;
      _answers.clear();
      _showAnswerWarning = false;
      _submitError = null;
    });
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
    return Stack(
      children: [
        NotebookSectionPage(
          activeTab: NotebookTabId.test,
          contentKey: const Key('test-page'),
          contentPadding: const EdgeInsets.fromLTRB(12, 22, 12, 26),
          centerContent: false,
          child: _buildExamHome(),
        ),
        if (_activeExam != null)
          Positioned.fill(child: _buildExamModal(_activeExam!)),
      ],
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
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 26),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF1BBC8)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline_rounded,
                size: 32,
                color: Color(0xFFE27691),
              ),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _loadData,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFB65D78),
                  side: const BorderSide(color: Color(0xFFD3A4B1)),
                  shape: const StadiumBorder(),
                ),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('ลองใหม่'),
              ),
            ],
          ),
        ),
      );
    }
    if (!_hasCurrentTerm) {
      return const Align(
        alignment: Alignment.topCenter,
        child: CurrentTermRequiredState(
          key: Key('test-no-term'),
          detail: 'กรุณาสร้างเทอมและตารางเรียนก่อนทำแบบทดสอบ',
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
            fontSize: 19,
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
          Transform.translate(
            offset: const Offset(0, -3),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
                border: Border.all(color: const Color(0xFFDCE8ED)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x1F375D70),
                    blurRadius: 18,
                    offset: Offset(0, 7),
                  ),
                ],
              ),
              child: ExamList(
                exams: visibleExams,
                loadingExamId: _openingExamId,
                onSelected: _openExam,
              ),
            ),
          ),
        ],
        const SizedBox(height: 24),
        const Text(
          'Feedback',
          style: TextStyle(
            fontSize: 19,
            color: Color(0xFF405B69),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'คำแนะนำและแผนทบทวนหลังทำแบบทดสอบ',
          style: TextStyle(fontSize: 11, color: Color(0xFF82969F)),
        ),
        const SizedBox(height: 14),
        if (feedbackSubjectIds.isEmpty)
          const _NoFeedback()
        else ...[
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
          errorMessage: _submitError,
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

  Widget _buildExamModal(ExamDetail exam) {
    return Material(
      key: const Key('exam-modal-overlay'),
      color: Colors.black.withValues(alpha: 0.35),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxWidth: 620, maxHeight: 680),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFEF8),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFDCD6CA)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x3D000000),
                    blurRadius: 24,
                    offset: Offset(0, 12),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
                    child: _examStarted
                        ? _buildExamRunner()
                        : _ExamIntroduction(
                            exam: exam,
                            onCancel: _closeExam,
                            onStart: () => _beginExam(exam),
                          ),
                  ),
                  Positioned(
                    right: 10,
                    top: 10,
                    child: IconButton(
                      key: const Key('close-exam-modal-button'),
                      onPressed: _isSubmitting ? null : _closeExam,
                      tooltip: 'ปิด',
                      color: const Color(0xFF59707B),
                      icon: const Icon(Icons.close_rounded, size: 24),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NoAvailableExam extends StatelessWidget {
  const _NoAvailableExam();

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('test-no-checkpoint-exam'),
      constraints: const BoxConstraints(minHeight: 112),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
      decoration: BoxDecoration(
        color: const Color(0xFFF5FAEF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCE7D2)),
      ),
      child: const Text(
        'ยังไม่มีแบบทดสอบที่ถึงรอบ Checkpoint',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, color: Color(0xFF78906A)),
      ),
    );
  }
}

class _NoFeedback extends StatelessWidget {
  const _NoFeedback();

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('test-no-feedback'),
      constraints: const BoxConstraints(minHeight: 160),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCE7EB)),
      ),
      child: const Text(
        'ยังไม่มี Feedback จากการทำแบบทดสอบ',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, color: Color(0xFF8A9CA4)),
      ),
    );
  }
}

class _ExamIntroduction extends StatelessWidget {
  final ExamDetail exam;
  final VoidCallback onCancel;
  final VoidCallback onStart;

  const _ExamIntroduction({
    required this.exam,
    required this.onCancel,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    final summary = exam.summary;
    return Column(
      key: const Key('exam-details-popup'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(right: 34),
          child: Text(
            summary.examName,
            style: const TextStyle(
              fontSize: 19,
              color: Color(0xFF405B69),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          summary.subjectName,
          style: const TextStyle(fontSize: 13, color: Color(0xFF738892)),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _ExamMetric(
                color: const Color(0xFFEAF6FB),
                value: '${exam.questions.length}',
                label: 'ข้อ',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ExamMetric(
                color: const Color(0xFFFFF0BF),
                value: '${summary.timeLimitMinutes}',
                label: 'นาที',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ExamMetric(
                color: const Color(0xFFFFE7EB),
                value: _scoreText(summary.totalScore),
                label: 'คะแนน',
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const Text(
          'เมื่อเริ่มแล้วเวลาจะนับถอยหลัง และต้องเลือกคำตอบก่อนจึงจะไปข้อถัดไปได้',
          style: TextStyle(
            fontSize: 11,
            height: 1.55,
            color: Color(0xFF778990),
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: onCancel,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF63747C),
                  side: const BorderSide(color: Color(0xFFBAC6CB)),
                  shape: const StadiumBorder(),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
                child: const FittedBox(child: Text('ยกเลิก')),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                key: const Key('start-exam-button'),
                onPressed: exam.questions.isEmpty ? null : onStart,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFA8D780),
                  foregroundColor: Colors.white,
                  shape: const StadiumBorder(),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
                child: const FittedBox(child: Text('เริ่มทำ')),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ExamMetric extends StatelessWidget {
  final Color color;
  final String value;
  final String label;

  const _ExamMetric({
    required this.color,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        '$value\n$label',
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 11,
          height: 1.45,
          color: Color(0xFF59707B),
        ),
      ),
    );
  }
}

String _scoreText(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toStringAsFixed(1);

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
