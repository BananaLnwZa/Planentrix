import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import '../../../interfaces/recommendation.interface.dart';
import '../../../interfaces/score.interface.dart';
import '../../../interfaces/time.interface.dart';
import '../../../services/exam.service.dart';
import '../../../services/recommendation.service.dart';
import '../../../services/score.service.dart';
import '../../../services/time.service.dart';

class BehaviorSummaryData {
  final StudyDashboard? study;
  final List<ExamHistoryItem> exams;
  final ExamInsights? insights;
  final List<SubjectScore> subjects;
  final WeeklyRecommendation? latestPlan;

  const BehaviorSummaryData({
    this.study,
    this.exams = const [],
    this.insights,
    this.subjects = const [],
    this.latestPlan,
  });
}

class BehaviorSummary extends StatefulWidget {
  final Future<BehaviorSummaryData> Function()? loadData;

  const BehaviorSummary({super.key, this.loadData});

  @override
  State<BehaviorSummary> createState() => _BehaviorSummaryState();
}

class _BehaviorSummaryState extends State<BehaviorSummary> {
  late Future<BehaviorSummaryData> _data;

  @override
  void initState() {
    super.initState();
    _data = widget.loadData?.call() ?? _loadSummary();
  }

  Future<T?> _safe<T>(Future<T> Function() load) async {
    try {
      return await load();
    } catch (_) {
      return null;
    }
  }

  Future<BehaviorSummaryData> _loadSummary() async {
    final study = _safe(() => TimeService().getDashboard());
    final exams = _safe(() => ExamService().getHistory());
    final insights = _safe(() => ExamService().getInsights());
    final subjects = _safe(() => ScoreService().getCompletedSubjectScores());
    final plan = _safe(() => RecommendationService().getLatest());
    return BehaviorSummaryData(
      study: await study,
      exams: await exams ?? const [],
      insights: await insights,
      subjects: await subjects ?? const [],
      latestPlan: await plan,
    );
  }

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('behavior-summary'),
    width: double.infinity,
    decoration: BoxDecoration(
      color: const Color(0xFFFFF9FC),
      border: Border.all(color: const Color(0xFFD7C2D0)),
      borderRadius: BorderRadius.circular(17),
      boxShadow: const [
        BoxShadow(
          color: Color(0x1F4B5D66),
          blurRadius: 10,
          offset: Offset(0, 5),
        ),
      ],
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(Icons.auto_awesome, size: 18, color: Color(0xFFA96E8B)),
              SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'สรุปพฤติกรรมการเรียนในเทอมนี้',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF87556D),
                      ),
                    ),
                    Text(
                      'จากเวลาทบทวน แบบทดสอบ และภาระงานที่บันทึกไว้',
                      style: TextStyle(fontSize: 10, color: Color(0xFFA1788C)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFEAD8E2)),
        FutureBuilder<BehaviorSummaryData>(
          future: _data,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const Padding(
                padding: EdgeInsets.all(28),
                child: Center(
                  child: Text(
                    'กำลังรวบรวมสถิติ...',
                    style: TextStyle(fontSize: 12, color: Color(0xFF82969F)),
                  ),
                ),
              );
            }
            return _SummaryContent(data: snapshot.data!);
          },
        ),
      ],
    ),
  );
}

class _SummaryContent extends StatelessWidget {
  final BehaviorSummaryData data;

  const _SummaryContent({required this.data});

  @override
  Widget build(BuildContext context) {
    final studyHours = ((data.study?.summary.totalTermMinutes ?? 0) / 60)
        .toStringAsFixed(1);
    final sessionCount =
        data.study?.history.fold<int>(
          0,
          (sum, month) => sum + month.sessionCount,
        ) ??
        0;
    final averageExam = data.exams.isEmpty
        ? null
        : (data.exams.fold<double>(
                    0,
                    (sum, exam) =>
                        sum +
                        (exam.maximumScore > 0
                            ? exam.actualScore / exam.maximumScore * 100
                            : 0),
                  ) /
                  data.exams.length)
              .round();
    final workloads = data.subjects.expand((subject) => subject.workloads);
    final completedTasks = workloads
        .where((workload) => workload.isCompleted)
        .length;
    final recordedScores = workloads
        .where((workload) => workload.actualScore != null)
        .length;
    final rates =
        data.latestPlan?.items
            .map((item) => item.previousAdherenceRate)
            .whereType<double>()
            .toList() ??
        const <double>[];
    final adherence = rates.isEmpty
        ? null
        : (rates.reduce((a, b) => a + b) / rates.length).round();
    final weakest =
        data.insights?.weakTopics.take(3).toList() ??
        const <WeakTopicInsight>[];

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LayoutBuilder(
            builder: (context, constraints) => Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.schedule,
                  label: 'เวลาทบทวนรวม',
                  value: '$studyHours ชม.',
                  detail:
                      'จับเวลา $sessionCount ครั้ง · เฉลี่ย ${(data.study?.summary.averageWeeklyMinutes ?? 0).round()} นาที/สัปดาห์',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.menu_book_outlined,
                  label: 'แบบทดสอบ',
                  value: '${data.exams.length} ครั้ง',
                  detail: averageExam == null
                      ? 'ยังไม่มีคะแนนแบบทดสอบ'
                      : 'คะแนนเฉลี่ย $averageExam%',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.checklist_rounded,
                  label: 'ภาระงาน',
                  value: '$completedTasks งานเสร็จ',
                  detail: 'บันทึกคะแนนแล้ว $recordedScores รายการ',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.auto_awesome,
                  label: 'Checkpoint',
                  value: '${data.insights?.nextCheckpoints.length ?? 0} รอบ',
                  detail: 'รอบทบทวนที่ระบบนัดไว้',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.auto_awesome,
                  label: 'ทำตามตารางที่แนะนำ',
                  value: adherence == null ? 'ยังไม่มีข้อมูล' : '$adherence%',
                  detail: 'เทียบเวลาจับกับแผนล่าสุด',
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE7D7DF)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'หัวข้อที่ควรทบทวนต่อ',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF725165),
                  ),
                ),
                const SizedBox(height: 7),
                if (weakest.isEmpty)
                  const Text(
                    'ยังไม่มีหัวข้ออ่อนจากผลแบบทดสอบ',
                    style: TextStyle(fontSize: 11, color: Color(0xFF9B8993)),
                  )
                else
                  for (final topic in weakest)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 5),
                      child: Text(
                        '${topic.subjectName} · ${topic.topicName}  ${topic.percentage.round()}%',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF725165),
                        ),
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: 9),
          const Text(
            'สรุปนี้อ้างอิงเฉพาะข้อมูลที่ระบบบันทึกได้ จึงไม่ประเมินพฤติกรรมที่ไม่ได้กดจับเวลาหรือไม่ได้ทำแบบทดสอบ',
            style: TextStyle(
              fontSize: 10,
              height: 1.4,
              color: Color(0xFFA18F99),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final double width;
  final IconData icon;
  final String label;
  final String value;
  final String detail;

  const _Metric({
    required this.width,
    required this.icon,
    required this.label,
    required this.value,
    required this.detail,
  });

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: const Color(0xFFE9D8E1)),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 15, color: const Color(0xFFA96E8B)),
            const SizedBox(width: 5),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 10, color: Color(0xFFA96E8B)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Color(0xFF5F4860),
          ),
        ),
        Text(
          detail,
          style: const TextStyle(fontSize: 10, color: Color(0xFF9B8993)),
        ),
      ],
    ),
  );
}
