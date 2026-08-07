// ignore_for_file: file_names

import 'dart:async';

import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import '../../interfaces/time.interface.dart';
import '../../services/time.service.dart';
import 'Component/FinishSessionPopup.dart';
import 'Component/SessionRecoveryPopup.dart';
import 'Component/StudyHistory.dart';
import 'Component/StudyStatistics.dart';
import 'Component/TimerPanel.dart';

class TimerPage extends StatefulWidget {
  final TimeRepository? repository;

  const TimerPage({super.key, this.repository});

  @override
  State<TimerPage> createState() => _TimerPageState();
}

class _TimerPageState extends State<TimerPage> with WidgetsBindingObserver {
  late final TimeRepository _repository;
  TimerSetup? _setup;
  StudyDashboard? _dashboard;
  StudySession? _activeSession;
  int? _selectedScheduleId;
  int? _selectedStudyTypeId;
  int _elapsedSeconds = 0;
  int _syncedElapsedSeconds = 0;
  DateTime _syncedAt = DateTime.now();
  Timer? _clockTimer;
  Timer? _heartbeatTimer;
  bool _isLoading = true;
  bool _busy = false;
  bool _requiresRecovery = false;
  bool _recoveryPopupOpen = false;
  bool _hardLimitSyncStarted = false;
  String? _pageError;
  String? _pageErrorCode;
  String? _actionError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _repository = widget.repository ?? TimeService();
    _loadTimerPage();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _clockTimer?.cancel();
    _heartbeatTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncActiveSession();
    }
  }

  Future<void> _loadTimerPage() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _pageError = null;
        _pageErrorCode = null;
      });
    }
    try {
      final results = await Future.wait<dynamic>([
        _repository.getSetup(),
        _repository.getActiveSession(),
        _repository.getDashboard(),
      ]);
      if (!mounted) return;
      final setup = results[0] as TimerSetup;
      final active = results[1] as ActiveStudySession;
      setState(() {
        _setup = setup;
        _dashboard = results[2] as StudyDashboard;
        _isLoading = false;
      });
      _applySession(active.session, recoveryRequired: active.requiresRecovery);
    } catch (error) {
      if (!mounted) return;
      final exception = error is TimeException ? error : null;
      setState(() {
        _pageError = '$error';
        _pageErrorCode = exception?.code;
        _isLoading = false;
      });
    }
  }

  void _applySession(StudySession? session, {bool recoveryRequired = false}) {
    _clockTimer?.cancel();
    _heartbeatTimer?.cancel();
    _hardLimitSyncStarted = false;
    if (!mounted) return;

    if (session == null || !session.isOpen) {
      setState(() {
        _activeSession = null;
        _requiresRecovery = false;
        _elapsedSeconds = 0;
        _syncedElapsedSeconds = 0;
        _syncedAt = DateTime.now();
      });
      return;
    }

    final needsRecovery =
        recoveryRequired ||
        session.isStale ||
        session.sessionStatus == 'interrupted';
    setState(() {
      _activeSession = session;
      _selectedScheduleId = session.scheduleTimeId;
      _selectedStudyTypeId = session.studyTypeId;
      _elapsedSeconds = session.elapsedSeconds;
      _syncedElapsedSeconds = session.elapsedSeconds;
      _syncedAt = DateTime.now();
      _requiresRecovery = needsRecovery;
    });

    if (session.sessionStatus == 'running' && !needsRecovery) {
      _startClock();
      _startHeartbeat();
    }
    if (needsRecovery) _scheduleRecoveryPopup();
  }

  void _startClock() {
    _clockTimer?.cancel();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final session = _activeSession;
      if (!mounted ||
          session == null ||
          session.sessionStatus != 'running' ||
          _requiresRecovery) {
        return;
      }
      final elapsed =
          _syncedElapsedSeconds +
          DateTime.now().difference(_syncedAt).inSeconds;
      final capped = elapsed.clamp(0, session.hardLimitSeconds);
      if (capped != _elapsedSeconds) setState(() => _elapsedSeconds = capped);
      if (capped >= session.hardLimitSeconds && !_hardLimitSyncStarted) {
        _hardLimitSyncStarted = true;
        _sendHeartbeat();
      }
    });
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _sendHeartbeat(),
    );
  }

  Future<void> _sendHeartbeat() async {
    final session = _activeSession;
    if (session == null ||
        session.sessionStatus != 'running' ||
        _requiresRecovery ||
        _busy) {
      return;
    }
    try {
      final latest = await _repository.heartbeatSession(
        session.studyTimeId,
        session.version,
      );
      if (mounted) _applySession(latest);
    } catch (error) {
      if (!mounted) return;
      _handleActionException(error);
    }
  }

  Future<void> _syncActiveSession() async {
    if (_isLoading || _busy) return;
    try {
      final active = await _repository.getActiveSession();
      if (mounted) {
        _applySession(
          active.session,
          recoveryRequired: active.requiresRecovery,
        );
      }
    } catch (error) {
      if (mounted) _setActionError('$error');
    }
  }

  Future<void> _startSession() async {
    final scheduleId = _selectedScheduleId;
    final studyTypeId = _selectedStudyTypeId;
    if (_busy || scheduleId == null || studyTypeId == null) return;
    setState(() {
      _busy = true;
      _actionError = null;
    });
    try {
      final session = await _repository.startSession(
        scheduleTimeId: scheduleId,
        studyTypeId: studyTypeId,
      );
      if (mounted) _applySession(session);
    } catch (error) {
      if (mounted) _handleActionException(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pauseSession() async {
    final session = _activeSession;
    if (_busy || session == null) return;
    await _runSessionAction(
      () => _repository.pauseSession(session.studyTimeId, session.version),
    );
  }

  Future<void> _resumeSession() async {
    final session = _activeSession;
    if (_busy || session == null) return;
    await _runSessionAction(
      () => _repository.resumeSession(session.studyTimeId, session.version),
    );
  }

  Future<void> _runSessionAction(Future<StudySession> Function() action) async {
    setState(() {
      _busy = true;
      _actionError = null;
    });
    try {
      final session = await action();
      if (mounted) _applySession(session);
    } catch (error) {
      if (mounted) _handleActionException(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestFinish() async {
    var session = _activeSession;
    if (_busy || session == null) return;
    final resumeAfterCancel = session.sessionStatus == 'running';
    if (resumeAfterCancel) {
      setState(() {
        _busy = true;
        _actionError = null;
      });
      try {
        session = await _repository.pauseSession(
          session.studyTimeId,
          session.version,
        );
        if (!mounted) return;
        _applySession(session);
      } catch (error) {
        if (mounted) _handleActionException(error);
        return;
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    }
    if (!mounted) return;
    final confirmed = await showFinishSessionPopup(
      context,
      elapsedSeconds: _elapsedSeconds,
      subjectName: session.subjectName,
    );
    if (!mounted) return;
    if (confirmed) {
      await _finishSession();
    } else if (resumeAfterCancel) {
      await _resumeSession();
    }
  }

  Future<void> _finishSession() async {
    final session = _activeSession;
    if (_busy || session == null) return;
    setState(() {
      _busy = true;
      _actionError = null;
    });
    try {
      final result = await _repository.finishSession(
        session.studyTimeId,
        session.version,
      );
      if (!mounted) return;
      _applySession(result);
      setState(() {
        _selectedScheduleId = null;
        _selectedStudyTypeId = null;
      });
      await _refreshDashboard();
    } catch (error) {
      if (mounted) _handleActionException(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refreshDashboard() async {
    try {
      final dashboard = await _repository.getDashboard();
      if (mounted) setState(() => _dashboard = dashboard);
    } catch (error) {
      if (mounted) _setActionError('$error');
    }
  }

  void _scheduleRecoveryPopup() {
    if (_recoveryPopupOpen || !_requiresRecovery || _activeSession == null) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _openRecoveryPopup();
    });
  }

  Future<void> _openRecoveryPopup() async {
    final session = _activeSession;
    if (_recoveryPopupOpen || !_requiresRecovery || session == null) return;
    _recoveryPopupOpen = true;
    final action = await showSessionRecoveryPopup(context, session: session);
    _recoveryPopupOpen = false;
    if (!mounted) return;
    setState(() {
      _busy = true;
      _actionError = null;
    });
    try {
      final result = await _repository.recoverSession(
        session.studyTimeId,
        session.version,
        action,
      );
      if (!mounted) return;
      final remainsOpen = result.isOpen;
      _applySession(result);
      if (!remainsOpen) {
        setState(() {
          _selectedScheduleId = null;
          _selectedStudyTypeId = null;
        });
        await _refreshDashboard();
      }
    } catch (error) {
      if (!mounted) return;
      _handleActionException(error);
      _scheduleRecoveryPopup();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _handleActionException(Object error) {
    if (error is TimeException && error.session != null) {
      _applySession(
        error.session,
        recoveryRequired:
            error.code == 'SESSION_HARD_LIMIT_REACHED' ||
            error.session!.isStale ||
            error.session!.sessionStatus == 'interrupted',
      );
    }
    _setActionError('$error');
  }

  void _setActionError(String message) {
    if (!mounted) return;
    setState(() => _actionError = message);
  }

  TimerPhase get _phase {
    final status = _activeSession?.sessionStatus;
    return switch (status) {
      'running' => TimerPhase.running,
      'paused' => TimerPhase.paused,
      'interrupted' => TimerPhase.interrupted,
      _ => TimerPhase.idle,
    };
  }

  @override
  Widget build(BuildContext context) {
    return NotebookSectionPage(
      activeTab: NotebookTabId.timer,
      contentKey: const Key('timer-page'),
      contentPadding: const EdgeInsets.fromLTRB(12, 22, 12, 30),
      centerContent: false,
      child: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const _TimerState(
        key: Key('timer-loading'),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(strokeWidth: 2.5),
            SizedBox(height: 10),
            Text('กำลังเตรียมหน้าจับเวลา...'),
          ],
        ),
      );
    }
    if (_pageError != null || _setup == null || _dashboard == null) {
      final noTerm = _pageErrorCode == 'NO_CURRENT_TERM';
      return _TimerState(
        key: const Key('timer-error'),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: Color(0xFFD5969D),
              size: 31,
            ),
            const SizedBox(height: 8),
            Text(
              noTerm ? 'ยังไม่มีเทอมปัจจุบัน' : 'โหลดข้อมูลไม่สำเร็จ',
              style: const TextStyle(
                fontSize: 15,
                color: Color(0xFF5D5055),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              noTerm
                  ? 'กรุณาสร้างเทอมและตารางเรียนในหน้า Main ก่อนเริ่มจับเวลา'
                  : _pageError ?? 'ไม่สามารถโหลดหน้าจับเวลาได้',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF95868B)),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _loadTimerPage,
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('ลองอีกครั้ง'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF8FC8EA),
                shape: const StadiumBorder(),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TimerPanel(
          subjects: _setup!.subjects,
          studyTypes: _setup!.studyTypes,
          selectedScheduleId: _selectedScheduleId,
          selectedStudyTypeId: _selectedStudyTypeId,
          phase: _phase,
          elapsedSeconds: _elapsedSeconds,
          busy: _busy,
          onSubjectChanged: (value) {
            setState(() => _selectedScheduleId = value);
          },
          onStudyTypeChanged: (value) {
            setState(() => _selectedStudyTypeId = value);
          },
          onStart: _startSession,
          onPause: _pauseSession,
          onResume: _resumeSession,
          onFinish: _requestFinish,
        ),
        if (_actionError != null) ...[
          const SizedBox(height: 9),
          Container(
            key: const Key('timer-action-error'),
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF0F1),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Text(
              _actionError!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, color: Color(0xFFB84E5C)),
            ),
          ),
        ],
        const SizedBox(height: 14),
        StudyStatistics(dashboard: _dashboard!),
        const SizedBox(height: 14),
        StudyHistory(dashboard: _dashboard!),
        const SizedBox(height: 20),
      ],
    );
  }
}

class _TimerState extends StatelessWidget {
  final Widget child;

  const _TimerState({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 360),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(20),
      child: DefaultTextStyle(
        style: const TextStyle(fontSize: 12, color: Color(0xFF7897AC)),
        child: child,
      ),
    );
  }
}
