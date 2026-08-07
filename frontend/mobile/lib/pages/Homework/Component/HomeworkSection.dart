import 'package:flutter/material.dart';

import '../../../interfaces/homework.interface.dart';
import 'HomeworkSectionHeader.dart';
import 'HomeworkTaskCard.dart';

class HomeworkSection extends StatelessWidget {
  final int index;
  final HomeworkSectionData data;
  final double scale;
  final ValueChanged<HomeworkTaskData> onSubmit;
  final ValueChanged<HomeworkTaskData> onOpenDetails;
  final int? submittingWorkloadId;

  const HomeworkSection({
    super.key,
    required this.index,
    required this.data,
    required this.scale,
    required this.onSubmit,
    required this.onOpenDetails,
    this.submittingWorkloadId,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: HomeworkSectionHeader(
            key: Key('homework-group-$index'),
            title: data.title,
            type: data.type,
            scale: scale,
          ),
        ),
        SizedBox(height: 6 * scale),
        for (var taskIndex = 0; taskIndex < data.tasks.length; taskIndex++) ...[
          Padding(
            padding: EdgeInsets.only(left: 23 * scale, right: 22 * scale),
            child: HomeworkTaskCard(
              key: Key('homework-task-$index-$taskIndex'),
              task: data.tasks[taskIndex],
              scale: scale,
              onSubmit: () => onSubmit(data.tasks[taskIndex]),
              onOpenDetails: () => onOpenDetails(data.tasks[taskIndex]),
              isSubmitting:
                  submittingWorkloadId == data.tasks[taskIndex].workloadId,
            ),
          ),
          if (taskIndex < data.tasks.length - 1) SizedBox(height: 11 * scale),
        ],
        if (data.spacingAfter > 0) SizedBox(height: data.spacingAfter * scale),
      ],
    );
  }
}
