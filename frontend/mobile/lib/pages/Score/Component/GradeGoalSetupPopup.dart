import 'package:flutter/material.dart';

import '../../../common/AppDropdown.dart';
import '../../../interfaces/score.interface.dart';

class GradeGoalSetupPrompt extends StatelessWidget {
  final bool isSaving;
  final VoidCallback onPressed;

  const GradeGoalSetupPrompt({
    super.key,
    required this.isSaving,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('grade-goal-setup-prompt'),
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 380),
      padding: const EdgeInsets.fromLTRB(22, 30, 22, 26),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Color(0xFFF2FAFF), Color(0xFFE4F4FF)],
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFB8DDF6)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2974AFCF),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 78,
            height: 78,
            decoration: const BoxDecoration(
              color: Color(0xFFDFF3FF),
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Color(0xB3FFFFFF), spreadRadius: 8)],
            ),
            child: const Icon(
              Icons.gps_fixed_rounded,
              size: 39,
              color: Color(0xFF58AEE1),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'เริ่มต้นวางแผนเทอมนี้',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF5594B9),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'ตั้งเป้าหมายเกรดก่อนนะ',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 19,
              color: Color(0xFF244B63),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'เลือกเกรดที่อยากได้ให้ครบทุกวิชา แล้วดู GPA ที่คาดหวังได้ทันที',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF68889A),
              height: 1.55,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xCCFFFFFF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCDE7F7)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  size: 20,
                  color: Color(0xFF4CA6DC),
                ),
                SizedBox(width: 7),
                Expanded(
                  child: Text(
                    'เมื่อบันทึกแล้วจะไม่สามารถแก้ไขเป้าหมายเกรดได้',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF668396),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            key: const Key('select-grade-goals-button'),
            onPressed: isSaving ? null : onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF66B8E8),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
              shape: const StadiumBorder(),
            ),
            child: isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('ตั้งเป้าหมายเกรด'),
          ),
        ],
      ),
    );
  }
}

Future<Map<int, String>?> showGradeGoalSetupPopup(
  BuildContext context, {
  required List<SubjectScore> subjects,
}) {
  return showDialog<Map<int, String>>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.30),
    builder: (_) => _GradeGoalSetupPopup(subjects: subjects),
  );
}

class _GradeGoalSetupPopup extends StatefulWidget {
  final List<SubjectScore> subjects;

  const _GradeGoalSetupPopup({required this.subjects});

  @override
  State<_GradeGoalSetupPopup> createState() => _GradeGoalSetupPopupState();
}

class _GradeGoalSetupPopupState extends State<_GradeGoalSetupPopup> {
  late final Map<int, String> _selectedGrades;
  String? _validationMessage;

  @override
  void initState() {
    super.initState();
    _selectedGrades = {
      for (final subject in widget.subjects)
        if (subject.targetScore != null)
          subject.scheduleTimeId: gradeFromGpa(subject.targetScore!),
    };
  }

  bool get _isComplete => widget.subjects.every(
    (subject) => _selectedGrades.containsKey(subject.scheduleTimeId),
  );

  double? get _targetGpa {
    if (!_isComplete || widget.subjects.isEmpty) return null;
    final totalCredits = widget.subjects.fold<double>(
      0,
      (sum, subject) => sum + subject.credits,
    );
    if (totalCredits <= 0) return 0;
    final gradePoints = widget.subjects.fold<double>(
      0,
      (sum, subject) =>
          sum +
          (gpaFromGrade(_selectedGrades[subject.scheduleTimeId]!) *
              subject.credits),
    );
    return gradePoints / totalCredits;
  }

  Future<void> _save() async {
    if (!_isComplete) {
      setState(() {
        _validationMessage = 'กรุณาเลือกเกรดเป้าหมายให้ครบทุกวิชา';
      });
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        key: const Key('confirm-grade-goals-popup'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        backgroundColor: Colors.white,
        icon: const CircleAvatar(
          backgroundColor: Color(0xFFFFF3D8),
          child: Icon(Icons.warning_amber_rounded, color: Color(0xFFE5A637)),
        ),
        title: const Text(
          'ยืนยันเป้าหมายนี้ใช่ไหม?',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Color(0xFF244B63),
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          'GPA เป้าหมายของเทอมนี้คือ ${_targetGpa!.toStringAsFixed(2)} เมื่อยืนยันแล้วจะไม่สามารถแก้ไขได้',
          textAlign: TextAlign.center,
          style: const TextStyle(color: Color(0xFF6B8492), height: 1.5),
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          OutlinedButton(
            key: const Key('back-to-grade-goals-button'),
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('กลับไปตรวจสอบ'),
          ),
          FilledButton(
            key: const Key('confirm-grade-goals-button'),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF5EB3E4),
            ),
            child: const Text('ยืนยันและบันทึก'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    Navigator.of(context).pop(Map<int, String>.from(_selectedGrades));
  }

  @override
  Widget build(BuildContext context) {
    final targetGpa = _targetGpa;
    return Dialog(
      key: const Key('grade-goal-setup-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 22),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFD0D0D0)),
      ),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 420,
          maxHeight: MediaQuery.sizeOf(context).height * 0.86,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 8, 0),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'เลือกเป้าหมายเกรด',
                      style: TextStyle(
                        fontSize: 18,
                        color: Color(0xFF415660),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    key: const Key('close-grade-goal-popup'),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                    color: const Color(0xFFEC6688),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(18, 4, 18, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    size: 19,
                    color: Color(0xFFE36587),
                  ),
                  SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      'โปรดตรวจสอบให้เรียบร้อย เป้าหมายเกรดจะไม่สามารถแก้ไขได้หลังบันทึก',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFFC85272),
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              height: 38,
              margin: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFC7D1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  SizedBox(width: 36, child: Center(child: Text('No'))),
                  Expanded(child: Center(child: Text('วิชา'))),
                  SizedBox(width: 84, child: Center(child: Text('เกรด'))),
                ],
              ),
            ),
            Flexible(
              child: ListView.separated(
                key: const Key('grade-goal-subject-list'),
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                itemCount: widget.subjects.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final subject = widget.subjects[index];
                  final isLocked = subject.targetScore != null;
                  return SizedBox(
                    key: Key('grade-goal-row-$index'),
                    height: 62,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 36,
                          child: Center(child: Text('${index + 1}')),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  subject.subjectName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${subject.subjectId} · ${_creditText(subject.credits)} หน่วยกิต',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF85939A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 84,
                          child: AppDropdown<String>(
                            key: Key('goal-grade-${subject.scheduleTimeId}'),
                            value: _selectedGrades[subject.scheduleTimeId],
                            enabled: !isLocked,
                            hintText: '—',
                            items: gradeOptions
                                .map(
                                  (grade) => AppDropdownItem(
                                    value: grade,
                                    label: grade,
                                  ),
                                )
                                .toList(),
                            onChanged: isLocked
                                ? null
                                : (grade) {
                                    setState(() {
                                      _validationMessage = null;
                                      if (grade == null) {
                                        _selectedGrades.remove(
                                          subject.scheduleTimeId,
                                        );
                                      } else {
                                        _selectedGrades[subject
                                                .scheduleTimeId] =
                                            grade;
                                      }
                                    });
                                  },
                            fieldHeight: 38,
                            itemHeight: 38,
                            borderRadius: 18,
                            padding: const EdgeInsets.symmetric(horizontal: 9),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Container(
              key: const Key('grade-goal-calculation'),
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(14, 12, 14, 0),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF3FAFD),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFCBE1EA)),
              ),
              child: Column(
                children: [
                  const Text(
                    'GPA เป้าหมายที่คำนวณได้',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: Color(0xFF5D7682)),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    targetGpa == null
                        ? '— / 4.00'
                        : '${targetGpa.toStringAsFixed(2)} / 4.00',
                    key: const Key('calculated-target-gpa'),
                    style: const TextStyle(
                      fontSize: 18,
                      color: Color(0xFF5EA7C7),
                    ),
                  ),
                ],
              ),
            ),
            if (_validationMessage != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
                child: Text(
                  _validationMessage!,
                  key: const Key('grade-goal-validation-message'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFC85272),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
              child: FilledButton(
                key: const Key('save-grade-goals-button'),
                onPressed: _save,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF9CCFE8),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 11,
                  ),
                  shape: const StadiumBorder(),
                ),
                child: const Text('ตรวจสอบและบันทึก'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _creditText(double value) =>
    value == value.roundToDouble() ? '${value.toInt()}' : '$value';
