import 'package:flutter/material.dart';

import '../../services/auth.service.dart';
import '../../services/storage.service.dart';
import '../../services/term.service.dart';
import '../../interfaces/term.interface.dart';
import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import 'Component/Schedule.dart';
import 'Component/StudentCard.dart';
import 'Component/StudentCardPopup.dart';
import 'Component/Term.dart';

typedef LogoutAction = Future<void> Function();

class MainPage extends StatefulWidget {
  final LogoutAction? logoutAction;
  final String? username;
  final int? userId;
  final TermRepository? termRepository;

  const MainPage({
    super.key,
    this.logoutAction,
    this.username,
    this.userId,
    this.termRepository,
  });

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();

  String? _username;
  int? _userId;
  bool _isLoadingSession = true;
  bool _isLoggingOut = false;
  CurrentTerm? _currentTerm;

  @override
  void initState() {
    super.initState();
    if (widget.username != null) {
      _username = widget.username;
      _userId = widget.userId;
      _isLoadingSession = false;
      return;
    }
    _loadSession();
  }

  Future<void> _loadSession() async {
    String? username;
    int? userId;
    try {
      final session = await _storageService.getSession();
      username = session?.username;
      userId = session?.userId;
    } catch (_) {
      username = null;
    }

    if (!mounted) return;

    setState(() {
      _username = username;
      _userId = userId;
      _isLoadingSession = false;
    });
  }

  String get _displayName => _username ?? 'Student';

  String get _displayStudentNumber => (_userId ?? 1).toString().padLeft(2, '0');

  void _openStudentCard() {
    showStudentCardPopup(
      context,
      name: _displayName,
      studentNumber: _displayStudentNumber,
      year: _currentTerm?.yearLevel ?? '—',
      onLogout: _logout,
    );
  }

  Widget _buildNotebookContent() {
    return Column(
      key: const ValueKey('main-tab-content'),
      children: [
        StudentCard(
          name: _displayName,
          studentNumber: _displayStudentNumber,
          year: _currentTerm?.yearLevel ?? '—',
          onTap: _openStudentCard,
        ),
        const SizedBox(height: 24),
        Term(
          repository: widget.termRepository,
          onTermChanged: (term) {
            if (!mounted || _currentTerm == term) return;
            setState(() => _currentTerm = term);
          },
        ),
        const SizedBox(height: 24),
        const Schedule(),
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
