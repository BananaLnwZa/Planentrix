import 'package:flutter/material.dart';

import '../../services/auth.service.dart';
import '../../services/storage.service.dart';
import '../../services/term.service.dart';
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
      onLogout: _logout,
    );
  }

  void _changeTab(NotebookTabId tab) {
    if (tab == NotebookTabId.main) return;
    Navigator.of(context).pushReplacementNamed(notebookTabRoute(tab));
  }

  Widget _buildNotebookContent() {
    return Column(
      key: const ValueKey('main-tab-content'),
      children: [
        StudentCard(
          name: _displayName,
          studentNumber: _displayStudentNumber,
          onTap: _openStudentCard,
        ),
        const SizedBox(height: 24),
        Term(repository: widget.termRepository),
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
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        key: const Key('main-background'),
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/bg.png'),
            fit: BoxFit.cover,
            alignment: Alignment.center,
          ),
        ),
        child: SafeArea(
          child: _isLoadingSession
              ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 68),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Stack(
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(bottom: 42),
                            child: Container(
                              key: const Key('main-notebook-cover'),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    Color(0xFFF8DDE5),
                                    Color(0xFFF3CCD8),
                                    Color(0xFFEABCCA),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(28),
                                border: Border.all(
                                  color: const Color(0xFFE1B6C5),
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x426A4E42),
                                    blurRadius: 24,
                                    offset: Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: Container(
                                key: const Key('main-notebook-paper'),
                                width: double.infinity,
                                padding: const EdgeInsets.fromLTRB(
                                  12,
                                  24,
                                  12,
                                  24,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEFBEA),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: const Color(0xFFE8DDD3),
                                  ),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x246A4E42),
                                      blurRadius: 16,
                                      offset: Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 220),
                                  child: _buildNotebookContent(),
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            left: 28,
                            right: 28,
                            bottom: 10,
                            child: NotebookTabs(
                              activeTab: NotebookTabId.main,
                              onTabChange: _changeTab,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}
