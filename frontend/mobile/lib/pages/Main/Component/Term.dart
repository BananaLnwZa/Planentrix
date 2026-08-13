import 'package:flutter/material.dart';
import '../../../common/AppDatePicker.dart';
import '../../../common/AppDropdown.dart';
import 'package:flutter/services.dart';

import '../../../interfaces/term.interface.dart';
import '../../../services/term.service.dart';
import 'TermDetailsPopup.dart';

class Term extends StatefulWidget {
  final TermRepository? repository;
  final ValueChanged<CurrentTerm?>? onTermChanged;

  const Term({super.key, this.repository, this.onTermChanged});

  @override
  State<Term> createState() => _TermState();
}

class _TermState extends State<Term> {
  late final TermRepository _repository;
  CurrentTerm? _currentTerm;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? TermService();
    _loadTerm();
  }

  Future<void> _loadTerm() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final term = await _repository.getCurrentTerm();
      if (!mounted) return;
      setState(() => _currentTerm = term);
      widget.onTermChanged?.call(term);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openCreateForm() async {
    final request = await showDialog<CreateTermRequest>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.30),
      builder: (_) => const _CreateTermPopup(),
    );
    if (request == null || !mounted) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final term = await _repository.createTerm(request);
      if (!mounted) return;
      setState(() => _currentTerm = term);
      widget.onTermChanged?.call(term);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _openDetails() async {
    final term = _currentTerm;
    if (term == null) return;
    final ended = await showTermDetailsPopup(
      context,
      term: term,
      onEndTerm: _repository.endCurrentTerm,
    );
    if (ended == true && mounted) {
      setState(() {
        _currentTerm = null;
        _error = null;
      });
      widget.onTermChanged?.call(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('term-card'),
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 98),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: const Color(0xFFAFAFAF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x384B5D66),
            blurRadius: 9,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        key: Key('term-loading'),
        child: SizedBox(
          width: 25,
          height: 25,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      );
    }

    final term = _currentTerm;
    if (term != null) {
      return _CurrentTermCard(term: term, onTap: _openDetails);
    }

    return Padding(
      key: const Key('term-empty'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            '*กรุณาระบุข้อมูลเทอมก่อนใช้งาน*',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18, color: Color(0xFF9CC5F9)),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: 92,
            height: 40,
            child: FilledButton(
              key: const Key('add-term-button'),
              onPressed: _isSubmitting ? null : _openCreateForm,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFA9DDFC),
                disabledBackgroundColor: const Color(0xFFA9DDFC),
                shape: const StadiumBorder(),
                padding: EdgeInsets.zero,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(
                      Icons.add_rounded,
                      size: 27,
                      color: Colors.white,
                    ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Color(0xFFE14F79)),
            ),
          ],
        ],
      ),
    );
  }
}

class _CurrentTermCard extends StatelessWidget {
  final CurrentTerm term;
  final VoidCallback onTap;

  const _CurrentTermCard({required this.term, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        key: const Key('current-term-card'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: const Color(0xFFB9DFF0),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  children: [
                    _InlineTermValue(label: 'ชั้นปีที่', value: term.yearLevel),
                    const SizedBox(width: 10),
                    _InlineTermValue(
                      label: 'ปีการศึกษา',
                      value: term.academicYear,
                      minWidth: 72,
                    ),
                    const SizedBox(width: 10),
                    _InlineTermValue(label: 'เทอม', value: term.term),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF6FBFD),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    _ExamRangeRow(
                      label: 'สอบกลางภาค',
                      start: term.startMidterm,
                      end: term.endMidterm,
                    ),
                    const SizedBox(height: 6),
                    _ExamRangeRow(
                      label: 'สอบปลายภาค',
                      start: term.startFinal,
                      end: term.endFinal,
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

class _InlineTermValue extends StatelessWidget {
  final String label;
  final String value;
  final double minWidth;

  const _InlineTermValue({
    required this.label,
    required this.value,
    this.minWidth = 46,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        const SizedBox(width: 5),
        Container(
          height: 31,
          constraints: BoxConstraints(minWidth: minWidth),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 9),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFC8C8C8)),
          ),
          child: Text(value, style: const TextStyle(fontSize: 16, height: 1)),
        ),
      ],
    );
  }
}

class _ExamRangeRow extends StatelessWidget {
  final String label;
  final DateTime? start;
  final DateTime? end;

  const _ExamRangeRow({
    required this.label,
    required this.start,
    required this.end,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 82,
          child: Text(
            label,
            maxLines: 1,
            style: const TextStyle(fontSize: 12, color: Color(0xFF688492)),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Container(
            height: 28,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFC8C8C8)),
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                '${formatThaiTermDate(start)} – ${formatThaiTermDate(end)}',
                maxLines: 1,
                style: const TextStyle(fontSize: 12, color: Color(0xFF242424)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

enum _TermDateField { midtermStart, midtermEnd, finalStart, finalEnd }

class _CreateTermPopup extends StatefulWidget {
  const _CreateTermPopup();

  @override
  State<_CreateTermPopup> createState() => _CreateTermPopupState();
}

class _CreateTermPopupState extends State<_CreateTermPopup> {
  final _formKey = GlobalKey<FormState>();
  final _academicYearController = TextEditingController();
  String? _yearLevel;
  String? _term;
  DateTime? _midtermStart;
  DateTime? _midtermEnd;
  DateTime? _finalStart;
  DateTime? _finalEnd;

  bool get _isComplete =>
      _yearLevel != null &&
      _term != null &&
      RegExp(r'^\d{4}$').hasMatch(_academicYearController.text.trim()) &&
      _midtermStart != null &&
      _midtermEnd != null &&
      _finalStart != null &&
      _finalEnd != null &&
      _datesAreValid;

  bool get _datesAreValid =>
      _midtermStart != null &&
      _midtermEnd != null &&
      _midtermEnd!.isAfter(_midtermStart!) &&
      _finalStart != null &&
      _finalStart!.isAfter(_midtermEnd!) &&
      _finalEnd != null &&
      _finalEnd!.isAfter(_finalStart!);

  @override
  void initState() {
    super.initState();
    _academicYearController.addListener(_refresh);
  }

  @override
  void dispose() {
    _academicYearController
      ..removeListener(_refresh)
      ..dispose();
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  DateTime? _dateFor(_TermDateField field) {
    return switch (field) {
      _TermDateField.midtermStart => _midtermStart,
      _TermDateField.midtermEnd => _midtermEnd,
      _TermDateField.finalStart => _finalStart,
      _TermDateField.finalEnd => _finalEnd,
    };
  }

  DateTime? _minimumFor(_TermDateField field) {
    return switch (field) {
      _TermDateField.midtermStart => null,
      _TermDateField.midtermEnd => _midtermStart?.add(const Duration(days: 1)),
      _TermDateField.finalStart => _midtermEnd?.add(const Duration(days: 1)),
      _TermDateField.finalEnd => _finalStart?.add(const Duration(days: 1)),
    };
  }

  Future<void> _pickDate(_TermDateField field) async {
    final now = DateTime.now();
    final minimum = _minimumFor(field) ?? DateTime(now.year - 2);
    final current = _dateFor(field);
    final initial = current == null || current.isBefore(minimum)
        ? minimum
        : current;
    final result = await showAppDatePicker(
      context: context,
      initialDate: initial,
      firstDate: minimum,
      lastDate: DateTime(now.year + 10),
    );
    if (result == null || !mounted) return;

    setState(() {
      switch (field) {
        case _TermDateField.midtermStart:
          _midtermStart = result;
          if (_midtermEnd != null && !_midtermEnd!.isAfter(result)) {
            _midtermEnd = null;
            _finalStart = null;
            _finalEnd = null;
          }
        case _TermDateField.midtermEnd:
          _midtermEnd = result;
          if (_finalStart != null && !_finalStart!.isAfter(result)) {
            _finalStart = null;
            _finalEnd = null;
          }
        case _TermDateField.finalStart:
          _finalStart = result;
          if (_finalEnd != null && !_finalEnd!.isAfter(result)) {
            _finalEnd = null;
          }
        case _TermDateField.finalEnd:
          _finalEnd = result;
      }
    });
    _formKey.currentState?.validate();
  }

  String _displayDate(DateTime? date) {
    if (date == null) return 'เลือกวันที่';
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    return '$day/$month/${date.year}';
  }

  void _submit() {
    if (!_isComplete || !(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop(
      CreateTermRequest(
        yearLevel: _yearLevel!,
        term: _term!,
        academicYear: _academicYearController.text.trim(),
        midtermStartDate: _midtermStart!,
        midtermEndDate: _midtermEnd!,
        finalStartDate: _finalStart!,
        finalEndDate: _finalEnd!,
      ),
    );
  }

  InputDecoration _decoration(String hint) {
    const borderColor = Color(0xFFC8C8C8);
    return InputDecoration(
      hintText: hint,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: const BorderSide(color: borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: const BorderSide(color: Color(0xFFF080A7)),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: const BorderSide(color: Color(0xFFE14F79)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: const BorderSide(color: Color(0xFFE14F79)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('term-create-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFAFAFAF)),
      ),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 22),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                    color: const Color(0xFFEC4F78),
                    tooltip: 'ปิดแบบฟอร์มสร้างเทอม',
                  ),
                ),
                const Text(
                  'สร้างเทอมใหม่',
                  style: TextStyle(fontSize: 20, color: Color(0xFF5C7C8B)),
                ),
                const SizedBox(height: 3),
                const Text(
                  'ระบุข้อมูลเทอมและช่วงสัปดาห์สอบให้ครบถ้วน',
                  style: TextStyle(fontSize: 12, color: Color(0xFF8AA0AA)),
                ),
                const SizedBox(height: 16),
                _FormRow(
                  label: 'ชั้นปีที่',
                  child: AppDropdown<String>(
                    key: const Key('year-level-field'),
                    value: _yearLevel,
                    hintText: 'เลือกชั้นปี',
                    items: List.generate(
                      4,
                      (index) => AppDropdownItem(
                        value: '${index + 1}',
                        label: '${index + 1}',
                      ),
                    ),
                    onChanged: (value) => setState(() => _yearLevel = value),
                    fieldHeight: 42,
                  ),
                ),
                const SizedBox(height: 10),
                _FormRow(
                  label: 'ปีการศึกษา',
                  child: TextFormField(
                    key: const Key('academic-year-field'),
                    controller: _academicYearController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(4),
                    ],
                    decoration: _decoration('เช่น 2569'),
                    validator: (value) =>
                        RegExp(r'^\d{4}$').hasMatch(value?.trim() ?? '')
                        ? null
                        : 'กรุณากรอกปี 4 หลัก',
                  ),
                ),
                const SizedBox(height: 10),
                _FormRow(
                  label: 'เทอม',
                  child: AppDropdown<String>(
                    key: const Key('term-number-field'),
                    value: _term,
                    hintText: 'เลือกเทอม',
                    items: const [
                      AppDropdownItem(value: '1', label: '1'),
                      AppDropdownItem(value: '2', label: '2'),
                    ],
                    onChanged: (value) => setState(() => _term = value),
                    fieldHeight: 42,
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FBFD),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFD7E7EE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ช่วงสัปดาห์สอบ',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF6D8996),
                        ),
                      ),
                      const SizedBox(height: 10),
                      _ExamWeekInput(
                        label: 'สอบกลางภาค',
                        startKey: const Key('midterm-start-field'),
                        endKey: const Key('midterm-end-field'),
                        startValue: _displayDate(_midtermStart),
                        endValue: _displayDate(_midtermEnd),
                        onStartTap: () =>
                            _pickDate(_TermDateField.midtermStart),
                        onEndTap: _midtermStart == null
                            ? null
                            : () => _pickDate(_TermDateField.midtermEnd),
                      ),
                      const SizedBox(height: 10),
                      _ExamWeekInput(
                        label: 'สอบปลายภาค',
                        startKey: const Key('final-start-field'),
                        endKey: const Key('final-end-field'),
                        startValue: _displayDate(_finalStart),
                        endValue: _displayDate(_finalEnd),
                        onStartTap: _midtermEnd == null
                            ? null
                            : () => _pickDate(_TermDateField.finalStart),
                        onEndTap: _finalStart == null
                            ? null
                            : () => _pickDate(_TermDateField.finalEnd),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 9),
                if (!_isComplete)
                  const SizedBox(
                    width: double.infinity,
                    child: Text(
                      '*กรุณากรอกข้อมูลทุกช่องก่อนสร้างเทอม',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Color(0xFF8AA0AA)),
                    ),
                  ),
                const SizedBox(height: 12),
                Center(
                  child: OutlinedButton(
                    key: const Key('confirm-term-button'),
                    onPressed: _isComplete ? _submit : null,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF555555),
                      disabledForegroundColor: const Color(0xFFAAAAAA),
                      side: const BorderSide(color: Color(0xFFC8C8C8)),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 26,
                        vertical: 9,
                      ),
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('ยืนยัน'),
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

class _FormRow extends StatelessWidget {
  final String label;
  final Widget child;

  const _FormRow({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 88,
          child: Padding(
            padding: const EdgeInsets.only(top: 11),
            child: Text(label, style: const TextStyle(fontSize: 15)),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _ExamWeekInput extends StatelessWidget {
  final String label;
  final Key startKey;
  final Key endKey;
  final String startValue;
  final String endValue;
  final VoidCallback? onStartTap;
  final VoidCallback? onEndTap;

  const _ExamWeekInput({
    required this.label,
    required this.startKey,
    required this.endKey,
    required this.startValue,
    required this.endValue,
    required this.onStartTap,
    required this.onEndTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: Color(0xFF506E7C)),
        ),
        const SizedBox(height: 5),
        Row(
          children: [
            Expanded(
              child: _DateButton(
                key: startKey,
                value: startValue,
                onTap: onStartTap,
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 5),
              child: Text('–', style: TextStyle(color: Color(0xFF8AA6B3))),
            ),
            Expanded(
              child: _DateButton(key: endKey, value: endValue, onTap: onEndTap),
            ),
          ],
        ),
      ],
    );
  }
}

class _DateButton extends StatelessWidget {
  final String value;
  final VoidCallback? onTap;

  const _DateButton({super.key, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: onTap == null ? const Color(0xFFF2F4F5) : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFC8C8C8)),
        ),
        child: Row(
          children: [
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  maxLines: 1,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF777777),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 3),
            const Icon(
              Icons.calendar_month_outlined,
              size: 16,
              color: Color(0xFFF080A7),
            ),
          ],
        ),
      ),
    );
  }
}
