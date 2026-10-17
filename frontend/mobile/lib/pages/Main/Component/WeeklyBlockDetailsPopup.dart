// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../common/DateTimeFormat.dart';
import '../../../interfaces/recommendation.interface.dart';

Future<void> showWeeklyBlockDetailsPopup(
  BuildContext context, {
  required WeeklyScheduleBlock block,
}) => showDialog<void>(
  context: context,
  barrierColor: Colors.black38,
  builder: (_) => _WeeklyBlockDetailsPopup(block: block),
);

class _WeeklyBlockDetailsPopup extends StatelessWidget {
  final WeeklyScheduleBlock block;

  const _WeeklyBlockDetailsPopup({required this.block});

  @override
  Widget build(BuildContext context) {
    final isReview = block.scheduleTypeCode == 'review';
    final date = DateTime.tryParse(block.scheduledDate);
    return Dialog(
      key: const Key('weekly-block-details-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFDF9),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFC8DCE7)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x384F7184),
              blurRadius: 26,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(20, 14, 12, 20),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFE7F5FC), Color(0xFFFFF2F7)],
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(23)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        IconButton(
                          tooltip: 'ปิด',
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(
                            Icons.close_rounded,
                            color: Color(0xFFD85E82),
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isReview
                            ? const Color(0xFFFFF0BA)
                            : const Color(0xFFF8D1CD),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isReview
                                ? Icons.menu_book_rounded
                                : Icons.assignment_rounded,
                            size: 16,
                            color: isReview
                                ? const Color(0xFF8D6A28)
                                : const Color(0xFFA15861),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            isReview ? 'ทบทวน' : 'ทำการบ้าน',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isReview
                                  ? const Color(0xFF8D6A28)
                                  : const Color(0xFFA15861),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      block.subjectName,
                      style: const TextStyle(
                        fontSize: 20,
                        height: 1.25,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF365B6E),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _DetailCard(
                      icon: Icons.calendar_today_rounded,
                      label: 'วันที่',
                      value: date == null
                          ? block.scheduledDate
                          : formatDisplayDate(date),
                    ),
                    const SizedBox(height: 10),
                    _DetailCard(
                      icon: Icons.schedule_rounded,
                      label: 'ช่วงเวลา',
                      value:
                          '${block.startTime.substring(0, 5)} – ${block.endTime.substring(0, 5)} น.',
                    ),
                    const SizedBox(height: 14),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: () => Navigator.pop(context),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF8FC5DF),
                        ),
                        child: const Text('ปิด'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xFFD8EAF2)),
    ),
    child: Row(
      children: [
        Icon(icon, size: 19, color: const Color(0xFF6AAFCB)),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Color(0xFF8196A0)),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF526B78),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}
