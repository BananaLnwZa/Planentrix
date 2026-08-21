import 'package:flutter/material.dart';

import '../../../interfaces/homework.interface.dart';

Future<void> showHomeworkReminderPopup(
  BuildContext context, {
  required List<HomeworkTaskData> tasks,
  VoidCallback? onViewAll,
}) {
  return showDialog<void>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.32),
    builder: (_) => _HomeworkReminderPopup(tasks: tasks, onViewAll: onViewAll),
  );
}

class _HomeworkReminderPopup extends StatelessWidget {
  final List<HomeworkTaskData> tasks;
  final VoidCallback? onViewAll;

  const _HomeworkReminderPopup({required this.tasks, this.onViewAll});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('main-homework-reminder-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 22, vertical: 28),
      backgroundColor: const Color(0xFFFEFBEA),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(26),
        side: const BorderSide(color: Color(0xFFE5A9B8)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 390, maxHeight: 570),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  key: const Key('close-homework-reminder-popup'),
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: const Color(0xFF8D6070),
                  tooltip: 'ปิด',
                ),
              ),
              Container(
                width: 54,
                height: 54,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFE4EC),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.notifications_active_outlined,
                  size: 28,
                  color: Color(0xFFB85E7D),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'งานใกล้ถึงกำหนดส่ง',
                style: TextStyle(
                  color: Color(0xFF7C4157),
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'เหลือเวลาไม่เกิน 1 วัน จำนวน ${tasks.length} งาน',
                style: const TextStyle(color: Color(0xFF936879), fontSize: 11),
              ),
              const SizedBox(height: 16),
              Flexible(
                child: ListView.separated(
                  key: const Key('main-homework-reminder-list'),
                  shrinkWrap: true,
                  itemCount: tasks.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _HomeworkReminderItem(task: tasks[index], index: index),
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 9,
                runSpacing: 8,
                children: [
                  if (onViewAll != null)
                    FilledButton(
                      key: const Key('view-all-homework-button'),
                      onPressed: onViewAll,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF6B9CC),
                        foregroundColor: const Color(0xFF794257),
                        shape: const StadiumBorder(),
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                      ),
                      child: const Text(
                        'ดูงานทั้งหมด',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  OutlinedButton(
                    key: const Key('acknowledge-homework-button'),
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF6B5F63),
                      side: const BorderSide(color: Color(0xFFC8B9BE)),
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                    ),
                    child: const Text(
                      'รับทราบ',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeworkReminderItem extends StatelessWidget {
  final HomeworkTaskData task;
  final int index;

  const _HomeworkReminderItem({required this.task, required this.index});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: Key('main-homework-reminder-item-$index'),
      width: double.infinity,
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8CDD5)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F4B5D66),
            blurRadius: 5,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'วิชา',
            style: TextStyle(fontSize: 10, color: Color(0xFF8A9DA6)),
          ),
          Text(
            task.subject.isEmpty ? 'ไม่ระบุวิชา' : task.subject,
            key: Key('main-homework-reminder-subject-$index'),
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF426273),
              fontWeight: FontWeight.w600,
            ),
          ),
          const Divider(height: 15, color: Color(0xFFF2E2E7)),
          const Text(
            'ชื่องาน',
            style: TextStyle(fontSize: 10, color: Color(0xFF8A9DA6)),
          ),
          Text(
            task.assignment,
            key: Key('main-homework-reminder-name-$index'),
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF6E4856),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 16,
                color: Color(0xFFA0526E),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'กำหนดส่ง ${task.dueDate} เวลา ${task.dueTime} น.',
                  key: Key('main-homework-reminder-deadline-$index'),
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFFA0526E),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
