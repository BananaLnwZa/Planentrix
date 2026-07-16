import 'package:flutter/material.dart';

import 'CustomDayDropdown.dart';
import 'WorkTime.dart';
import 'BusyDay.dart';

const String _fontFamily = 'Sansation';
const Color _accentColor = Color(0xFF9CC5F9);
const Color _inputBorderColor = Color(0x4D000000);

OutlineInputBorder _inputBorder({Color color = _inputBorderColor}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(25),
    borderSide: BorderSide(color: color, width: 1),
  );
}

InputDecoration _inputDecoration({
  required String hintText,
  Widget? suffixIcon,
  EdgeInsetsGeometry contentPadding = const EdgeInsets.symmetric(
    horizontal: 20,
    vertical: 16,
  ),
}) {
  return InputDecoration(
    hintText: hintText,
    hintStyle: const TextStyle(
      color: Color(0x80000000),
      fontFamily: _fontFamily,
      fontWeight: FontWeight.w300,
      fontSize: 13,
    ),
    filled: true,
    fillColor: Colors.white,
    isDense: true,
    contentPadding: contentPadding,
    suffixIcon: suffixIcon,
    border: _inputBorder(),
    enabledBorder: _inputBorder(),
    focusedBorder: _inputBorder(color: _accentColor),
    errorBorder: _inputBorder(color: const Color(0xFFB3261E)),
    focusedErrorBorder: _inputBorder(color: const Color(0xFFB3261E)),
  );
}

const TextStyle _inputTextStyle = TextStyle(
  color: Colors.black,
  fontFamily: _fontFamily,
  fontWeight: FontWeight.w300,
  fontSize: 14,
);

const TextStyle _labelTextStyle = TextStyle(
  color: Colors.black87,
  fontFamily: _fontFamily,
  fontWeight: FontWeight.w300,
  fontSize: 14,
);

class Constraint extends StatefulWidget {
  const Constraint({super.key});

  @override
  State<Constraint> createState() => _ConstraintState();
}

class _ConstraintState extends State<Constraint> {
  String? selectedDay;

  final TextEditingController workHourController = TextEditingController();

  final TextEditingController workMinuteController = TextEditingController();

  final TextEditingController breakHourController = TextEditingController();

  final TextEditingController breakMinuteController = TextEditingController();

  final TextEditingController startTimeController = TextEditingController();

  final TextEditingController endTimeController = TextEditingController();

  Future<void> _selectTime(TextEditingController controller) async {
    final TimeOfDay? selectedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );

    if (selectedTime == null || !mounted) {
      return;
    }

    controller.text = selectedTime.format(context);
  }

  @override
  void dispose() {
    workHourController.dispose();
    workMinuteController.dispose();
    breakHourController.dispose();
    breakMinuteController.dispose();
    startTimeController.dispose();
    endTimeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;

    final bool mobile = screenWidth < 600;

    final double containerPadding = mobile ? 24 : 32;

    final double titleSize = mobile ? 24 : 32;

    const double labelSize = 14;

    // ความสูงช่องกรอกชั่วโมงและนาที
    const double numberFieldHeight = 52;

    // ความสูงช่องเลือกเวลาเริ่มและสิ้นสุด
    const double timeFieldHeight = 52;

    return Container(
      key: const Key('constraint-card'),
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 500, minHeight: 420),
      padding: EdgeInsets.all(containerPadding),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.92),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Text(
              'Constraint',
              style: TextStyle(
                fontSize: titleSize,
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w400,
                color: Colors.black,
              ),
            ),
          ),

          SizedBox(height: mobile ? 24 : 32),

          /// วันหยุด
          const Text('วันหยุด', style: _labelTextStyle),

          const SizedBox(height: 8),

          CustomDayDropdown(
            value: selectedDay,
            onChanged: (day) {
              setState(() {
                selectedDay = day;
              });
            },
          ),

          SizedBox(height: mobile ? 20 : 24),

          /// ระยะเวลาทำงานต่อเนื่อง
          const Text('ระยะเวลาทำงานต่อเนื่อง', style: _labelTextStyle),

          const SizedBox(height: 8),

          _DurationFields(
            hourController: workHourController,
            minuteController: workMinuteController,
            fieldHeight: numberFieldHeight,
            fontSize: labelSize,
          ),

          SizedBox(height: mobile ? 20 : 24),

          /// ระยะเวลาพัก
          const Text('ระยะเวลาพัก', style: _labelTextStyle),

          const SizedBox(height: 8),

          _DurationFields(
            hourController: breakHourController,
            minuteController: breakMinuteController,
            fieldHeight: numberFieldHeight,
            fontSize: labelSize,
          ),

          SizedBox(height: mobile ? 20 : 24),

          /// เวลาเริ่มทำงาน
          const Text('เวลาเริ่มทำงาน', style: _labelTextStyle),

          const SizedBox(height: 8),

          _TimeField(
            fieldKey: const Key('start-time-field'),
            controller: startTimeController,
            height: timeFieldHeight,
            onTap: () => _selectTime(startTimeController),
          ),

          SizedBox(height: mobile ? 20 : 24),

          /// เวลาสิ้นสุดการทำงาน
          const Text('เวลาสิ้นสุดการทำงาน', style: _labelTextStyle),

          const SizedBox(height: 8),

          _TimeField(
            fieldKey: const Key('end-time-field'),
            controller: endTimeController,
            height: timeFieldHeight,
            onTap: () => _selectTime(endTimeController),
          ),

          SizedBox(height: mobile ? 24 : 30),

          const WorkTime(),

          SizedBox(height: mobile ? 20 : 24),

          const BusyDay(),
        ],
      ),
    );
  }
}

class _DurationFields extends StatelessWidget {
  final TextEditingController hourController;

  final TextEditingController minuteController;

  final double fieldHeight;
  final double fontSize;

  const _DurationFields({
    required this.hourController,
    required this.minuteController,
    required this.fieldHeight,
    required this.fontSize,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: fieldHeight,
                  child: TextField(
                    controller: hourController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    textAlignVertical: TextAlignVertical.center,
                    style: _inputTextStyle,
                    decoration: _inputDecoration(
                      hintText: '0',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 16,
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 8),

              Flexible(
                child: Text(
                  'ชั่วโมง',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: _labelTextStyle.copyWith(fontSize: fontSize),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(width: 12),

        Expanded(
          child: Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: fieldHeight,
                  child: TextField(
                    controller: minuteController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    textAlignVertical: TextAlignVertical.center,
                    style: _inputTextStyle,
                    decoration: _inputDecoration(
                      hintText: '0',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 16,
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 8),

              Flexible(
                child: Text(
                  'นาที',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: _labelTextStyle.copyWith(fontSize: fontSize),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TimeField extends StatelessWidget {
  final Key fieldKey;
  final TextEditingController controller;
  final double height;
  final VoidCallback onTap;

  const _TimeField({
    required this.fieldKey,
    required this.controller,
    required this.height,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: fieldKey,
      width: 170,
      height: height,
      child: TextField(
        controller: controller,
        readOnly: true,
        onTap: onTap,
        style: _inputTextStyle,
        textAlignVertical: TextAlignVertical.center,
        decoration: _inputDecoration(
          hintText: 'select time',
          contentPadding: const EdgeInsets.only(
            left: 18,
            right: 8,
            top: 16,
            bottom: 16,
          ),
          suffixIcon: IconButton(
            onPressed: onTap,
            icon: const Icon(
              Icons.access_time,
              size: 22,
              color: Colors.black54,
            ),
          ),
        ),
      ),
    );
  }
}
