import 'package:flutter/material.dart';

class SubmitHomeworkButton extends StatelessWidget {
  final double scale;
  final VoidCallback onPressed;
  final bool isLoading;
  final bool isSubmitted;

  const SubmitHomeworkButton({
    super.key,
    required this.scale,
    required this.onPressed,
    this.isLoading = false,
    this.isSubmitted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: isSubmitted ? 'ส่งงานแล้ว' : 'ส่งงาน',
      child: Material(
        color: const Color(0xFFCFEFFF),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8 * scale),
          side: BorderSide(color: const Color(0xFF99B3C0), width: 0.5 * scale),
        ),
        child: InkWell(
          onTap: isLoading || isSubmitted ? null : onPressed,
          borderRadius: BorderRadius.circular(8 * scale),
          child: isLoading
              ? Center(
                  child: SizedBox(
                    width: 7 * scale,
                    height: 7 * scale,
                    child: const CircularProgressIndicator(strokeWidth: 1),
                  ),
                )
              : Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'ส่ง',
                          key: const Key('homework-submit-label'),
                          style: TextStyle(
                            color: const Color(0xFF374957),
                            fontSize: 8 * scale,
                            height: 1,
                          ),
                        ),
                        SizedBox(width: 2 * scale),
                        Icon(
                          Icons.check_rounded,
                          key: const Key('homework-submit-check'),
                          size: 7 * scale,
                          color: const Color(0xFF374957),
                        ),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}
