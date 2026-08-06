import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'NotebookTabs.dart';

class NotebookSectionPage extends StatelessWidget {
  final NotebookTabId activeTab;
  final String? title;
  final Widget? child;
  final Key? contentKey;
  final Key? backgroundKey;
  final Key? coverKey;
  final Key? paperKey;
  final EdgeInsetsGeometry contentPadding;
  final bool centerContent;

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
  }) : assert(title != null || child != null);

  void _changeTab(BuildContext context, NotebookTabId tab) {
    if (tab == activeTab) return;
    Navigator.of(context).pushReplacementNamed(notebookTabRoute(tab));
  }

  @override
  Widget build(BuildContext context) {
    final pageContent = KeyedSubtree(
      key: contentKey,
      child:
          child ??
          Text(
            title!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF7897AC), fontSize: 25),
          ),
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        key: backgroundKey ?? Key('notebook-background-${activeTab.name}'),
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
                          bottom: 42,
                          child: Container(
                            key:
                                coverKey ??
                                Key('notebook-cover-${activeTab.name}'),
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
                                  paperKey ??
                                  Key('notebook-paper-${activeTab.name}'),
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
                                  final padding = contentPadding.resolve(
                                    Directionality.of(context),
                                  );
                                  final minimumContentHeight = math.max(
                                    0.0,
                                    paperConstraints.maxHeight -
                                        padding.vertical,
                                  );

                                  return SingleChildScrollView(
                                    key: Key(
                                      'notebook-content-scroll-${activeTab.name}',
                                    ),
                                    padding: padding,
                                    child: ConstrainedBox(
                                      constraints: BoxConstraints(
                                        minHeight: minimumContentHeight,
                                      ),
                                      child: centerContent
                                          ? Center(child: pageContent)
                                          : pageContent,
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          left: 28,
                          right: 28,
                          bottom: 10,
                          child: NotebookTabs(
                            activeTab: activeTab,
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
