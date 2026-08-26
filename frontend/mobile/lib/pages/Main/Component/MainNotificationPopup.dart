import 'package:flutter/material.dart';

import '../../../interfaces/app_alert.interface.dart';

Future<void> showMainNotificationPopup(
  BuildContext context, {
  required List<AppAlertData> alerts,
  required DateTime now,
  required ValueChanged<AppAlertData> onSelected,
}) => showDialog<void>(
  context: context,
  barrierColor: Colors.black.withValues(alpha: 0.32),
  builder: (_) =>
      _MainNotificationPopup(alerts: alerts, now: now, onSelected: onSelected),
);

class _MainNotificationPopup extends StatelessWidget {
  final List<AppAlertData> alerts;
  final DateTime now;
  final ValueChanged<AppAlertData> onSelected;

  const _MainNotificationPopup({
    required this.alerts,
    required this.now,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('main-notification-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      backgroundColor: const Color(0xFFFEFBEA),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(26),
        side: const BorderSide(color: Color(0xFFE5A9B8)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 390, maxHeight: 580),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  key: const Key('close-main-notification-popup'),
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: const Color(0xFF8D6070),
                ),
              ),
              Container(
                width: 50,
                height: 50,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFE4EC),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.notifications_active_outlined,
                  color: Color(0xFFB85E7D),
                ),
              ),
              const SizedBox(height: 9),
              const Text(
                'การแจ้งเตือน',
                style: TextStyle(
                  fontSize: 19,
                  color: Color(0xFF70475A),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'รายการที่กำลังมาถึงหรือยังต้องดำเนินการ ${alerts.length} รายการ',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10, color: Color(0xFF947180)),
              ),
              const SizedBox(height: 14),
              Flexible(
                child: ListView.separated(
                  key: const Key('main-notification-list'),
                  shrinkWrap: true,
                  itemCount: alerts.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 9),
                  itemBuilder: (context, index) {
                    final alert = alerts[index];
                    return Material(
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Color(0xFFE8D3D9)),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        key: Key('main-notification-item-$index'),
                        onTap: () => onSelected(alert),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEDF6FA),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  alert.kind == AppAlertKind.checkpoint
                                      ? Icons.event_repeat_rounded
                                      : Icons.schedule_rounded,
                                  size: 18,
                                  color: const Color(0xFF6591A5),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      alert.subjectName.isEmpty
                                          ? 'ไม่ระบุวิชา'
                                          : alert.subjectName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF496573),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${alert.kindLabel} · ${alert.title}',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF78646C),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 7),
                              Text(
                                _popupTime(alert, now),
                                style: TextStyle(
                                  fontSize: 9.5,
                                  color: alert.isOverdueAt(now)
                                      ? const Color(0xFFE34F61)
                                      : const Color(0xFFA06478),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _popupTime(AppAlertData alert, DateTime now) {
  if (alert.isOverdueAt(now)) return 'เลยกำหนดส่ง';
  if (alert.kind == AppAlertKind.checkpoint) return 'ถึงรอบแล้ว';
  return '${alert.eventAt.hour.toString().padLeft(2, '0')}:'
      '${alert.eventAt.minute.toString().padLeft(2, '0')} น.';
}
