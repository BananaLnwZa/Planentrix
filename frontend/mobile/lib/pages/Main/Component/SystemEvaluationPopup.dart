// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../interfaces/term.interface.dart';
import '../../../services/term.service.dart';

Future<bool> showSystemEvaluationPopup(
  BuildContext context, {
  required PendingSystemEvaluation evaluation,
  required TermRepository repository,
}) async {
  return await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        barrierColor: const Color(0x7323343B),
        builder: (_) => _SystemEvaluationPopup(
          evaluation: evaluation,
          repository: repository,
        ),
      ) ??
      false;
}

class _SystemEvaluationPopup extends StatefulWidget {
  final PendingSystemEvaluation evaluation;
  final TermRepository repository;

  const _SystemEvaluationPopup({
    required this.evaluation,
    required this.repository,
  });

  @override
  State<_SystemEvaluationPopup> createState() => _SystemEvaluationPopupState();
}

class _SystemEvaluationPopupState extends State<_SystemEvaluationPopup> {
  final _commentController = TextEditingController();
  int _satisfaction = 0;
  int _easeOfUse = 0;
  int _usefulness = 0;
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_satisfaction == 0 || _easeOfUse == 0 || _usefulness == 0) {
      setState(() => _error = 'กรุณาเลือกคะแนนให้ครบทุกข้อ');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.submitSystemEvaluation(
        widget.evaluation.studentTermId,
        SystemEvaluationAnswers(
          satisfaction: _satisfaction,
          easeOfUse: _easeOfUse,
          usefulness: _usefulness,
          comment: _commentController.text,
        ),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _error = '$error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final evaluation = widget.evaluation;
    return Dialog(
      key: const Key('system-evaluation-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      backgroundColor: const Color(0xFFFFFEFA),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: const BorderSide(color: Color(0xFFD7E8EE)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFE5F4FA),
                ),
                child: const Icon(
                  Icons.mark_chat_read_outlined,
                  color: Color(0xFF6198AE),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'ช่วยประเมิน Planentrix',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF405B69),
                ),
              ),
              const SizedBox(height: 5),
              Text(
                'ขอบคุณที่ใช้งานในภาคเรียน ${evaluation.semesterNo} '
                'ปีการศึกษา ${evaluation.academicYear}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Color(0xFF81939A)),
              ),
              const SizedBox(height: 22),
              _RatingField(
                label: 'ความพึงพอใจโดยรวม',
                value: _satisfaction,
                onChanged: (value) => setState(() => _satisfaction = value),
              ),
              const SizedBox(height: 17),
              _RatingField(
                label: 'ความง่ายในการใช้งาน',
                value: _easeOfUse,
                onChanged: (value) => setState(() => _easeOfUse = value),
              ),
              const SizedBox(height: 17),
              _RatingField(
                label: 'ประโยชน์ต่อการวางแผนการเรียน',
                value: _usefulness,
                onChanged: (value) => setState(() => _usefulness = value),
              ),
              const SizedBox(height: 18),
              TextField(
                key: const Key('system-evaluation-comment'),
                controller: _commentController,
                maxLength: 2000,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)',
                  hintText: 'อยากให้ปรับปรุงหรือเพิ่มอะไร บอกเราได้เลย',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFFE14F79),
                  ),
                ),
              ],
              const SizedBox(height: 15),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(
                    onPressed: _isSubmitting
                        ? null
                        : () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('ทำภายหลัง'),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    key: const Key('submit-system-evaluation'),
                    onPressed: _isSubmitting ? null : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFA8D780),
                      shape: const StadiumBorder(),
                    ),
                    child: Text(
                      _isSubmitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน',
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

class _RatingField extends StatelessWidget {
  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  const _RatingField({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: Color(0xFF526B77)),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (var rating = 1; rating <= 5; rating++) ...[
              Expanded(
                child: InkWell(
                  key: Key('system-rating-$label-$rating'),
                  onTap: () => onChanged(rating),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    height: 38,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: value == rating
                          ? const Color(0xFFB9DFF0)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: value == rating
                            ? const Color(0xFF77AEC3)
                            : const Color(0xFFDCE6E9),
                      ),
                    ),
                    child: Text('$rating'),
                  ),
                ),
              ),
              if (rating < 5) const SizedBox(width: 5),
            ],
          ],
        ),
        const Padding(
          padding: EdgeInsets.only(top: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'น้อย',
                style: TextStyle(fontSize: 9, color: Color(0xFF9AA8AD)),
              ),
              Text(
                'มาก',
                style: TextStyle(fontSize: 9, color: Color(0xFF9AA8AD)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
