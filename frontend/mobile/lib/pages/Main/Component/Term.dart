import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../interfaces/term.interface.dart';
import '../../../services/term.service.dart';
import 'TermDetailsPopup.dart';

class Term extends StatefulWidget {
  final TermRepository? repository;

  const Term({super.key, this.repository});

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
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('term-card'),
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 122),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: const Color(0xFFAFAFAF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3D4B5D66),
            blurRadius: 10,
            offset: Offset(0, 6),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            '*กรุณาระบุข้อมูลเทอมก่อนใช้งาน*',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 17, color: Color(0xFF9CC5F9)),
          ),
          const SizedBox(height: 11),
          SizedBox(
            width: 106,
            height: 46,
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
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(
                      Icons.add_rounded,
                      size: 34,
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
    final start = term.startFinal ?? term.startMidterm;
    final end = term.endFinal ?? term.endMidterm;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        key: const Key('current-term-card'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: const Color(0xFFB9DFF0),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(13, 12, 13, 13),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _MiniTermValue(
                      label: 'ชั้นปีที่',
                      value: term.yearLevel,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    flex: 2,
                    child: _MiniTermValue(
                      label: 'ปีการศึกษา',
                      value: term.academicYear,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: _MiniTermValue(label: 'เทอม', value: term.term),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Text('สัปดาห์สอบ', style: TextStyle(fontSize: 13)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: const Color(0xFFC8C8C8)),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          '${formatThaiTermDate(start)} – ${formatThaiTermDate(end)}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF242424),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniTermValue extends StatelessWidget {
  final String label;
  final String value;

  const _MiniTermValue({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        FittedBox(child: Text(label, style: const TextStyle(fontSize: 12))),
        const SizedBox(height: 5),
        Container(
          height: 34,
          width: double.infinity,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 5),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFC8C8C8)),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(value, style: const TextStyle(fontSize: 16)),
          ),
        ),
      ],
    );
  }
}

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
  DateTime? _examStart;
  DateTime? _examEnd;

  @override
  void dispose() {
    _academicYearController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final now = DateTime.now();
    final initial = isStart
        ? (_examStart ?? now)
        : (_examEnd ?? _examStart?.add(const Duration(days: 1)) ?? now);
    final firstDate = isStart
        ? DateTime(now.year - 2)
        : (_examStart ?? DateTime(now.year - 2));
    final result = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(firstDate) ? firstDate : initial,
      firstDate: firstDate,
      lastDate: DateTime(now.year + 10),
    );
    if (result == null || !mounted) return;
    setState(() {
      if (isStart) {
        _examStart = result;
        if (_examEnd != null && !_examEnd!.isAfter(result)) {
          _examEnd = null;
        }
      } else {
        _examEnd = result;
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
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop(
      CreateTermRequest(
        yearLevel: _yearLevel!,
        term: _term!,
        academicYear: _academicYearController.text.trim(),
        examStartDate: _examStart!,
        examEndDate: _examEnd!,
      ),
    );
  }

  InputDecoration _decoration(String hint) {
    return InputDecoration(
      hintText: hint,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: const BorderSide(color: Color(0xFFC8C8C8)),
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
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFAFAFAF)),
      ),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
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
                const Text('สร้างเทอม', style: TextStyle(fontSize: 20)),
                const SizedBox(height: 18),
                _FormRow(
                  label: 'ชั้นปีที่',
                  child: DropdownButtonFormField<String>(
                    key: const Key('year-level-field'),
                    isExpanded: true,
                    initialValue: _yearLevel,
                    decoration: _decoration('เลือกชั้นปี'),
                    items: List.generate(
                      8,
                      (index) => DropdownMenuItem(
                        value: '${index + 1}',
                        child: Text('${index + 1}'),
                      ),
                    ),
                    onChanged: (value) => setState(() => _yearLevel = value),
                    validator: (value) =>
                        value == null ? 'กรุณาเลือกชั้นปี' : null,
                  ),
                ),
                const SizedBox(height: 12),
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
                const SizedBox(height: 12),
                _FormRow(
                  label: 'เทอม',
                  child: DropdownButtonFormField<String>(
                    key: const Key('term-number-field'),
                    isExpanded: true,
                    initialValue: _term,
                    decoration: _decoration('เลือกเทอม'),
                    items: const [
                      DropdownMenuItem(value: '1', child: Text('1')),
                      DropdownMenuItem(value: '2', child: Text('2')),
                      DropdownMenuItem(value: '3', child: Text('3')),
                    ],
                    onChanged: (value) => setState(() => _term = value),
                    validator: (value) =>
                        value == null ? 'กรุณาเลือกเทอม' : null,
                  ),
                ),
                const SizedBox(height: 12),
                _DateFormField(
                  key: const Key('exam-start-field'),
                  label: 'วันเริ่มสอบ',
                  value: _displayDate(_examStart),
                  onTap: () => _pickDate(isStart: true),
                  validator: () =>
                      _examStart == null ? 'กรุณาเลือกวันเริ่มสอบ' : null,
                ),
                const SizedBox(height: 12),
                _DateFormField(
                  key: const Key('exam-end-field'),
                  label: 'วันสิ้นสุด',
                  value: _displayDate(_examEnd),
                  onTap: _examStart == null
                      ? null
                      : () => _pickDate(isStart: false),
                  validator: () {
                    if (_examEnd == null) {
                      return 'กรุณาเลือกวันสิ้นสุด';
                    }
                    if (!_examEnd!.isAfter(_examStart!)) {
                      return 'วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 22),
                OutlinedButton(
                  key: const Key('confirm-term-button'),
                  onPressed: _submit,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF555555),
                    side: const BorderSide(color: Color(0xFFC8C8C8)),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 26,
                      vertical: 11,
                    ),
                    shape: const StadiumBorder(),
                  ),
                  child: const Text('ยืนยัน'),
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
          width: 90,
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(label, style: const TextStyle(fontSize: 15)),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _DateFormField extends FormField<DateTime> {
  _DateFormField({
    super.key,
    required String label,
    required String value,
    required VoidCallback? onTap,
    required String? Function() validator,
  }) : super(
         validator: (_) => validator(),
         builder: (state) {
           return _FormRow(
             label: label,
             child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 InkWell(
                   onTap: onTap,
                   borderRadius: BorderRadius.circular(24),
                   child: Container(
                     height: 44,
                     padding: const EdgeInsets.symmetric(horizontal: 14),
                     decoration: BoxDecoration(
                       color: onTap == null
                           ? const Color(0xFFF5F5F5)
                           : Colors.white,
                       borderRadius: BorderRadius.circular(24),
                       border: Border.all(
                         color: state.hasError
                             ? const Color(0xFFE14F79)
                             : const Color(0xFFC8C8C8),
                       ),
                     ),
                     child: Row(
                       children: [
                         Expanded(
                           child: Text(
                             value,
                             style: const TextStyle(
                               fontSize: 14,
                               color: Color(0xFF777777),
                             ),
                           ),
                         ),
                         const Icon(
                           Icons.calendar_month_outlined,
                           size: 19,
                           color: Color(0xFF7897AC),
                         ),
                       ],
                     ),
                   ),
                 ),
                 if (state.hasError)
                   Padding(
                     padding: const EdgeInsets.only(left: 12, top: 5),
                     child: Text(
                       state.errorText!,
                       style: const TextStyle(
                         fontSize: 12,
                         color: Color(0xFFE14F79),
                       ),
                     ),
                   ),
               ],
             ),
           );
         },
       );
}
