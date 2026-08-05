import 'package:flutter/material.dart';

class Schedule extends StatefulWidget {
  const Schedule({super.key});

  @override
  State<Schedule> createState() => _ScheduleState();
}

class _ScheduleState extends State<Schedule> {
  static const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _dayColors = [
    Color(0xFFFFD7E5),
    Color(0xFFFFE0C9),
    Color(0xFFFFF0B8),
    Color(0xFFDDF0C7),
    Color(0xFFD6EBFA),
    Color(0xFFDDDDF8),
    Color(0xFFF5D8EE),
  ];
  static const _timeSlots = [
    '6 AM',
    '7 AM',
    '8 AM',
    '9 AM',
    '10 AM',
    '11 AM',
    '12 PM',
    '1 PM',
    '2 PM',
    '3 PM',
    '4 PM',
    '5 PM',
    '6 PM',
    '7 PM',
    '8 PM',
    '9 PM',
    '10 PM',
    '11 PM',
    '12 AM',
    '1 AM',
    '2 AM',
    '3 AM',
    '4 AM',
    '5 AM',
  ];

  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: const Key('schedule'),
      width: double.infinity,
      height: 420,
      child: LayoutBuilder(
        builder: (context, constraints) {
          const timeWidth = 42.0;
          final gridContentWidth = constraints.maxWidth - 2;
          final headerDayWidth =
              (constraints.maxWidth - timeWidth) / _days.length;
          final gridDayWidth = (gridContentWidth - timeWidth) / _days.length;

          return Column(
            children: [
              _ScheduleHeader(timeWidth: timeWidth, dayWidth: headerDayWidth),
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(12),
                  ),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFDECBD2)),
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(12),
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x2410684F),
                          blurRadius: 6,
                          offset: Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Scrollbar(
                      controller: _scrollController,
                      thumbVisibility: true,
                      thickness: 3,
                      radius: const Radius.circular(4),
                      child: ListView.builder(
                        key: const Key('schedule-time-list'),
                        controller: _scrollController,
                        padding: EdgeInsets.zero,
                        itemCount: _timeSlots.length,
                        itemExtent: 32,
                        itemBuilder: (context, rowIndex) {
                          return _ScheduleRow(
                            time: _timeSlots[rowIndex],
                            timeWidth: timeWidth,
                            dayWidth: gridDayWidth,
                            isEven: rowIndex.isEven,
                            isLast: rowIndex == _timeSlots.length - 1,
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ScheduleHeader extends StatelessWidget {
  final double timeWidth;
  final double dayWidth;

  const _ScheduleHeader({required this.timeWidth, required this.dayWidth});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('schedule-header'),
      height: 44,
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x24684F59),
            blurRadius: 7,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            Container(
              width: timeWidth,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: Color(0xFFBFE4F5),
                border: Border(right: BorderSide(color: Color(0xFFE2C7D1))),
              ),
              child: const FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  'Time',
                  style: TextStyle(fontSize: 11, color: Color(0xFF426477)),
                ),
              ),
            ),
            for (var index = 0; index < _ScheduleState._days.length; index++)
              Container(
                key: Key(
                  'schedule-day-${_ScheduleState._days[index].toLowerCase()}',
                ),
                width: dayWidth,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _ScheduleState._dayColors[index],
                  border: index < _ScheduleState._days.length - 1
                      ? const Border(
                          right: BorderSide(color: Color(0x80FFFFFF)),
                        )
                      : null,
                ),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    _ScheduleState._days[index],
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF596D78),
                      shadows: [
                        Shadow(color: Color(0xD9FFFFFF), offset: Offset(1, 1)),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ScheduleRow extends StatelessWidget {
  final String time;
  final double timeWidth;
  final double dayWidth;
  final bool isEven;
  final bool isLast;

  const _ScheduleRow({
    required this.time,
    required this.timeWidth,
    required this.dayWidth,
    required this.isEven,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(bottom: BorderSide(color: Color(0xFFEEE1E6))),
      ),
      child: Row(
        children: [
          Container(
            width: timeWidth,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isEven ? const Color(0xFFFFF1D5) : const Color(0xFFFFF7E8),
              border: const Border(right: BorderSide(color: Color(0xFFE5D4DA))),
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                time,
                key: Key(
                  'schedule-time-${time.replaceAll(' ', '-').toLowerCase()}',
                ),
                style: const TextStyle(fontSize: 9, color: Color(0xFF687983)),
              ),
            ),
          ),
          for (var columnIndex = 0; columnIndex < 7; columnIndex++)
            Container(
              width: dayWidth,
              decoration: BoxDecoration(
                color: isEven ? const Color(0xFFFFFEFC) : Colors.white,
                border: columnIndex < 6
                    ? const Border(right: BorderSide(color: Color(0xFFEEE4E8)))
                    : null,
              ),
            ),
        ],
      ),
    );
  }
}
