// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../common/AppDropdown.dart';
import '../../../interfaces/time.interface.dart';
import '../timer_utils.dart';

enum TimerPhase { idle, running, paused, interrupted }

class TimerPanel extends StatelessWidget {
  final List<TimerSubject> subjects;
  final List<StudyType> studyTypes;
  final int? selectedScheduleId;
  final int? selectedStudyTypeId;
  final TimerPhase phase;
  final int elapsedSeconds;
  final bool busy;
  final ValueChanged<int?> onSubjectChanged;
  final ValueChanged<int?> onStudyTypeChanged;
  final VoidCallback onStart;
  final VoidCallback onPause;
  final VoidCallback onResume;
  final VoidCallback onFinish;

  const TimerPanel({
    super.key,
    required this.subjects,
    required this.studyTypes,
    required this.selectedScheduleId,
    required this.selectedStudyTypeId,
    required this.phase,
    required this.elapsedSeconds,
    required this.busy,
    required this.onSubjectChanged,
    required this.onStudyTypeChanged,
    required this.onStart,
    required this.onPause,
    required this.onResume,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    final selectionEnabled = phase == TimerPhase.idle && !busy;
    final canStart =
        selectionEnabled &&
        selectedScheduleId != null &&
        selectedStudyTypeId != null;

    return Container(
      key: const Key('timer-panel'),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD8E2E7)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x294E443D),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const _PanelHeader(),
          const SizedBox(height: 11),
          LayoutBuilder(
            builder: (context, constraints) {
              final subjectField = _TimerDropdown(
                key: const Key('timer-subject-dropdown'),
                label: 'วิชา',
                hint: 'เลือกวิชา',
                value: selectedScheduleId,
                enabled: selectionEnabled,
                items: subjects
                    .map(
                      (subject) => AppDropdownItem<int>(
                        value: subject.scheduleTimeId,
                        label: subject.subjectName,
                      ),
                    )
                    .toList(),
                onChanged: onSubjectChanged,
              );
              final methodField = _TimerDropdown(
                key: const Key('timer-study-type-dropdown'),
                label: 'วิธีทบทวน',
                hint: 'เลือกวิธี',
                value: selectedStudyTypeId,
                enabled: selectionEnabled,
                items: studyTypes
                    .map(
                      (type) => AppDropdownItem<int>(
                        value: type.studyTypeId,
                        label:
                            studyTypeLabels[type.studyTypeName] ??
                            type.studyTypeName,
                      ),
                    )
                    .toList(),
                onChanged: onStudyTypeChanged,
              );
              if (constraints.maxWidth < 330) {
                return Column(
                  children: [
                    subjectField,
                    const SizedBox(height: 8),
                    methodField,
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(flex: 9, child: subjectField),
                  const SizedBox(width: 8),
                  Expanded(flex: 11, child: methodField),
                ],
              );
            },
          ),
          const SizedBox(height: 15),
          Text(
            formatClock(elapsedSeconds),
            key: const Key('timer-clock'),
            style: const TextStyle(
              color: Color(0xFF514A4D),
              fontSize: 36,
              fontWeight: FontWeight.w300,
              letterSpacing: 3.2,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 1),
          const SizedBox(
            width: 230,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Text(
                  'ชั่วโมง',
                  style: TextStyle(fontSize: 9, color: Color(0xFFAFA5A7)),
                ),
                Text(
                  'นาที',
                  style: TextStyle(fontSize: 9, color: Color(0xFFAFA5A7)),
                ),
                Text(
                  'วินาที',
                  style: TextStyle(fontSize: 9, color: Color(0xFFAFA5A7)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 11),
          _TimerControls(
            phase: phase,
            busy: busy,
            canStart: canStart,
            onStart: onStart,
            onPause: onPause,
            onResume: onResume,
            onFinish: onFinish,
          ),
          const SizedBox(height: 7),
          Text(
            phase == TimerPhase.idle && !canStart
                ? 'เลือกวิชาและวิธีทบทวนก่อนเริ่ม · จำกัดเวลา 4 ชั่วโมง'
                : 'ระบบจะหยุดอัตโนมัติเมื่อครบ 4 ชั่วโมง',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 9.5, color: Color(0xFFB0A3A7)),
          ),
        ],
      ),
    );
  }
}

class _PanelHeader extends StatelessWidget {
  const _PanelHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: 9),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFEEE4DF))),
      ),
      child: const Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FOCUS SESSION',
                  style: TextStyle(
                    color: Color(0xFFA77B8A),
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'จับเวลาทบทวน',
                  style: TextStyle(
                    color: Color(0xFF4E4350),
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: Color(0xFFEAF6FC),
              shape: BoxShape.circle,
            ),
            child: Padding(
              padding: EdgeInsets.all(9),
              child: Icon(
                Icons.timer_outlined,
                color: Color(0xFF79B6D8),
                size: 21,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimerDropdown extends StatelessWidget {
  final String label;
  final String hint;
  final int? value;
  final bool enabled;
  final List<AppDropdownItem<int>> items;
  final ValueChanged<int?> onChanged;

  const _TimerDropdown({
    super.key,
    required this.label,
    required this.hint,
    required this.value,
    required this.enabled,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 4),
          child: Text(
            '$label :',
            style: const TextStyle(
              fontSize: 10.5,
              color: Color(0xFF746B6E),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        AppDropdown<int>(
          value: value,
          items: items,
          hintText: hint,
          enabled: enabled,
          onChanged: enabled ? onChanged : null,
          fieldHeight: 35,
          itemHeight: 38,
          borderRadius: 18,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          borderColor: const Color(0xFFDCE5E9),
          fillColor: const Color(0xFFFFFDFD),
          textStyle: const TextStyle(
            fontFamily: 'Sansation',
            fontSize: 10.5,
            color: Color(0xFF4C4548),
          ),
          hintStyle: const TextStyle(
            fontFamily: 'Sansation',
            fontSize: 10,
            color: Color(0xFFAAA0A4),
          ),
        ),
      ],
    );
  }
}

class _TimerControls extends StatelessWidget {
  final TimerPhase phase;
  final bool busy;
  final bool canStart;
  final VoidCallback onStart;
  final VoidCallback onPause;
  final VoidCallback onResume;
  final VoidCallback onFinish;

  const _TimerControls({
    required this.phase,
    required this.busy,
    required this.canStart,
    required this.onStart,
    required this.onPause,
    required this.onResume,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    if (busy) {
      return const SizedBox(
        height: 43,
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }
    if (phase == TimerPhase.idle) {
      return _RoundControlButton(
        key: const Key('timer-start-button'),
        icon: Icons.play_arrow_rounded,
        background: const Color(0xFFD9F2CA),
        border: const Color(0xFF9FCF86),
        foreground: const Color(0xFF6DA654),
        onPressed: canStart ? onStart : null,
        tooltip: 'เริ่มจับเวลา',
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (phase == TimerPhase.running)
          _RoundControlButton(
            key: const Key('timer-pause-button'),
            icon: Icons.pause_rounded,
            background: const Color(0xFFFFE5A6),
            border: const Color(0xFFEFCA75),
            foreground: const Color(0xFFA97924),
            onPressed: onPause,
            tooltip: 'หยุดชั่วคราว',
          )
        else
          _RoundControlButton(
            key: const Key('timer-resume-button'),
            icon: Icons.play_arrow_rounded,
            background: const Color(0xFFD9F2CA),
            border: const Color(0xFF9FCF86),
            foreground: const Color(0xFF6DA654),
            onPressed: onResume,
            tooltip: 'จับเวลาต่อ',
          ),
        const SizedBox(width: 14),
        _RoundControlButton(
          key: const Key('timer-finish-button'),
          icon: Icons.stop_rounded,
          background: const Color(0xFFFFD7DC),
          border: const Color(0xFFEFB0B8),
          foreground: const Color(0xFFB65D69),
          onPressed: onFinish,
          tooltip: 'เลิกจับเวลา',
        ),
      ],
    );
  }
}

class _RoundControlButton extends StatelessWidget {
  final IconData icon;
  final Color background;
  final Color border;
  final Color foreground;
  final VoidCallback? onPressed;
  final String tooltip;

  const _RoundControlButton({
    super.key,
    required this.icon,
    required this.background,
    required this.border,
    required this.foreground,
    required this.onPressed,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: 43,
          height: 43,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: disabled ? const Color(0xFFE7E4E4) : background,
            border: Border.all(
              color: disabled ? const Color(0xFFD8D4D4) : border,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1F5A4F49),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Icon(
            icon,
            color: disabled ? Colors.white : foreground,
            size: 24,
          ),
        ),
      ),
    );
  }
}
