import 'package:flutter/material.dart';

import '../../../interfaces/term.interface.dart';

const _thaiMonths = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

String formatThaiTermDate(DateTime? date) {
  if (date == null) return '—';
  return '${date.day} ${_thaiMonths[date.month - 1]}';
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
    final start = term.startFinal ?? term.startMidterm;
    final end = term.endFinal ?? term.endMidterm;

    return Dialog(
      key: const Key('term-details-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFAFAFAF)),
      ),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 14, 22, 24),
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
                  iconSize: 30,
                  tooltip: 'ปิดรายละเอียดเทอม',
                ),
              ),
              const Text(
                'รายละเอียดเทอมปัจจุบัน',
                style: TextStyle(fontSize: 20, color: Color(0xFF333333)),
              ),
              const SizedBox(height: 22),
              _DetailRow(label: 'ชั้นปีที่', value: term.yearLevel),
              const SizedBox(height: 14),
              _DetailRow(label: 'ปีการศึกษา', value: term.academicYear),
              const SizedBox(height: 14),
              _DetailRow(label: 'เทอม', value: term.term),
              const SizedBox(height: 14),
              _DetailRow(
                label: 'สัปดาห์สอบ',
                value:
                    '${formatThaiTermDate(start)} – ${formatThaiTermDate(end)}',
                compact: true,
              ),
              const SizedBox(height: 24),
              const Text(
                '*เมื่อจบเทอมแล้วกรุณากดปุ่มจบเทอมเพื่อเริ่มเทอมใหม่',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Color(0xFF333333)),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFE14F79),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              OutlinedButton(
                key: const Key('end-term-button'),
                onPressed: _isEnding ? null : _endTerm,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF333333),
                  backgroundColor: const Color(0xFF9CC5F9),
                  side: const BorderSide(color: Color(0xFF8F8F8F)),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 28,
                    vertical: 11,
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
  final bool compact;

  const _DetailRow({
    required this.label,
    required this.value,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 92,
          child: Text(label, style: const TextStyle(fontSize: 16)),
        ),
        Expanded(
          child: Container(
            constraints: const BoxConstraints(minHeight: 46),
            alignment: Alignment.center,
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 10 : 18,
              vertical: 10,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFB9DFF0),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: const Color(0xFF83AFC3)),
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value,
                maxLines: 1,
                style: TextStyle(
                  fontSize: compact ? 16 : 20,
                  color: const Color(0xFF4A5F6B),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
