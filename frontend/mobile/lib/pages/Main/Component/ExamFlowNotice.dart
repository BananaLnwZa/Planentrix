import 'package:flutter/material.dart';

import '../../../interfaces/term.interface.dart';

class ExamFlowNotice extends StatelessWidget {
  final TermWorkflow workflow;

  const ExamFlowNotice({super.key, required this.workflow});

  @override
  Widget build(BuildContext context) {
    final notice = _notices[workflow.phase];
    if (notice == null) return const SizedBox.shrink();
    return Container(
      key: const Key('exam-flow-notice'),
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(
        color: const Color(0xFFF2FAFD),
        border: Border.all(color: const Color(0xFFCFE4ED)),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 17,
            backgroundColor: Colors.white,
            child: Icon(
              Icons.notifications_active_outlined,
              size: 18,
              color: Color(0xFF6CAFD0),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notice.title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF587889),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  notice.detail,
                  style: const TextStyle(
                    fontSize: 10,
                    height: 1.4,
                    color: Color(0xFF7895A2),
                  ),
                ),
              ],
            ),
          ),
          if (notice.action != null) ...[
            const SizedBox(width: 7),
            TextButton(
              onPressed: () => Navigator.of(context).pushNamed(notice.route!),
              style: TextButton.styleFrom(
                backgroundColor: const Color(0xFF8BC9E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(notice.action!, style: const TextStyle(fontSize: 10)),
            ),
          ],
        ],
      ),
    );
  }
}

typedef _Notice = ({
  String title,
  String detail,
  String? action,
  String? route,
});

const Map<String, _Notice> _notices = {
  'midterm_3w': (
    title: 'เตรียมสอบกลางภาค · 3 สัปดาห์',
    detail: 'สัปดาห์หน้าจะมีแบบทดสอบและคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบกลางภาค',
    action: null,
    route: null,
  ),
  'midterm_2w': (
    title: 'เตรียมสอบกลางภาค · 2 สัปดาห์',
    detail: 'ทำแบบทดสอบและตรวจคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบ',
    action: 'ไปทำแบบทดสอบ',
    route: '/test',
  ),
  'midterm_1w': (
    title: 'เตรียมสอบกลางภาค · 1 สัปดาห์',
    detail: 'ทำแบบทดสอบเพื่อวัดผลเท่านั้น รอบนี้ไม่มีคำแนะนำจัดตาราง',
    action: 'ไปทำแบบทดสอบ',
    route: '/test',
  ),
  'midterm_exam': (
    title: 'สัปดาห์สอบกลางภาค',
    detail:
        'สัปดาห์นี้ไม่มีแบบทดสอบทบทวนหรือคำแนะนำจัดตาราง ขอให้ทำข้อสอบจริงอย่างเต็มที่',
    action: null,
    route: null,
  ),
  'final_3w': (
    title: 'เตรียมสอบปลายภาค · 3 สัปดาห์',
    detail:
        'สัปดาห์หน้าจะมีแบบทดสอบและคำแนะนำจัดตารางรอบสุดท้าย กรุณากรอกภาระงานและคะแนนเก็บของทุกรายวิชาให้ครบ',
    action: 'ตรวจภาระงาน',
    route: '/homework',
  ),
  'final_2w': (
    title: 'เตรียมสอบปลายภาค · 2 สัปดาห์',
    detail: 'ทำแบบทดสอบและตรวจคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบ',
    action: 'ไปทำแบบทดสอบ',
    route: '/test',
  ),
  'final_1w': (
    title: 'เตรียมสอบปลายภาค · 1 สัปดาห์',
    detail: 'ทำแบบทดสอบเพื่อวัดผลเท่านั้น ปิดการเพิ่ม/แก้ไขภาระงานและคะแนนแล้ว',
    action: 'ไปทำแบบทดสอบ',
    route: '/test',
  ),
  'final_exam': (
    title: 'สัปดาห์สอบปลายภาค',
    detail: 'สัปดาห์นี้ไม่มีแบบทดสอบทบทวนหรือคำแนะนำจัดตาราง',
    action: null,
    route: null,
  ),
};
