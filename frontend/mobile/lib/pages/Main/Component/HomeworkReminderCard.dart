import 'package:flutter/material.dart';

import '../../../interfaces/homework.interface.dart';

class HomeworkReminderCard extends StatelessWidget {
  final List<HomeworkTaskData> tasks;
  final VoidCallback? onTap;

  const HomeworkReminderCard({super.key, required this.tasks, this.onTap});

  @override
  Widget build(BuildContext context) {
    final firstTask = tasks.first;
    return Material(
      key: const Key('main-homework-reminder-card'),
      color: const Color(0xFFFFF0F4),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(13),
        side: const BorderSide(color: Color(0xFFE5A9B8)),
      ),
      elevation: 3,
      shadowColor: const Color(0x384B5D66),
      child: InkWell(
        key: const Key('main-homework-reminder-button'),
        onTap: onTap,
        child: SizedBox(
          width: double.infinity,
          height: 62,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFDCE7),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.notifications_active_outlined,
                    size: 20,
                    color: Color(0xFFB85E7D),
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'งานใกล้ส่ง ${tasks.length} งาน',
                        key: const Key('main-homework-reminder-title'),
                        style: const TextStyle(
                          color: Color(0xFF8D4560),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${firstTask.subject} • ${firstTask.assignment} • ${firstTask.dueTime} น.',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF9A6477),
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFFB85E7D),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
