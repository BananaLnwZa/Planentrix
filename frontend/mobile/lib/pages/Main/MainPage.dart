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
import '../../common/DateTimeFormat.dart';
import 'Component/Schedule.dart';
import 'Component/EditProfilePopup.dart';
import 'Component/StudentCard.dart';
import 'Component/StudentCardPopup.dart';
import 'Component/Term.dart';
import 'Component/MainNotificationCard.dart';
import 'Component/MainNotificationPopup.dart';
import 'Component/RecommendationCard.dart';

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
  });

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();
  late final ProfileRepository _profileRepository;
  late final HomeworkRepository _homeworkRepository;
  late final RecommendationRepository _recommendationRepository;
  late final TableRepository _tableRepository;
  late final ExamRepository _examRepository;

  String? _username;
  int? _userId;
  bool _isLoadingSession = true;
  bool _isLoggingOut = false;
  CurrentTerm? _currentTerm;
  UserProfile? _profile;
  UserConstraint? _constraint;
  String? _profileError;
  int _scheduleVersion = 0;
  List<AppAlertData> _alertEvents = const [];
  List<AppAlertData> _activeAlerts = const [];
  DateTime _alertNow = DateTime.now();
  Timer? _alertClock;

  @override
  void initState() {
    super.initState();
    _profileRepository = widget.profileRepository ?? ProfileService();
    _homeworkRepository = widget.homeworkRepository ?? HomeworkService();
    _recommendationRepository =
        widget.recommendationRepository ?? RecommendationService();
    _tableRepository = widget.tableRepository ?? TableService();
    _examRepository = widget.examRepository ?? ExamService();
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
    _alertClock?.cancel();
    super.dispose();
  }

  String get _displayName => _username ?? 'Student';

  String get _displayStudentNumber => (_userId ?? 1).toString().padLeft(2, '0');

  String get _displayGender {
    final value = _profile?.gender;
    if (value == null || value.isEmpty) return '—';
    return '${value[0].toUpperCase()}${value.substring(1)}';
  }

  String get _displayBirthdate {
    final date = _profile?.birthdate;
    if (date == null) return '—';
    return formatDisplayDate(date);
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
      studentNumber: _displayStudentNumber,
      gender: _displayGender,
      year: _currentTerm?.yearLevel ?? '—',
      birthDate: _displayBirthdate,
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
      onDeleteProfile: () {
        Navigator.of(context).pop();
        Future<void>.delayed(Duration.zero, _confirmDeleteProfile);
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

  Future<void> _confirmDeleteProfile() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        key: const Key('delete-profile-confirmation'),
        title: const Text('ลบโปรไฟล์ถาวร?'),
        content: const Text('เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลบัญชีได้'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            key: const Key('confirm-delete-profile'),
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFE65D84),
            ),
            child: const Text('ลบโปรไฟล์'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await _authService.deleteAccount();
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
          studentNumber: _displayStudentNumber,
          year: _currentTerm?.yearLevel ?? '—',
          gender: _displayGender,
          birthDate: _displayBirthdate,
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
                  repository: widget.termRepository,
                  onTermChanged: (term) {
                    if (!mounted) return;
                    setState(() {
                      _currentTerm = term;
                      _scheduleVersion += 1;
                    });
                    if (_shouldLoadAlerts) unawaited(_loadAppAlerts());
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
        const SizedBox(height: 24),
        Schedule(
          key: ValueKey('schedule-$_scheduleVersion'),
          repository: widget.tableRepository,
          constraint: _constraint,
          recommendationRepository: _shouldLoadRecommendations
              ? _recommendationRepository
              : null,
          onChanged: _shouldLoadAlerts
              ? () => unawaited(_loadAppAlerts())
              : null,
        ),
        if (_shouldLoadRecommendations) ...[
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
