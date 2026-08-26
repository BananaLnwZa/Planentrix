import 'package:flutter/material.dart';

import '../../../interfaces/app_alert.interface.dart';

class MainNotificationCard extends StatelessWidget {
  final List<AppAlertData> alerts;
  final DateTime now;
  final VoidCallback? onTap;

  const MainNotificationCard({
    super.key,
    required this.alerts,
    required this.now,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final visible = alerts.take(3).toList();
    final remaining = alerts.length - visible.length;
    return Material(
      key: const Key('main-notification-card'),
      color: const Color(0xFFFFF8F9),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(13),
        side: const BorderSide(color: Color(0xFFE5A9B8)),
      ),
      elevation: 3,
      shadowColor: const Color(0x384B5D66),
      child: InkWell(
        key: const Key('main-notification-button'),
        onTap: alerts.isEmpty ? null : onTap,
        child: SizedBox(
          width: double.infinity,
          height: 150,
          child: Column(
            children: [
              Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 9),
                decoration: const BoxDecoration(
                  color: Color(0xFFFFE7EE),
                  border: Border(bottom: BorderSide(color: Color(0xFFF1CDD7))),
                ),
                child: Row(
                  children: [
                    Icon(
                      alerts.isEmpty
                          ? Icons.notifications_none_rounded
                          : Icons.notifications_active_outlined,
                      size: 16,
                      color: const Color(0xFF9D526C),
                    ),
                    const SizedBox(width: 5),
                    const Expanded(
                      child: Text(
                        'แจ้งเตือน',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF8D4560),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (alerts.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                        ),
                        child: Text(
                          '${alerts.length}',
                          style: const TextStyle(
                            fontSize: 8.5,
                            color: Color(0xFFA55370),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: visible.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            'ยังไม่มีรายการที่ต้องแจ้งเตือน',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 8.5,
                              color: Color(0xFFA49399),
                            ),
                          ),
                        ),
                      )
                    : Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 7),
                        child: Column(
                          children: [
                            for (var index = 0; index < visible.length; index++)
                              Expanded(
                                child: _AlertRow(
                                  alert: visible[index],
                                  now: now,
                                  showDivider: index < visible.length - 1,
                                ),
                              ),
                            if (remaining > 0)
                              SizedBox(
                                height: 15,
                                child: Align(
                                  alignment: Alignment.centerRight,
                                  child: Text(
                                    '+$remaining รายการ ›',
                                    style: const TextStyle(
                                      fontSize: 7.5,
                                      color: Color(0xFFA15A72),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AlertRow extends StatelessWidget {
  final AppAlertData alert;
  final DateTime now;
  final bool showDivider;

  const _AlertRow({
    required this.alert,
    required this.now,
    required this.showDivider,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: showDivider
            ? const Border(bottom: BorderSide(color: Color(0xFFF3E2E7)))
            : null,
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 6,
            height: 6,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xFFD7819C),
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 5),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.subjectName.isEmpty
                      ? alert.kindLabel
                      : alert.subjectName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 8.5,
                    color: Color(0xFF586F7A),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${alert.kindLabel} · ${alert.title}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 7.5,
                    color: Color(0xFF8B6C77),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 3),
          Text(
            _alertTime(alert, now),
            style: TextStyle(
              fontSize: 7.5,
              color: alert.isOverdueAt(now)
                  ? const Color(0xFFE34F61)
                  : const Color(0xFFA15A72),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

String _alertTime(AppAlertData alert, DateTime now) {
  if (alert.isOverdueAt(now)) return 'เลยเวลา';
  if (alert.kind == AppAlertKind.checkpoint) return 'ถึงรอบ';
  return '${alert.eventAt.hour.toString().padLeft(2, '0')}:'
      '${alert.eventAt.minute.toString().padLeft(2, '0')}';
}
