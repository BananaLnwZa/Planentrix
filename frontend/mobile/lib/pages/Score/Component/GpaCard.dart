import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class GpaCard extends StatelessWidget {
  const GpaCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'GPA 2.50 จาก 4.00',
      child: SizedBox(
        key: const Key('gpa-card'),
        width: 220,
        height: 133,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: Container(
                key: const Key('gpa-card-surface'),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.black.withValues(alpha: 0.1),
                    width: 0.5,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x40000000),
                      blurRadius: 4,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
              ),
            ),
            const Positioned(
              left: 95,
              top: 12,
              child: Text(
                'GPA',
                key: Key('gpa-title'),
                style: TextStyle(color: Colors.black, fontSize: 14, height: 1),
              ),
            ),
            Positioned(
              left: 33,
              top: 35,
              width: 95.759,
              height: 77.092,
              child: SvgPicture.asset(
                'assets/icons/gpa_progress_arc.svg',
                fit: BoxFit.fill,
              ),
            ),
            Positioned(
              left: 110.5,
              top: 49.75,
              width: 27.893,
              height: 1.5,
              child: Transform.rotate(
                angle: 104.53 * math.pi / 180,
                child: SvgPicture.asset(
                  'assets/icons/gpa_needle.svg',
                  fit: BoxFit.fill,
                ),
              ),
            ),
            const Positioned(
              left: 84,
              top: 96,
              width: 52,
              child: Text(
                '2.50/4.00',
                key: Key('gpa-value'),
                textAlign: TextAlign.center,
                maxLines: 1,
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 11,
                  fontWeight: FontWeight.w300,
                  height: 1,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
