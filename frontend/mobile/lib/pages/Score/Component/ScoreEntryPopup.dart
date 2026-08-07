import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../interfaces/score.interface.dart';

Future<WorkloadScoreInput?> showScoreEntryPopup(
  BuildContext context, {
  required WorkloadScore workload,
  required double maximumAllowed,
}) {
  return showDialog<WorkloadScoreInput>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.30),
    builder: (_) =>
        _ScoreEntryPopup(workload: workload, maximumAllowed: maximumAllowed),
  );
}

class _ScoreEntryPopup extends StatefulWidget {
  final WorkloadScore workload;
  final double maximumAllowed;

  const _ScoreEntryPopup({
    required this.workload,
    required this.maximumAllowed,
  });

  @override
  State<_ScoreEntryPopup> createState() => _ScoreEntryPopupState();
}

class _ScoreEntryPopupState extends State<_ScoreEntryPopup> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _actualController;
  late final TextEditingController _maximumController;

  @override
  void initState() {
    super.initState();
    _actualController = TextEditingController(
      text: widget.workload.actualScore?.toString() ?? '',
    );
    _maximumController = TextEditingController(
      text: widget.workload.maxScore?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _actualController.dispose();
    _maximumController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop(
      WorkloadScoreInput(
        actualScore: double.parse(_actualController.text),
        maximumScore: double.parse(_maximumController.text),
      ),
    );
  }

  String? _validateActual(String? value) {
    final actual = double.tryParse(value ?? '');
    final maximum = double.tryParse(_maximumController.text);
    if (actual == null || actual < 0) return 'กรุณากรอกคะแนนที่ถูกต้อง';
    if (maximum != null && actual > maximum) {
      return 'คะแนนที่ได้ต้องไม่เกินคะแนนเต็ม';
    }
    return null;
  }

  String? _validateMaximum(String? value) {
    final maximum = double.tryParse(value ?? '');
    if (maximum == null || maximum <= 0) return 'คะแนนเต็มต้องมากกว่า 0';
    if (maximum > widget.maximumAllowed) {
      return 'คะแนนสะสมของวิชาต้องไม่เกิน 100';
    }
    final actual = double.tryParse(_actualController.text);
    if (actual != null && actual > maximum) {
      return 'คะแนนเต็มต้องไม่น้อยกว่าคะแนนที่ได้';
    }
    return null;
  }

  InputDecoration _decoration(String hint) {
    return InputDecoration(
      hintText: hint,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(22)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(22),
        borderSide: const BorderSide(color: Color(0xFFC8C8C8)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(22),
        borderSide: const BorderSide(color: Color(0xFFF080A7)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      key: const Key('score-entry-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 22),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFD3D3D3)),
      ),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 22),
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
                    color: const Color(0xFFEC6688),
                  ),
                ),
                const Text(
                  'กรอกคะแนน',
                  style: TextStyle(fontSize: 20, color: Color(0xFF3A4E58)),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.workload.workloadName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF7A8E97),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        key: const Key('actual-score-field'),
                        controller: _actualController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'^\d*\.?\d{0,2}'),
                          ),
                        ],
                        decoration: _decoration('คะแนนที่ได้'),
                        validator: _validateActual,
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.fromLTRB(8, 11, 8, 0),
                      child: Text('/'),
                    ),
                    Expanded(
                      child: TextFormField(
                        key: const Key('maximum-score-field'),
                        controller: _maximumController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'^\d*\.?\d{0,2}'),
                          ),
                        ],
                        decoration: _decoration('คะแนนเต็ม'),
                        validator: _validateMaximum,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Center(
                  child: FilledButton(
                    key: const Key('save-score-button'),
                    onPressed: _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF9CCFE8),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 10,
                      ),
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('บันทึก'),
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
