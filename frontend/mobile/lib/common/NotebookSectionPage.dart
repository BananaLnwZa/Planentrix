import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'NotebookTabs.dart';
import '../interfaces/term.interface.dart';
import '../services/term.service.dart';

class NotebookSectionPage extends StatefulWidget {
  final NotebookTabId activeTab;
  final String? title;
  final Widget? child;
  final Key? contentKey;
  final Key? backgroundKey;
  final Key? coverKey;
  final Key? paperKey;
  final EdgeInsetsGeometry contentPadding;
  final bool centerContent;
  final bool hideScrollbar;
  final bool postFinal;
  final Future<TermWorkflow?> Function()? workflowLoader;

  const NotebookSectionPage({
    super.key,
    required this.activeTab,
    this.title,
    this.child,
    this.contentKey,
    this.backgroundKey,
    this.coverKey,
    this.paperKey,
    this.contentPadding = EdgeInsets.zero,
    this.centerContent = true,
    this.hideScrollbar = false,
    this.postFinal = false,
    this.workflowLoader,
  }) : assert(title != null || child != null);

  @override
  State<NotebookSectionPage> createState() => _NotebookSectionPageState();
}

class _NotebookSectionPageState extends State<NotebookSectionPage>
    with WidgetsBindingObserver {
  bool _redirectingPostFinal = false;
  bool _checkingPostFinal = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.activeTab != NotebookTabId.main) {
      _checkPostFinal();
    }
  }

  Future<void> _checkPostFinal() async {
    if (_checkingPostFinal || _redirectingPostFinal) return;
    _checkingPostFinal = true;
    try {
      final workflow =
          await (widget.workflowLoader?.call() ?? TermService().getWorkflow());
      if (!mounted || workflow?.postFinal != true) return;
      setState(() => _redirectingPostFinal = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pushReplacementNamed('/main');
      });
    } catch (_) {
      // Keep the existing page usable if the workflow service is unavailable.
    } finally {
      _checkingPostFinal = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        widget.activeTab != NotebookTabId.main) {
      _checkPostFinal();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _changeTab(BuildContext context, NotebookTabId tab) {
    if (tab == widget.activeTab) return;
    Navigator.of(context).pushReplacementNamed(notebookTabRoute(tab));
  }

  @override
  Widget build(BuildContext context) {
    final pageContent = KeyedSubtree(
      key: widget.contentKey,
      child: _redirectingPostFinal
          ? const Text(
              'สิ้นสุดเทอมแล้ว กำลังเปิดหน้าสรุปพฤติกรรมการเรียน...',
              textAlign: TextAlign.center,
            )
          : widget.child ??
                Text(
                  widget.title!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF7897AC),
                    fontSize: 25,
                  ),
                ),
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        key:
            widget.backgroundKey ??
            Key('notebook-background-${widget.activeTab.name}'),
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
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Align(
                  alignment: Alignment.topCenter,
                  child: SizedBox(
                    width: math.min(constraints.maxWidth, 420),
                    height: constraints.maxHeight,
                    child: Stack(
                      children: [
                        Positioned(
                          left: 0,
                          right: 0,
                          top: 0,
                          bottom: widget.postFinal || _redirectingPostFinal
                              ? 0
                              : 42,
                          child: Container(
                            key:
                                widget.coverKey ??
                                Key('notebook-cover-${widget.activeTab.name}'),
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
                              key:
                                  widget.paperKey ??
                                  Key(
                                    'notebook-paper-${widget.activeTab.name}',
                                  ),
                              width: double.infinity,
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
                              clipBehavior: Clip.antiAlias,
                              child: LayoutBuilder(
                                builder: (context, paperConstraints) {
                                  final padding = widget.contentPadding.resolve(
                                    Directionality.of(context),
                                  );
                                  final minimumContentHeight = math.max(
                                    0.0,
                                    paperConstraints.maxHeight -
                                        padding.vertical,
                                  );

                                  final contentScroll = SingleChildScrollView(
                                    key: Key(
                                      'notebook-content-scroll-${widget.activeTab.name}',
                                    ),
                                    padding: padding,
                                    child: ConstrainedBox(
                                      constraints: BoxConstraints(
                                        minHeight: minimumContentHeight,
                                      ),
                                      child: widget.centerContent
                                          ? Center(child: pageContent)
                                          : pageContent,
                                    ),
                                  );
                                  if (!widget.hideScrollbar)
                                    return contentScroll;
                                  return ScrollConfiguration(
                                    behavior: ScrollConfiguration.of(
                                      context,
                                    ).copyWith(scrollbars: false),
                                    child: contentScroll,
                                  );
                                },
                              ),
                            ),
                          ),
                        ),
                        if (!widget.postFinal && !_redirectingPostFinal)
                          Positioned(
                            left: 28,
                            right: 28,
                            bottom: 10,
                            child: NotebookTabs(
                              activeTab: widget.activeTab,
                              onTabChange: (tab) => _changeTab(context, tab),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
