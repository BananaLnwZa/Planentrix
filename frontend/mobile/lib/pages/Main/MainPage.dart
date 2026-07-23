import 'package:flutter/material.dart';

import '../../services/auth.service.dart';
import '../../services/storage.service.dart';

typedef LogoutAction = Future<void> Function();

class MainPage extends StatefulWidget {
  final LogoutAction? logoutAction;
  final String? username;

  const MainPage({super.key, this.logoutAction, this.username});

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();

  String? _username;
  bool _isLoadingSession = true;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    if (widget.username != null) {
      _username = widget.username;
      _isLoadingSession = false;
      return;
    }
    _loadSession();
  }

  Future<void> _loadSession() async {
    String? username;
    try {
      final session = await _storageService.getSession();
      username = session?.username;
    } catch (_) {
      username = null;
    }

    if (!mounted) return;

    setState(() {
      _username = username;
      _isLoadingSession = false;
    });
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
      backgroundColor: const Color(0xFFF3F8FE),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Planentrix'),
        backgroundColor: const Color(0xFF9CC5F9),
        foregroundColor: Colors.black87,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Card(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      color: Color(0xFF2E7D32),
                      size: 72,
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Login successful',
                      key: Key('login-success-message'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_isLoadingSession)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      Text(
                        _username == null
                            ? 'You are signed in.'
                            : 'Welcome, $_username',
                        key: const Key('current-user'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.black54,
                          fontSize: 16,
                        ),
                      ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: 150,
                      height: 44,
                      child: ElevatedButton(
                        key: const Key('logout-button'),
                        onPressed: _isLoggingOut ? null : _logout,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF9CC5F9),
                          foregroundColor: Colors.black87,
                        ),
                        child: _isLoggingOut
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black54,
                                ),
                              )
                            : const Text('Logout'),
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
