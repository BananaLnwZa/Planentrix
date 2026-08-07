import 'dart:math' as math;

import 'package:flutter/material.dart';

class GpaCard extends StatelessWidget {
  final double gpa;
  final double maximumGpa;

  const GpaCard({super.key, this.gpa = 0, this.maximumGpa = 0});

  @override
  Widget build(BuildContext context) {
    final currentGpa = gpa.clamp(0.0, 4.0);
    final targetGpa = maximumGpa.clamp(0.0, 4.0);
    final progress = targetGpa <= 0
        ? (currentGpa > 0 ? 1.0 : 0.0)
        : (currentGpa / targetGpa).clamp(0.0, 1.0);

    return Semantics(
      container: true,
      label:
          'GPA ปัจจุบัน ${currentGpa.toStringAsFixed(2)} จากเป้าหมาย ${targetGpa.toStringAsFixed(2)}',
      child: Container(
        key: const Key('gpa-card'),
        width: double.infinity,
        height: 190,
        padding: const EdgeInsets.fromLTRB(16, 15, 16, 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD5E5EC)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x21375D70),
              blurRadius: 16,
              offset: Offset(0, 7),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Expanded(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.bottomLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PROGRESS',
                          style: TextStyle(
                            color: Color(0xFF87A5B6),
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 1.8,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'GPA ปัจจุบัน',
                          key: Key('gpa-title'),
                          style: TextStyle(
                            color: Color(0xFF31566C),
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'เป้าหมาย',
                      style: TextStyle(color: Color(0xFF8AA3B0), fontSize: 11),
                    ),
                    Text(
                      targetGpa.toStringAsFixed(2),
                      key: const Key('gpa-target-value'),
                      style: const TextStyle(
                        color: Color(0xFF4EA9DA),
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Expanded(
              child: Stack(
                key: const Key('gpa-card-surface'),
                alignment: Alignment.center,
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      key: const Key('gpa-gauge'),
                      painter: _GpaGaugePainter(progress: progress),
                    ),
                  ),
                  Positioned(
                    bottom: 17,
                    child: Text(
                      currentGpa.toStringAsFixed(2),
                      key: const Key('gpa-value'),
                      style: const TextStyle(
                        color: Color(0xFF31566C),
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 1,
                    child: Text(
                      'จากเป้าหมาย ${targetGpa.toStringAsFixed(2)}',
                      key: const Key('gpa-target-caption'),
                      style: const TextStyle(
                        color: Color(0xFF8AA3B0),
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GpaGaugePainter extends CustomPainter {
  final double progress;

  const _GpaGaugePainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 28.0;
    final radius = math.min(size.width * 0.36, size.height * 0.76);
    final center = Offset(size.width / 2, size.height * 0.98);
    final rect = Rect.fromCircle(center: center, radius: radius);

    final remaining = Paint()
      ..color = const Color(0xFFFDE9D9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;
    canvas.drawArc(rect, math.pi, math.pi, false, remaining);

    if (progress > 0) {
      final current = Paint()
        ..color = const Color(0xFF9ED5F1)
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.butt;
      canvas.drawArc(rect, math.pi, math.pi * progress, false, current);
    }
  }

  @override
  bool shouldRepaint(covariant _GpaGaugePainter oldDelegate) =>
      oldDelegate.progress != progress;
}
