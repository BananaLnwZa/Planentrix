import 'package:flutter/material.dart';

import 'NotebookTabs.dart';

class NotebookSectionPage extends StatelessWidget {
  final NotebookTabId activeTab;
  final String title;
  final Key? contentKey;

  const NotebookSectionPage({
    super.key,
    required this.activeTab,
    required this.title,
    this.contentKey,
  });

  void _changeTab(BuildContext context, NotebookTabId tab) {
    if (tab == activeTab) return;
    Navigator.of(context).pushReplacementNamed(notebookTabRoute(tab));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 68),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Stack(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 42),
                      child: Container(
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
                          border: Border.all(color: const Color(0xFFE1B6C5)),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x426A4E42),
                              blurRadius: 24,
                              offset: Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Container(
                          key: contentKey,
                          width: double.infinity,
                          height: 520,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEFBEA),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE8DDD3)),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x246A4E42),
                                blurRadius: 16,
                                offset: Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Text(
                            title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFF7897AC),
                              fontSize: 25,
                            ),
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
            ),
          ),
        ),
      ),
    );
  }
}
