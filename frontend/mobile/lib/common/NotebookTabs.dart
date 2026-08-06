import 'package:flutter/material.dart';

enum NotebookTabId { main, score, homework, timer, test }

String notebookTabRoute(NotebookTabId tab) {
  return switch (tab) {
    NotebookTabId.main => '/main',
    NotebookTabId.score => '/score',
    NotebookTabId.homework => '/homework',
    NotebookTabId.timer => '/timer',
    NotebookTabId.test => '/test',
  };
}

class NotebookTabs extends StatelessWidget {
  final NotebookTabId activeTab;
  final ValueChanged<NotebookTabId> onTabChange;

  const NotebookTabs({
    super.key,
    required this.activeTab,
    required this.onTabChange,
  });

  static const _tabs = [
    _NotebookTabData(
      id: NotebookTabId.main,
      label: 'Main',
      color: Color.fromARGB(255, 250, 218, 130),
    ),
    _NotebookTabData(
      id: NotebookTabId.score,
      label: 'Score',
      color: Color(0xFFFF98D6),
    ),
    _NotebookTabData(
      id: NotebookTabId.homework,
      label: 'Homework',
      color: Color(0xFFD7B7F3),
    ),
    _NotebookTabData(
      id: NotebookTabId.timer,
      label: 'Timer',
      color: Color(0xFFFCC3A8),
    ),
    _NotebookTabData(
      id: NotebookTabId.test,
      label: 'Test',
      color: Color(0xFFBFE69B),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Main notebook sections',
      child: SizedBox(
        key: const Key('notebook-tabs'),
        height: 42,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (final tab in _tabs)
              Expanded(
                child: _NotebookTab(
                  data: tab,
                  isActive: tab.id == activeTab,
                  onTap: () => onTabChange(tab.id),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NotebookTab extends StatelessWidget {
  final _NotebookTabData data;
  final bool isActive;
  final VoidCallback onTap;

  const _NotebookTab({
    required this.data,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: isActive,
      label: data.label.replaceAll('\n', ' '),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 1.5),
        child: AnimatedContainer(
          key: Key('notebook-tab-container-${data.id.name}'),
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
          height: 42,
          decoration: BoxDecoration(
            color: data.color,
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(7),
              bottomRight: Radius.circular(7),
            ),
            border: Border.all(
              color: isActive
                  ? Colors.white.withValues(alpha: 0.85)
                  : Colors.black.withValues(alpha: 0.08),
              width: isActive ? 1.5 : 1,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x3D4B4B4B),
                blurRadius: 7,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              key: Key('notebook-tab-${data.id.name}'),
              onTap: onTap,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(7),
                bottomRight: Radius.circular(7),
              ),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      data.label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isActive
                            ? Colors.white
                            : const Color(0xFF3F3F3F),
                        fontSize: 10.5,
                        fontWeight: FontWeight.w400,
                        height: 1,
                        shadows: isActive
                            ? const [
                                Shadow(
                                  color: Color(0x4D555555),
                                  offset: Offset(0, 1),
                                  blurRadius: 2,
                                ),
                              ]
                            : null,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NotebookTabData {
  final NotebookTabId id;
  final String label;
  final Color color;

  const _NotebookTabData({
    required this.id,
    required this.label,
    required this.color,
  });
}
