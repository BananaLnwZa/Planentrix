import 'package:flutter/material.dart';

import '../../interfaces/auth.interface.dart';
import '../../services/auth.service.dart';
import '../Main/MainPage.dart';
import 'LogInPage.dart';

/// Select the first page only after checking the securely stored mobile session.
class SessionGate extends StatefulWidget {
  final Future<UserSession?> Function()? sessionLoader;
  final WidgetBuilder? authenticatedBuilder;
  final WidgetBuilder? unauthenticatedBuilder;

  const SessionGate({
    super.key,
    this.sessionLoader,
    this.authenticatedBuilder,
    this.unauthenticatedBuilder,
  });

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  late final Future<UserSession?> _sessionFuture;

  @override
  void initState() {
    super.initState();
    _sessionFuture =
        (widget.sessionLoader ?? AuthService().getCurrentSession)();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<UserSession?>(
    future: _sessionFuture,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Scaffold(
          body: Center(child: CircularProgressIndicator(strokeWidth: 2)),
        );
      }
      if (snapshot.hasData) {
        return widget.authenticatedBuilder?.call(context) ?? const MainPage();
      }
      return widget.unauthenticatedBuilder?.call(context) ?? const LoginPage();
    },
  );
}
