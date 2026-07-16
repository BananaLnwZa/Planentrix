import 'package:flutter/material.dart';

const String _fontFamily = 'Sansation';

TimeOfDay? parseBusyDayTime(String value) {
  final match = RegExp(
    r'^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$',
    caseSensitive: false,
  ).firstMatch(value.trim());

  if (match == null) return null;

  var hour = int.tryParse(match.group(1)!);
  final minute = int.tryParse(match.group(2)!);
  final period = match.group(3)?.toUpperCase();

  if (hour == null || minute == null || minute > 59) {
    return null;
  }

  if (period != null) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (period == 'PM' ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  return TimeOfDay(hour: hour, minute: minute);
}

String formatBusyDayTime(TimeOfDay time) {
  final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
  final minute = time.minute.toString().padLeft(2, '0');
  final period = time.period == DayPeriod.am ? 'AM' : 'PM';

  return '${hour.toString().padLeft(2, '0')}:$minute $period';
}

String _normalizeBusyDayTime(String value) {
  final time = parseBusyDayTime(value);
  return time == null ? value : formatBusyDayTime(time);
}

/// ข้อมูลที่ส่งเข้ามาเมื่อกดแก้ไขรายการเดิม
class BusyDayEditItem {
  final String id;
  final String day;
  final String start;
  final String end;

  const BusyDayEditItem({
    required this.id,
    required this.day,
    required this.start,
    required this.end,
  });
}

class BusyDayModal extends StatefulWidget {
  final BusyDayEditItem? editItem;

  final void Function(String day, String start, String end) onConfirm;

  final VoidCallback? onClose;

  const BusyDayModal({
    super.key,
    required this.onConfirm,
    this.editItem,
    this.onClose,
  });

  @override
  State<BusyDayModal> createState() => _BusyDayModalState();
}

class _BusyDayModalState extends State<BusyDayModal> {
  String selectedDay = 'Mon';
  String startTime = '';
  String endTime = '';

  final List<Map<String, dynamic>> days = const [
    {'id': 'Sun', 'color': Color(0xFFEC407A)},
    {'id': 'Mon', 'color': Color(0xFFFACC15)},
    {'id': 'Tue', 'color': Color(0xFFF9A8D4)},
    {'id': 'Wed', 'color': Color(0xFF4ADE80)},
    {'id': 'Thu', 'color': Color(0xFFFB923C)},
    {'id': 'Fri', 'color': Color(0xFF38BDF8)},
    {'id': 'Sat', 'color': Color(0xFFD8B4FE)},
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void didUpdateWidget(covariant BusyDayModal oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.editItem != widget.editItem) {
      _loadInitialData();
    }
  }

  void _loadInitialData() {
    final item = widget.editItem;

    if (item != null) {
      selectedDay = item.day;
      startTime = _normalizeBusyDayTime(item.start);
      endTime = _normalizeBusyDayTime(item.end);
    } else {
      selectedDay = 'Mon';
      startTime = '';
      endTime = '';
    }
  }

  TimeOfDay _parseTime(String value) {
    return parseBusyDayTime(value) ?? TimeOfDay.now();
  }

  String _formatTime(TimeOfDay time) {
    return formatBusyDayTime(time);
  }

  Future<void> _selectStartTime() async {
    final selected = await showTimePicker(
      context: context,
      initialTime: _parseTime(startTime),
      helpText: 'เลือกเวลาเริ่มต้น',
      cancelText: 'ยกเลิก',
      confirmText: 'ตกลง',
    );

    if (selected == null || !mounted) return;

    setState(() {
      startTime = _formatTime(selected);
    });
  }

  Future<void> _selectEndTime() async {
    final selected = await showTimePicker(
      context: context,
      initialTime: _parseTime(endTime),
      helpText: 'เลือกเวลาสิ้นสุด',
      cancelText: 'ยกเลิก',
      confirmText: 'ตกลง',
    );

    if (selected == null || !mounted) return;

    setState(() {
      endTime = _formatTime(selected);
    });
  }

  void _closeModal() {
    widget.onClose?.call();

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  void _confirm() {
    if (startTime.isEmpty || endTime.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุด')),
      );

      return;
    }

    widget.onConfirm(selectedDay, startTime, endTime);

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final bool mobile = screenWidth < 600;

    final double horizontalMargin = mobile ? 16 : 24;
    final double modalPadding = mobile ? 20 : 24;
    final double titleSize = mobile ? 17 : 20;
    const double timeFieldHeight = 46;

    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: const BorderSide(color: Color(0x4D000000), width: 1),
    );

    final focusedInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: const BorderSide(color: Color(0xFF9CC5F9), width: 1),
    );

    final errorInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: const BorderSide(color: Color(0xFFB3261E), width: 1),
    );

    return Dialog(
      insetPadding: EdgeInsets.symmetric(
        horizontal: horizontalMargin,
        vertical: 24,
      ),
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(modalPadding),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 20,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: SingleChildScrollView(
            child: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 28),
                        child: Text(
                          'กรุณาเลือกวันและเวลาที่ไม่ว่างประจำ',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: titleSize,
                            fontFamily: _fontFamily,
                            fontWeight: FontWeight.w400,
                            color: Colors.black,
                          ),
                        ),
                      ),

                      SizedBox(height: mobile ? 22 : 26),

                      /// วัน
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: mobile ? 8 : 12,
                        runSpacing: mobile ? 8 : 12,
                        children: days.map((day) {
                          final String id = day['id'];
                          final Color color = day['color'];
                          final bool isSelected = selectedDay == id;

                          return _DayButton(
                            id: id,
                            color: color,
                            isSelected: isSelected,
                            onPressed: () {
                              setState(() {
                                selectedDay = id;
                              });
                            },
                          );
                        }).toList(),
                      ),

                      SizedBox(height: mobile ? 26 : 32),

                      /// เวลาเริ่มต้นและสิ้นสุด
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: timeFieldHeight,
                              child: TextFormField(
                                readOnly: true,
                                onTap: _selectStartTime,
                                controller: TextEditingController(
                                  text: startTime,
                                ),
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontFamily: _fontFamily,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w300,
                                ),
                                decoration: InputDecoration(
                                  hintText: 'เริ่มต้น',
                                  hintStyle: TextStyle(
                                    color: const Color(0x80000000),
                                    fontFamily: _fontFamily,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w300,
                                  ),

                                  filled: true,
                                  fillColor: Colors.white,
                                  isDense: true,

                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 14,
                                  ),

                                  border: inputBorder,
                                  enabledBorder: inputBorder,
                                  focusedBorder: focusedInputBorder,
                                  errorBorder: errorInputBorder,
                                  focusedErrorBorder: errorInputBorder,

                                  suffixIcon: IconButton(
                                    onPressed: _selectStartTime,
                                    icon: const Icon(
                                      Icons.access_time,
                                      color: Color(0xFFFFB9DF),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),

                          Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: mobile ? 6 : 10,
                            ),
                            child: Text(
                              '-',
                              style: TextStyle(color: Colors.grey.shade500),
                            ),
                          ),

                          Expanded(
                            child: SizedBox(
                              height: timeFieldHeight,
                              child: TextFormField(
                                readOnly: true,
                                onTap: _selectEndTime,
                                controller: TextEditingController(
                                  text: endTime,
                                ),
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontFamily: _fontFamily,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w300,
                                ),
                                decoration: InputDecoration(
                                  hintText: 'สิ้นสุด',
                                  hintStyle: TextStyle(
                                    color: const Color(0x80000000),
                                    fontFamily: _fontFamily,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w300,
                                  ),

                                  filled: true,
                                  fillColor: Colors.white,
                                  isDense: true,

                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 14,
                                  ),

                                  border: inputBorder,
                                  enabledBorder: inputBorder,
                                  focusedBorder: focusedInputBorder,
                                  errorBorder: errorInputBorder,
                                  focusedErrorBorder: errorInputBorder,

                                  suffixIcon: IconButton(
                                    onPressed: _selectEndTime,
                                    icon: const Icon(
                                      Icons.access_time,
                                      color: Color(0xFFFFB9DF),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      SizedBox(height: mobile ? 22 : 26),

                      /// ปุ่มยืนยัน
                      SizedBox(
                        height: 42,
                        child: _ConfirmButton(
                          text: widget.editItem != null ? 'บันทึก' : 'ยืนยัน',
                          onPressed: _confirm,
                        ),
                      ),
                    ],
                  ),
                ),

                /// ปุ่มปิด
                Positioned(
                  right: 0,
                  top: 0,
                  child: IconButton(
                    tooltip: 'ปิด',
                    onPressed: _closeModal,
                    icon: const Icon(
                      Icons.close,
                      size: 27,
                      color: Color(0xFFEC407A),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DayButton extends StatefulWidget {
  final String id;
  final Color color;
  final bool isSelected;
  final VoidCallback onPressed;

  const _DayButton({
    required this.id,
    required this.color,
    required this.isSelected,
    required this.onPressed,
  });

  @override
  State<_DayButton> createState() => _DayButtonState();
}

class _DayButtonState extends State<_DayButton> {
  bool isHovered = false;

  @override
  Widget build(BuildContext context) {
    final bool active = widget.isSelected || isHovered;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        setState(() {
          isHovered = true;
        });
      },
      onExit: (_) {
        setState(() {
          isHovered = false;
        });
      },
      child: AnimatedScale(
        scale: active ? 1.08 : 1,
        duration: const Duration(milliseconds: 160),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: widget.onPressed,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 9),
              decoration: BoxDecoration(
                color: widget.color,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: widget.isSelected ? Colors.white : Colors.transparent,
                  width: 3,
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 5,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                widget.id,
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: _fontFamily,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ConfirmButton extends StatefulWidget {
  final String text;
  final VoidCallback onPressed;

  const _ConfirmButton({required this.text, required this.onPressed});

  @override
  State<_ConfirmButton> createState() => _ConfirmButtonState();
}

class _ConfirmButtonState extends State<_ConfirmButton> {
  bool isHovered = false;

  @override
  Widget build(BuildContext context) {
    const hoverColor = Color(0xFFB5E48C);
    const hoverBorderColor = Color(0xFF8BC98F);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        setState(() {
          isHovered = true;
        });
      },
      onExit: (_) {
        setState(() {
          isHovered = false;
        });
      },
      child: AnimatedScale(
        scale: isHovered ? 1.04 : 1,
        duration: const Duration(milliseconds: 180),
        child: OutlinedButton(
          onPressed: widget.onPressed,
          style: ButtonStyle(
            elevation: WidgetStateProperty.all(0),
            padding: WidgetStateProperty.all(
              const EdgeInsets.symmetric(horizontal: 32),
            ),
            backgroundColor: WidgetStateProperty.all(
              isHovered ? hoverColor : Colors.white,
            ),
            foregroundColor: WidgetStateProperty.all(
              isHovered ? Colors.white : Colors.black,
            ),
            side: WidgetStateProperty.all(
              BorderSide(
                color: isHovered ? hoverBorderColor : Colors.grey.shade300,
              ),
            ),
            shape: WidgetStateProperty.all(
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            ),
            overlayColor: WidgetStateProperty.all(Colors.transparent),
          ),
          child: Text(
            widget.text,
            style: const TextStyle(
              fontFamily: _fontFamily,
              fontWeight: FontWeight.w400,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}
