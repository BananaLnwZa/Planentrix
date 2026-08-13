import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../interfaces/auth.interface.dart' as auth;
import '../../../common/AppTimePicker.dart';
import 'CustomDayDropdown.dart';
import 'BusyDay.dart';
import 'BusyDayModal.dart';

class ConstraintFormData {
  final int? dayOff;
  final int? continuousWorkingDuration;
  final int? breakTime;
  final String? startTime;
  final String? endTime;
  final List<auth.BusyDay> busyDays;

  const ConstraintFormData({
    required this.dayOff,
    required this.continuousWorkingDuration,
    required this.breakTime,
    required this.startTime,
    required this.endTime,
    required this.busyDays,
  });
}

int dayNameToNumber(String day) {
  const dayMap = <String, int>{
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7,
  };
  return dayMap[day] ?? 1;
}

int durationToMinutes(String hours, String minutes) {
  final hoursText = hours.trim();
  final minutesText = minutes.trim();
  final parsedHours = hoursText.isEmpty ? 0 : int.tryParse(hoursText);
  final parsedMinutes = minutesText.isEmpty ? 0 : int.tryParse(minutesText);

  if (parsedHours == null || parsedMinutes == null || parsedHours < 0) {
    throw const FormatException('ระยะเวลาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
  }
  if (parsedMinutes < 0 || parsedMinutes > 59) {
    throw const FormatException('นาทีต้องอยู่ระหว่าง 0 ถึง 59');
  }

  return parsedHours * 60 + parsedMinutes;
}

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
  BoxConstraints? suffixIconConstraints,
  bool hasError = false,
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
    suffixIconConstraints: suffixIconConstraints,
    border: _inputBorder(),
    enabledBorder: _inputBorder(
      color: hasError ? const Color(0xFFB3261E) : _inputBorderColor,
    ),
    focusedBorder: _inputBorder(
      color: hasError ? const Color(0xFFB3261E) : _accentColor,
    ),
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
  State<Constraint> createState() => ConstraintState();
}

class ConstraintState extends State<Constraint> {
  static const String _incompleteWorkTimeMessage =
      'กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุดให้ครบ';
  static const String _invalidWorkTimeMessage = 'รูปแบบเวลาทำงานไม่ถูกต้อง';
  static const String _workTimeOrderMessage =
      'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด';

  String? selectedDay;
  String? _errorMessage;

  String? get validationMessage => _errorMessage;

  bool get _hasWorkTimeError =>
      _errorMessage == _incompleteWorkTimeMessage ||
      _errorMessage == _invalidWorkTimeMessage ||
      _errorMessage == _workTimeOrderMessage;

  final GlobalKey<BusyDayState> _busyDayKey = GlobalKey<BusyDayState>();

  final TextEditingController workHourController = TextEditingController();

  final TextEditingController workMinuteController = TextEditingController();

  final TextEditingController breakHourController = TextEditingController();

  final TextEditingController breakMinuteController = TextEditingController();

  final TextEditingController startTimeController = TextEditingController();

  final TextEditingController endTimeController = TextEditingController();

  ConstraintFormData? validateAndGetData() {
    int continuousDuration;
    int breakDuration;
    try {
      continuousDuration = durationToMinutes(
        workHourController.text,
        workMinuteController.text,
      );
      breakDuration = durationToMinutes(
        breakHourController.text,
        breakMinuteController.text,
      );
    } on FormatException catch (error) {
      _setError(error.message);
      return null;
    }

    final workTimeError = _getWorkTimeError();
    if (workTimeError != null) {
      _setError(workTimeError);
      return null;
    }

    final startDisplay = startTimeController.text.trim();
    final endDisplay = endTimeController.text.trim();
    final startTime = startDisplay.isEmpty
        ? null
        : convertDisplayTimeTo24Hour(startDisplay);
    final endTime = endDisplay.isEmpty
        ? null
        : convertDisplayTimeTo24Hour(endDisplay);

    List<auth.BusyDay> busyDays;
    try {
      busyDays = _busyDayKey.currentState?.getFormData() ?? const [];
    } on FormatException catch (error) {
      _setError(error.message);
      return null;
    }

    _setError(null);
    return ConstraintFormData(
      dayOff: selectedDay == null ? null : dayNameToNumber(selectedDay!),
      continuousWorkingDuration: continuousDuration == 0
          ? null
          : continuousDuration,
      breakTime: breakDuration == 0 ? null : breakDuration,
      startTime: startTime,
      endTime: endTime,
      busyDays: busyDays,
    );
  }

  void _setError(String? message) {
    if (!mounted) return;
    setState(() {
      _errorMessage = message;
    });
  }

  String? _getWorkTimeError({bool requireCompletePair = true}) {
    final startDisplay = startTimeController.text.trim();
    final endDisplay = endTimeController.text.trim();

    if (startDisplay.isEmpty && endDisplay.isEmpty) return null;
    if (startDisplay.isEmpty || endDisplay.isEmpty) {
      return requireCompletePair ? _incompleteWorkTimeMessage : null;
    }

    final startTime = convertDisplayTimeTo24Hour(startDisplay);
    final endTime = convertDisplayTimeTo24Hour(endDisplay);
    if (startTime == null || endTime == null) {
      return _invalidWorkTimeMessage;
    }
    if (startTime.compareTo(endTime) >= 0) {
      return _workTimeOrderMessage;
    }

    return null;
  }

  Future<void> _selectTime(TextEditingController controller) async {
    final TimeOfDay? selectedTime = await showAppTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );

    if (selectedTime == null || !mounted) {
      return;
    }

    final previousErrorWasWorkTime = _hasWorkTimeError;
    setState(() {
      controller.text = formatBusyDayTime(selectedTime);
      final workTimeError = _getWorkTimeError(requireCompletePair: false);
      if (workTimeError != null || previousErrorWasWorkTime) {
        _errorMessage = workTimeError;
      }
    });
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
        color: Colors.white.withValues(alpha: 0.92),
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
            hourFieldKey: const Key('work-hour-field'),
            minuteFieldKey: const Key('work-minute-field'),
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
            hourFieldKey: const Key('break-hour-field'),
            minuteFieldKey: const Key('break-minute-field'),
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
            hasError: _hasWorkTimeError,
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
            hasError: _hasWorkTimeError,
            onTap: () => _selectTime(endTimeController),
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              key: const Key('constraint-error'),
              style: const TextStyle(
                color: Color(0xFFEF4444),
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w300,
                fontSize: 12,
              ),
            ),
          ],

          SizedBox(height: mobile ? 20 : 24),

          BusyDay(key: _busyDayKey),
        ],
      ),
    );
  }
}

class _DurationFields extends StatelessWidget {
  final Key hourFieldKey;
  final Key minuteFieldKey;
  final TextEditingController hourController;

  final TextEditingController minuteController;

  final double fieldHeight;
  final double fontSize;

  const _DurationFields({
    required this.hourFieldKey,
    required this.minuteFieldKey,
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
                    key: hourFieldKey,
                    controller: hourController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
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
                    key: minuteFieldKey,
                    controller: minuteController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
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
  final bool hasError;
  final VoidCallback onTap;

  const _TimeField({
    required this.fieldKey,
    required this.controller,
    required this.height,
    required this.hasError,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: fieldKey,
      width: 130,
      height: height,
      child: TextField(
        controller: controller,
        readOnly: true,
        onTap: onTap,
        style: _inputTextStyle,
        textAlignVertical: TextAlignVertical.center,
        decoration: _inputDecoration(
          hintText: 'select time',
          hasError: hasError,
          contentPadding: const EdgeInsets.only(
            left: 18,
            right: 2,
            top: 16,
            bottom: 16,
          ),
          suffixIcon: IconButton(
            onPressed: onTap,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(width: 40, height: 44),
            icon: const Icon(
              Icons.access_time,
              size: 22,
              color: Color(0xFF74B88A),
            ),
          ),
          suffixIconConstraints: const BoxConstraints.tightFor(
            width: 40,
            height: 44,
          ),
        ),
      ),
    );
  }
}
