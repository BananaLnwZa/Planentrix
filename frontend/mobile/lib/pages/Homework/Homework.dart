import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';
import '../../common/HomeworkTimeFormat.dart';
import '../../interfaces/homework.interface.dart';
import '../../services/homework.service.dart';
import 'Component/AddHomeworkPopup.dart';
import 'Component/AddHomeworkButton.dart';
import 'Component/HomeworkSection.dart';
import 'Component/HomeworkDetailsPopup.dart';

class HomeworkPage extends StatefulWidget {
  final HomeworkRepository? repository;
  final DateTime Function()? now;
  final VoidCallback? onAddHomework;
  final ValueChanged<HomeworkTaskData>? onSubmitHomework;

  const HomeworkPage({
    super.key,
    this.repository,
    this.now,
    this.onAddHomework,
    this.onSubmitHomework,
  });

  @override
  State<HomeworkPage> createState() => _HomeworkPageState();
}

class _HomeworkPageState extends State<HomeworkPage> {
  late final HomeworkRepository _repository;
  List<HomeworkTaskData> _tasks = const [];
  bool _isLoading = true;
  int? _submittingWorkloadId;
  bool _isAdding = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? HomeworkService();
    _loadHomework();
  }

  Future<void> _loadHomework() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final tasks = await _repository.getPendingHomework();
      if (!mounted) return;
      setState(() {
        _tasks = tasks;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isLoading = false;
      });
    }
  }

  Future<void> _submitHomework(HomeworkTaskData task) async {
    if (_submittingWorkloadId != null) return;
    setState(() => _submittingWorkloadId = task.workloadId);
    try {
      await _repository.finishHomework(task.workloadId);
      if (!mounted) return;
      setState(() {
        _tasks = _tasks
            .where((item) => item.workloadId != task.workloadId)
            .toList();
      });
      widget.onSubmitHomework?.call(task);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text('$error'),
              behavior: SnackBarBehavior.floating,
            ),
          );
      }
    } finally {
      if (mounted) setState(() => _submittingWorkloadId = null);
    }
  }

  Future<void> _addHomework() async {
    if (widget.onAddHomework != null) {
      widget.onAddHomework!.call();
      return;
    }
    if (_isAdding) return;
    setState(() => _isAdding = true);
    try {
      final subjects = await _repository.getSubjects();
      if (!mounted) return;
      if (subjects.isEmpty) {
        throw const HomeworkException(
          'ยังไม่มีรายวิชาในเทอมปัจจุบัน กรุณาสร้างตารางเรียนก่อน',
        );
      }
      final input = await showAddHomeworkPopup(context, subjects: subjects);
      if (input == null || !mounted) return;
      final created = await _repository.createHomework(input);
      if (!mounted) return;
      setState(() => _tasks = [..._tasks, created]);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text('$error'),
              behavior: SnackBarBehavior.floating,
            ),
          );
      }
    } finally {
      if (mounted) setState(() => _isAdding = false);
    }
  }

  Future<void> _openHomeworkDetails(HomeworkTaskData task) async {
    final updated = await showHomeworkDetailsPopup(
      context,
      task: task,
      onSave: (input) => _repository.updateHomework(task, input),
      onDelete: () async {
        await _repository.deleteHomework(task.workloadId);
        if (!mounted) return;
        setState(() {
          _tasks = _tasks
              .where((item) => item.workloadId != task.workloadId)
              .toList();
        });
      },
    );
    if (updated == null || !mounted) return;
    setState(() {
      _tasks = _tasks
          .map((item) => item.workloadId == updated.workloadId ? updated : item)
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final now = widget.now?.call() ?? DateTime.now();
    return NotebookSectionPage(
      activeTab: NotebookTabId.homework,
      contentKey: const Key('homework-page'),
      centerContent: false,
      child: _HomeworkContent(
        groups: groupHomeworkTasks(_tasks, now),
        isLoading: _isLoading,
        error: _error,
        submittingWorkloadId: _submittingWorkloadId,
        onRetry: _loadHomework,
        onAddHomework: _addHomework,
        onSubmitHomework: _submitHomework,
        onOpenHomeworkDetails: _openHomeworkDetails,
      ),
    );
  }
}

class _HomeworkContent extends StatelessWidget {
  final List<HomeworkSectionData> groups;
  final bool isLoading;
  final String? error;
  final int? submittingWorkloadId;
  final VoidCallback onRetry;
  final VoidCallback onAddHomework;
  final ValueChanged<HomeworkTaskData> onSubmitHomework;
  final ValueChanged<HomeworkTaskData> onOpenHomeworkDetails;

  const _HomeworkContent({
    required this.groups,
    required this.isLoading,
    required this.error,
    required this.submittingWorkloadId,
    required this.onRetry,
    required this.onAddHomework,
    required this.onSubmitHomework,
    required this.onOpenHomeworkDetails,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = constraints.maxWidth / 319;
        return Padding(
          padding: EdgeInsets.only(top: 19 * scale, bottom: 24 * scale),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: EdgeInsets.only(left: 23 * scale),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: AddHomeworkButton(
                    scale: scale,
                    onPressed: onAddHomework,
                  ),
                ),
              ),
              SizedBox(height: 23 * scale),
              if (isLoading)
                const _HomeworkState(
                  key: Key('homework-loading'),
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                )
              else if (error != null)
                _HomeworkState(
                  key: const Key('homework-error'),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        color: Color(0xFFE56B8A),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFF7893A2),
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: onRetry,
                        child: const Text('ลองใหม่'),
                      ),
                    ],
                  ),
                )
              else if (groups.isEmpty)
                const _HomeworkState(
                  key: Key('homework-empty'),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.task_alt_rounded,
                        size: 30,
                        color: Color(0xFF7FC29D),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'ส่งงานครบแล้ว',
                        style: TextStyle(
                          color: Color(0xFF668396),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                )
              else
                for (var index = 0; index < groups.length; index++)
                  HomeworkSection(
                    index: index,
                    data: groups[index],
                    scale: scale,
                    submittingWorkloadId: submittingWorkloadId,
                    onSubmit: onSubmitHomework,
                    onOpenDetails: onOpenHomeworkDetails,
                  ),
            ],
          ),
        );
      },
    );
  }
}

class _HomeworkState extends StatelessWidget {
  final Widget child;

  const _HomeworkState({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      constraints: const BoxConstraints(minHeight: 130),
      alignment: Alignment.center,
      child: child,
    );
  }
}

List<HomeworkSectionData> groupHomeworkTasks(
  List<HomeworkTaskData> tasks,
  DateTime now,
) {
  final sorted = [...tasks]
    ..sort((left, right) => left.deadline.compareTo(right.deadline));
  final tomorrow = DateTime(now.year, now.month, now.day + 1);
  final tomorrowTasks = <HomeworkTaskData>[];
  final overdueTasks = <HomeworkTaskData>[];
  final datedTasks = <DateTime, List<HomeworkTaskData>>{};

  for (final task in sorted) {
    final day = DateTime(
      task.deadline.year,
      task.deadline.month,
      task.deadline.day,
    );
    if (task.deadline.isBefore(now)) {
      overdueTasks.add(task);
    } else if (day == tomorrow) {
      tomorrowTasks.add(task);
    } else {
      datedTasks.putIfAbsent(day, () => []).add(task);
    }
  }

  final groups = <HomeworkSectionData>[];
  if (tomorrowTasks.isNotEmpty) {
    groups.add(
      HomeworkSectionData(
        title: 'ส่งพรุ่งนี้',
        type: HomeworkSectionType.tomorrow,
        spacingAfter: 14,
        tasks: tomorrowTasks,
      ),
    );
  }
  for (final entry in datedTasks.entries) {
    groups.add(
      HomeworkSectionData(
        title: formatHomeworkDisplayDate(entry.key),
        type: HomeworkSectionType.date,
        spacingAfter: 14,
        tasks: entry.value,
      ),
    );
  }
  if (overdueTasks.isNotEmpty) {
    groups.add(
      HomeworkSectionData(
        title: 'ล่าช้า',
        type: HomeworkSectionType.overdue,
        tasks: overdueTasks,
      ),
    );
  }
  return groups;
}
