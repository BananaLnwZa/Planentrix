// ignore_for_file: file_names

import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/auth.service.dart';
import '../../services/storage.service.dart';
import '../../services/term.service.dart';
import '../../services/profile.service.dart';
import '../../services/table.service.dart';
import '../../services/homework.service.dart';
import '../../services/recommendation.service.dart';
import '../../services/exam.service.dart';
import '../../services/app_notification.service.dart';
import '../../services/score.service.dart';
import '../../interfaces/auth.interface.dart';
import '../../interfaces/profile.interface.dart';
import '../../interfaces/term.interface.dart';
import '../../interfaces/homework.interface.dart';
import '../../interfaces/recommendation.interface.dart';
import '../../interfaces/table.interface.dart';
import '../../interfaces/exam.interface.dart';
import '../../interfaces/app_alert.interface.dart';
import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import 'Component/Schedule.dart';
import 'Component/EditProfilePopup.dart';
import 'Component/StudentCard.dart';
import 'Component/StudentCardPopup.dart';
import 'Component/Term.dart';
import 'Component/SystemEvaluationPopup.dart';
import 'Component/MainNotificationCard.dart';
import 'Component/MainNotificationPopup.dart';
import 'Component/RecommendationCard.dart';
import 'Component/ExamFlowNotice.dart';
import 'Component/MidtermFollowupPopup.dart';
import 'Component/BehaviorSummary.dart';

typedef LogoutAction = Future<void> Function();

class MainPage extends StatefulWidget {
  final LogoutAction? logoutAction;
  final String? username;
  final int? userId;
  final TermRepository? termRepository;
  final ProfileRepository? profileRepository;
  final TableRepository? tableRepository;
  final HomeworkRepository? homeworkRepository;
  final RecommendationRepository? recommendationRepository;
  final ExamRepository? examRepository;
  final GradeGoalStatusRepository? gradeGoalStatusRepository;
  final Future<TermWorkflow?> Function()? workflowLoader;
  final Future<BehaviorSummaryData> Function()? behaviorSummaryLoader;

  const MainPage({
    super.key,
    this.logoutAction,
    this.username,
    this.userId,
    this.termRepository,
    this.profileRepository,
    this.tableRepository,
    this.homeworkRepository,
    this.recommendationRepository,
    this.examRepository,
    this.gradeGoalStatusRepository,
    this.workflowLoader,
    this.behaviorSummaryLoader,
  });

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> with WidgetsBindingObserver {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();
  late final ProfileRepository _profileRepository;
  late final TermRepository _termRepository;
  late final HomeworkRepository _homeworkRepository;
  late final RecommendationRepository _recommendationRepository;
  late final TableRepository _tableRepository;
  late final ExamRepository _examRepository;
  late final GradeGoalStatusRepository _gradeGoalStatusRepository;

  String? _username;
  int? _userId;
  bool _isLoadingSession = true;
  bool _isLoggingOut = false;
  CurrentTerm? _currentTerm;
  TermWorkflow? _workflow;
  UserProfile? _profile;
  UserConstraint? _constraint;
  String? _profileError;
  int _scheduleVersion = 0;
  List<AppAlertData> _alertEvents = const [];
  List<AppAlertData> _activeAlerts = const [];
  DateTime _alertNow = DateTime.now();
  Timer? _alertClock;
  bool _hasSavedGradeGoals = false;
  bool _isShowingEvaluation = false;
  bool _isShowingMidtermFollowup = false;
  int _workflowLoadVersion = 0;
  DateTime _workflowCheckedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _termRepository = widget.termRepository ?? TermService();
    _profileRepository = widget.profileRepository ?? ProfileService();
    _homeworkRepository = widget.homeworkRepository ?? HomeworkService();
    _recommendationRepository =
        widget.recommendationRepository ?? RecommendationService();
    _tableRepository = widget.tableRepository ?? TableService();
    _examRepository = widget.examRepository ?? ExamService();
    _gradeGoalStatusRepository =
        widget.gradeGoalStatusRepository ?? ScoreService();
    _username = widget.username;
    _userId = widget.userId;
    _loadPageData();
    _alertClock = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _refreshActiveAlerts(),
    );
  }

  Future<void> _loadPageData() async {
    String? username = _username;
    int? userId = _userId;
    try {
      if (username == null || userId == null) {
        final session = await _storageService.getSession();
        username = session?.username;
        userId = session?.userId;
      }
    } catch (_) {}

    UserProfile? profile;
    UserConstraint? constraint;
    String? profileError;
    if (widget.profileRepository != null || widget.username == null) {
      final profileFuture = _capture(_profileRepository.getProfile());
      final constraintFuture = _capture(_profileRepository.getConstraints());
      final profileResult = await profileFuture;
      final constraintResult = await constraintFuture;
      profile = profileResult.value;
      constraint = constraintResult.value;
      final errors = [
        profileResult.error,
        constraintResult.error,
      ].whereType<Object>().map((error) => '$error').toList();
      if (errors.isNotEmpty) profileError = errors.join('\n');
      if (profile != null && constraint == null) {
        constraint = UserConstraint(constraintId: 0, userId: profile.userId);
      }
    }

    if (!mounted) return;
    setState(() {
      _username = profile?.userName ?? username;
      _userId = profile?.userId ?? userId;
      _profile = profile;
      _constraint = constraint;
      _profileError = profileError;
      _isLoadingSession = false;
    });

    if (_shouldLoadAlerts) {
      unawaited(_loadAppAlerts());
    }
    if (_shouldLoadGradeGoalStatus) {
      unawaited(_loadGradeGoalStatus());
    }
    unawaited(_loadPendingEvaluation());
    unawaited(_loadWorkflow());
  }

  Future<void> _loadWorkflow() async {
    final requestVersion = ++_workflowLoadVersion;
    try {
      final workflow = widget.workflowLoader != null
          ? await widget.workflowLoader!()
          : _termRepository is TermService
          ? await _termRepository.getWorkflow()
          : null;
      if (!mounted || requestVersion != _workflowLoadVersion) return;
      setState(() {
        _workflow = workflow;
        _workflowCheckedDate = DateTime.now();
      });
      if (workflow?.midtermFollowupPending == true) {
        unawaited(_showMidtermFollowup());
      }
    } catch (_) {
      if (mounted && requestVersion == _workflowLoadVersion) {
        setState(() => _workflow = null);
      }
    }
  }

  Future<void> _showMidtermFollowup() async {
    if (_isShowingMidtermFollowup) return;
    _isShowingMidtermFollowup = true;
    await Future<void>.delayed(Duration.zero);
    if (!mounted) {
      _isShowingMidtermFollowup = false;
      return;
    }
    try {
      final destination = await showMidtermFollowupPopup(
        context,
        onAcknowledge: _termRepository.acknowledgeMidtermFollowup,
        hasFinalTest: _workflow?.initialFinalTestPending ?? false,
      );
      if (!mounted) return;
      if (destination != null) {
        setState(
          () => _workflow = _workflow == null
              ? null
              : TermWorkflow(
                  phase: _workflow!.phase,
                  postFinal: _workflow!.postFinal,
                  workloadLocked: _workflow!.workloadLocked,
                  finalTargetReady: _workflow!.finalTargetReady,
                  initialFinalTestPending: _workflow!.initialFinalTestPending,
                ),
        );
        if (destination == MidtermFollowupDestination.homework) {
          await Navigator.of(context).pushNamed('/homework');
        } else if (destination == MidtermFollowupDestination.test) {
          await Navigator.of(context).pushNamed('/test');
        }
        if (mounted) await _loadWorkflow();
      }
    } finally {
      _isShowingMidtermFollowup = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_loadWorkflow());
  }

  Future<void> _loadPendingEvaluation() async {
    if (_isShowingEvaluation) return;
    try {
      final evaluation = await _termRepository.getPendingSystemEvaluation();
      if (!mounted || evaluation == null || _isShowingEvaluation) return;
      _isShowingEvaluation = true;
      await Future<void>.delayed(Duration.zero);
      if (!mounted) return;
      await showSystemEvaluationPopup(
        context,
        evaluation: evaluation,
        repository: _termRepository,
      );
    } catch (_) {
      // The optional evaluation must not block the student dashboard.
    } finally {
      _isShowingEvaluation = false;
    }
  }

  bool get _usesLiveAlertSources =>
      widget.username == null && widget.profileRepository == null;

  bool get _shouldLoadAlerts =>
      _usesLiveAlertSources ||
      widget.homeworkRepository != null ||
      widget.tableRepository != null ||
      widget.recommendationRepository != null ||
      widget.examRepository != null;

  bool get _loadHomeworkSource =>
      _usesLiveAlertSources || widget.homeworkRepository != null;

  bool get _loadTableSource =>
      _usesLiveAlertSources || widget.tableRepository != null;

  bool get _loadRecommendationSource =>
      _usesLiveAlertSources || widget.recommendationRepository != null;

  bool get _loadExamSource =>
      _usesLiveAlertSources || widget.examRepository != null;

  bool get _shouldLoadRecommendations =>
      widget.recommendationRepository != null ||
      (widget.tableRepository == null &&
          widget.profileRepository == null &&
          widget.username == null);

  bool get _shouldLoadGradeGoalStatus =>
      _usesLiveAlertSources || widget.gradeGoalStatusRepository != null;

  Future<void> _loadGradeGoalStatus() async {
    var hasSavedGradeGoals = false;
    try {
      hasSavedGradeGoals = await _gradeGoalStatusRepository
          .hasSavedGradeGoals();
    } catch (_) {}
    if (!mounted) return;
    setState(() => _hasSavedGradeGoals = hasSavedGradeGoals);
  }

  Future<void> _loadAppAlerts() async {
    final Future<({HomeworkOverview? value, Object? error})> homeworkFuture =
        _loadHomeworkSource
        ? _capture<HomeworkOverview>(_homeworkRepository.getHomeworkOverview())
        : Future.value((value: null, error: null));
    final Future<({CurrentSchedule? value, Object? error})> scheduleFuture =
        _loadTableSource
        ? _capture<CurrentSchedule?>(_tableRepository.getCurrentSchedule())
        : Future.value((value: null, error: null));
    final Future<({AcceptedWeeklySchedule? value, Object? error})>
    weeklyFuture = _loadRecommendationSource
        ? _capture<AcceptedWeeklySchedule?>(
            _recommendationRepository.getWeeklySchedule(),
          )
        : Future.value((value: null, error: null));
    final Future<({ExamInsights? value, Object? error})> insightsFuture =
        _loadExamSource
        ? _capture<ExamInsights>(_examRepository.getInsights())
        : Future.value((value: null, error: null));

    final homework = await homeworkFuture;
    final schedule = await scheduleFuture;
    final weekly = await weeklyFuture;
    final insights = await insightsFuture;
    if (!mounted) return;

    final now = DateTime.now();
    final events = buildAppAlerts(
      homeworkTasks: homework.value?.tasks ?? const [],
      currentSchedule: schedule.value,
      weeklySchedule: weekly.value,
      checkpoints: insights.value?.nextCheckpoints ?? const [],
      now: now,
    );
    setState(() {
      _alertEvents = events;
      _alertNow = now;
      _activeAlerts = activeAppAlerts(events, now: now);
    });
    if (_usesLiveAlertSources) {
      unawaited(AppNotificationService.instance.syncAlerts(events));
    }
  }

  void _refreshActiveAlerts() {
    if (!mounted) return;
    final now = DateTime.now();
    if (now.year != _workflowCheckedDate.year ||
        now.month != _workflowCheckedDate.month ||
        now.day != _workflowCheckedDate.day) {
      _workflowCheckedDate = now;
      unawaited(_loadWorkflow());
    }
    setState(() {
      _alertNow = now;
      _activeAlerts = activeAppAlerts(_alertEvents, now: now);
    });
  }

  Future<void> _openNotifications() async {
    await showMainNotificationPopup(
      context,
      alerts: _activeAlerts,
      now: _alertNow,
      onSelected: (alert) {
        Navigator.of(context).pop();
        if (alert.destination != '/main') {
          Navigator.of(context).pushReplacementNamed(alert.destination);
        }
      },
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _alertClock?.cancel();
    super.dispose();
  }

  String get _displayName {
    final fullName = _profile?.fullName?.trim();
    if (fullName != null && fullName.isNotEmpty) return fullName;
    return _username ?? 'Student';
  }

  String get _displayMajor {
    final name = _profile?.departmentName?.trim();
    final code = _profile?.departmentCode?.trim();
    if (name != null && name.isNotEmpty) {
      return code != null && code.isNotEmpty ? '$name ($code)' : name;
    }
    return code == null || code.isEmpty ? '—' : code;
  }

  String _profileText(String? value) {
    final text = value?.trim();
    return text == null || text.isEmpty ? '—' : text;
  }

  String get _displayStudentNumber => (_userId ?? 1).toString().padLeft(2, '0');

  String get _displayGender {
    final value = _profile?.gender;
    if (value == null || value.isEmpty) return '—';
    return '${value[0].toUpperCase()}${value.substring(1)}';
  }

  ImageProvider<Object>? get _photo {
    final url = _profile?.userPicUrl;
    return url == null || url.isEmpty ? null : NetworkImage(url);
  }

  String _formatMinutes(int? value) {
    if (value == null) return '—';
    final hours = value ~/ 60;
    final minutes = value % 60;
    return '$hours ชม. $minutes นาที';
  }

  String _dayName(int? day) => day == null || day < 1 || day > 7
      ? '—'
      : const [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ][day - 1];

  Future<void> _openStudentCard() async {
    final constraint = _constraint;
    await showStudentCardPopup(
      context,
      name: _displayName,
      username: _profile?.userName ?? _username ?? '—',
      email: _profileText(_profile?.email),
      faculty: _profileText(_profile?.facultyName),
      gender: _displayGender,
      major: _displayMajor,
      dayOff: _dayName(constraint?.dayOff),
      workingDuration: _formatMinutes(constraint?.continuousWorkingDuration),
      breakDuration: _formatMinutes(constraint?.breakDuration),
      workingTime: constraint?.startTime == null || constraint?.endTime == null
          ? '—'
          : '${constraint!.startTime} – ${constraint.endTime}',
      busyTimes:
          constraint?.busyDays
              .map(
                (busy) => '${_dayName(busy.day)} ${busy.start} – ${busy.end}',
              )
              .toList() ??
          const [],
      photo: _photo,
      onEditProfile: _profile == null || _constraint == null
          ? null
          : () {
              Navigator.of(context).pop();
              Future<void>.delayed(Duration.zero, _openEditProfile);
            },
      onArchiveProfile: () {
        Navigator.of(context).pop();
        Future<void>.delayed(Duration.zero, _confirmArchiveProfile);
      },
      onLogout: _logout,
    );
  }

  Future<void> _openEditProfile() async {
    final profile = _profile;
    final constraint = _constraint;
    if (profile == null || constraint == null) return;
    final result = await showEditProfilePopup(
      context,
      profile: profile,
      constraint: constraint,
      repository: _profileRepository,
    );
    if (result == null || !mounted) return;
    setState(() {
      _profile = result.profile;
      _constraint = result.constraint;
      _username = result.profile.userName;
      _profileError = null;
    });
    try {
      final session = await _storageService.getSession();
      if (session != null) {
        await _storageService.saveSession(
          UserSession(
            userId: session.userId,
            username: result.profile.userName,
            role: session.role,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _confirmArchiveProfile() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        key: const Key('archive-account-confirmation'),
        title: const Text('จัดเก็บบัญชี?'),
        content: const Text(
          'บัญชีจะไม่สามารถเข้าสู่ระบบได้ แต่ประวัติการเรียน คะแนน ข้อสอบ และข้อมูลที่เกี่ยวข้องจะยังคงอยู่',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            key: const Key('confirm-archive-account'),
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFE65D84),
            ),
            child: const Text('จัดเก็บบัญชี'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await _authService.archiveAccount();
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error'), behavior: SnackBarBehavior.floating),
      );
    }
  }

  Widget _buildNotebookContent() {
    return Column(
      key: const ValueKey('main-tab-content'),
      children: [
        StudentCard(
          name: _displayName,
          firstName: _profile?.firstName,
          lastName: _profile?.lastName,
          faculty: _profile?.facultyName,
          studentNumber: _displayStudentNumber,
          major:
              _profile?.departmentName ??
              _profile?.departmentCode ??
              _displayMajor,
          year:
              _profile?.yearLevel?.toString() ?? _currentTerm?.yearLevel ?? '—',
          gender: _displayGender,
          photo: _photo,
          onTap: _openStudentCard,
        ),
        if (_profileError != null) ...[
          const SizedBox(height: 7),
          Text(
            _profileError!,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 10, color: Color(0xFFD65D69)),
          ),
        ],
        const SizedBox(height: 16),
        SizedBox(
          height: 150,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 42,
                child: Term(
                  compact: true,
                  endTermMode: _workflow?.postFinal ?? false,
                  repository: _termRepository,
                  onTermChanged: (term) {
                    if (!mounted) return;
                    setState(() {
                      _currentTerm = term;
                      _scheduleVersion += 1;
                      _hasSavedGradeGoals = false;
                    });
                    if (_shouldLoadAlerts) unawaited(_loadAppAlerts());
                    unawaited(_loadWorkflow());
                    if (_shouldLoadGradeGoalStatus) {
                      unawaited(_loadGradeGoalStatus());
                    }
                    if (term == null) {
                      unawaited(_loadPendingEvaluation());
                    }
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 58,
                child: MainNotificationCard(
                  alerts: _activeAlerts,
                  now: _alertNow,
                  onTap: _openNotifications,
                ),
              ),
            ],
          ),
        ),
        if (_workflow != null &&
            ExamFlowNotice.shouldShow(_workflow!) &&
            !_workflow!.postFinal) ...[
          const SizedBox(height: 12),
          ExamFlowNotice(workflow: _workflow!, onReturn: _loadWorkflow),
        ],
        const SizedBox(height: 24),
        if (_workflow?.postFinal == true)
          BehaviorSummary(loadData: widget.behaviorSummaryLoader)
        else
          Schedule(
            key: ValueKey('schedule-$_scheduleVersion'),
            readOnly: _workflow?.phase == 'final_exam',
            repository: widget.tableRepository,
            constraint: _constraint,
            recommendationRepository: _shouldLoadRecommendations
                ? _recommendationRepository
                : null,
            onChanged: _shouldLoadAlerts
                ? () => unawaited(_loadAppAlerts())
                : null,
          ),
        if (_workflow?.postFinal != true &&
            _workflow?.phase != 'midterm_exam' &&
            _workflow?.phase != 'final_exam' &&
            _shouldLoadRecommendations &&
            _hasSavedGradeGoals) ...[
          const SizedBox(height: 24),
          RecommendationCard(
            repository: _recommendationRepository,
            constraint: _constraint,
            onAccepted: () {
              if (!mounted) return;
              setState(() => _scheduleVersion += 1);
              unawaited(_loadAppAlerts());
            },
          ),
        ],
      ],
    );
  }

  Future<void> _logout() async {
    if (_isLoggingOut) return;

    setState(() {
      _isLoggingOut = true;
    });

    try {
      final action = widget.logoutAction;
      if (action != null) {
        await action();
      } else {
        await _authService.logout();
      }
    } catch (_) {
      // Logging out locally and returning to login should still happen when
      // the backend is temporarily unavailable.
    }

    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return NotebookSectionPage(
      activeTab: NotebookTabId.main,
      postFinal: _workflow?.postFinal ?? false,
      hideHomeworkTab:
          _workflow?.phase == 'final_1w' || _workflow?.phase == 'final_exam',
      backgroundKey: const Key('main-background'),
      coverKey: const Key('main-notebook-cover'),
      paperKey: const Key('main-notebook-paper'),
      contentPadding: _isLoadingSession
          ? EdgeInsets.zero
          : const EdgeInsets.fromLTRB(12, 24, 12, 24),
      centerContent: _isLoadingSession,
      child: _isLoadingSession
          ? const CircularProgressIndicator(strokeWidth: 2)
          : AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: _buildNotebookContent(),
            ),
    );
  }
}

Future<({T? value, Object? error})> _capture<T>(Future<T> future) async {
  try {
    return (value: await future, error: null);
  } catch (error) {
    return (value: null, error: error);
  }
}
