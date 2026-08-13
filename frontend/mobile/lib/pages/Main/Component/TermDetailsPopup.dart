import 'package:flutter/material.dart';

import '../../../interfaces/term.interface.dart';
import '../../../common/DateTimeFormat.dart';

String formatThaiTermDate(DateTime? date) {
  if (date == null) return '—';
  return formatDisplayDate(date);
}

Future<bool?> showTermDetailsPopup(
  BuildContext context, {
  required CurrentTerm term,
  required Future<void> Function() onEndTerm,
}) {
  return showDialog<bool>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.30),
    builder: (_) => _TermDetailsPopup(term: term, onEndTerm: onEndTerm),
  );
}

class _TermDetailsPopup extends StatefulWidget {
  final CurrentTerm term;
  final Future<void> Function() onEndTerm;

  const _TermDetailsPopup({required this.term, required this.onEndTerm});

  @override
  State<_TermDetailsPopup> createState() => _TermDetailsPopupState();
}

class _TermDetailsPopupState extends State<_TermDetailsPopup> {
  bool _isEnding = false;
  String? _error;

  Future<void> _endTerm() async {
    if (_isEnding) return;
    setState(() {
      _isEnding = true;
      _error = null;
    });
    try {
      await widget.onEndTerm();
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isEnding = false;
        _error = '$error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final term = widget.term;

    return Dialog(
      key: const Key('term-details-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFAFAFAF)),
      ),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  key: const Key('close-term-details'),
                  onPressed: () => Navigator.of(context).pop(false),
                  icon: const Icon(Icons.close_rounded),
                  color: const Color(0xFFEC4F78),
                  iconSize: 25,
                  tooltip: 'ปิดรายละเอียดเทอม',
                ),
              ),
              const Text(
                'รายละเอียดเทอมปัจจุบัน',
                style: TextStyle(fontSize: 19, color: Color(0xFF333333)),
              ),
              const SizedBox(height: 18),
              _DetailRow(label: 'ชั้นปีที่', value: term.yearLevel),
              const SizedBox(height: 11),
              _DetailRow(
                label: 'ปีการศึกษา',
                value: term.academicYear,
                wide: true,
              ),
              const SizedBox(height: 11),
              _DetailRow(label: 'เทอม', value: term.term),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF4FAFD),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFB9D9E7)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ช่วงสัปดาห์สอบ',
                      style: TextStyle(fontSize: 14, color: Color(0xFF6A8795)),
                    ),
                    const SizedBox(height: 9),
                    _PopupExamRange(
                      label: 'สอบกลางภาค',
                      start: term.startMidterm,
                      end: term.endMidterm,
                    ),
                    const SizedBox(height: 8),
                    _PopupExamRange(
                      label: 'สอบปลายภาค',
                      start: term.startFinal,
                      end: term.endFinal,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 19),
              const Text(
                '*เมื่อจบเทอมแล้วกรุณากดปุ่มจบเทอมเพื่อเริ่มเทอมใหม่',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Color(0xFF555555)),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFE14F79),
                  ),
                ),
              ],
              const SizedBox(height: 17),
              OutlinedButton(
                key: const Key('end-term-button'),
                onPressed: _isEnding ? null : _endTerm,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF333333),
                  side: const BorderSide(color: Color(0xFF8F8F8F)),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 8,
                  ),
                  shape: const StadiumBorder(),
                ),
                child: Text(_isEnding ? 'กำลังจบเทอม...' : 'จบเทอม'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool wide;

  const _DetailRow({
    required this.label,
    required this.value,
    this.wide = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 96,
          child: Text(label, style: const TextStyle(fontSize: 16)),
        ),
        Container(
          height: 36,
          constraints: BoxConstraints(minWidth: wide ? 104 : 64),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFB9DFF0),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFF83AFC3)),
          ),
          child: Text(
            value,
            maxLines: 1,
            style: const TextStyle(fontSize: 16, color: Color(0xFF4A5F6B)),
          ),
        ),
      ],
    );
  }
}

class _PopupExamRange extends StatelessWidget {
  final String label;
  final DateTime? start;
  final DateTime? end;

  const _PopupExamRange({
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
            style: const TextStyle(fontSize: 13, color: Color(0xFF506E7C)),
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          child: Container(
            height: 36,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFB9DFF0),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFF83AFC3)),
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                '${formatThaiTermDate(start)} – ${formatThaiTermDate(end)}',
                maxLines: 1,
                style: const TextStyle(fontSize: 13, color: Color(0xFF4A5F6B)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
