import 'package:flutter/material.dart';

import '../../../interfaces/exam.interface.dart';
import '../../../interfaces/score.interface.dart';
import '../../../interfaces/time.interface.dart';
import '../../../services/exam.service.dart';
import '../../../services/score.service.dart';
import '../../../services/time.service.dart';

class BehaviorSummaryData {
  final StudyDashboard? study;
  final List<ExamHistoryItem> exams;
  final ExamInsights? insights;
  final List<SubjectScore> subjects;

  const BehaviorSummaryData({
    this.study,
    this.exams = const [],
    this.insights,
    this.subjects = const [],
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
    return BehaviorSummaryData(
      study: await study,
      exams: await exams ?? const [],
      insights: await insights,
      subjects: await subjects ?? const [],
    );
  }

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('behavior-summary'),
    width: double.infinity,
    decoration: BoxDecoration(
      color: const Color(0xFFFCFBFE),
      border: Border.all(color: const Color(0xFFDEDDEA)),
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
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFEAF5FA), Color(0xFFFDEDF4)],
            ),
          ),
          child: const Padding(
            padding: EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(Icons.auto_awesome, size: 18, color: Color(0xFF6CAFD0)),
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
                          color: Color(0xFF587889),
                        ),
                      ),
                      Text(
                        'จากเวลาทบทวน แบบทดสอบ และภาระงานที่บันทึกไว้',
                        style: TextStyle(
                          fontSize: 10,
                          color: Color(0xFF7895A2),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE9DFEB)),
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
    final totalStudyMinutes = (data.study?.summary.totalTermMinutes ?? 0)
        .round();
    final studyDuration =
        '${totalStudyMinutes ~/ 60} ชม. ${totalStudyMinutes % 60} น.';
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
    final adherence = data.study?.summary.termRecommendationAdherenceRate;
    final sortedTopics = [...?data.insights?.weakTopics]
      ..sort((a, b) => a.percentage.compareTo(b.percentage));
    final seenSubjects = <String>{};
    final weakest = sortedTopics
        .where((topic) => seenSubjects.add(topic.subjectId))
        .toList();

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
                  label: 'เวลาทบทวนสะสมทั้งเทอม',
                  tone: 0,
                  value: studyDuration,
                  detail:
                      'จับเวลา $sessionCount ครั้ง · เฉลี่ย ${(data.study?.summary.averageWeeklyMinutes ?? 0).round()} นาที/สัปดาห์',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.menu_book_outlined,
                  label: 'แบบทดสอบ',
                  tone: 1,
                  value: '${data.exams.length} ครั้ง',
                  detail: averageExam == null
                      ? 'ยังไม่มีคะแนนแบบทดสอบ'
                      : 'คะแนนเฉลี่ย $averageExam%',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.checklist_rounded,
                  label: 'ภาระงานที่เสร็จในเทอมนี้',
                  tone: 0,
                  value: '$completedTasks งาน',
                  detail: 'บันทึกคะแนนแล้ว $recordedScores รายการ',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.auto_awesome,
                  label: 'Checkpoint ที่ทำสำเร็จ',
                  tone: 1,
                  value: '${data.insights?.completedCheckpointCount ?? 0} รอบ',
                  detail: 'จำนวนสะสมจากทั้งเทอม',
                ),
                _Metric(
                  width: (constraints.maxWidth - 8) / 2,
                  icon: Icons.auto_awesome,
                  label: 'ทำตามตารางที่แนะนำทั้งเทอม',
                  tone: 0,
                  value: adherence == null ? 'ยังไม่มีข้อมูล' : '${adherence.round()}%',
                  detail: 'เวลาจับที่ตรงกับบล็อกทบทวนที่ยอมรับแล้ว',
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFF2D9E5)),
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
                    color: Color(0xFF9C637E),
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
                    Container(
                      margin: const EdgeInsets.only(bottom: 5),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3F8),
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            topic.subjectName,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF805E73),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  topic.topicName,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF805E73),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${topic.percentage.round()}%',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFFC16D98),
                                ),
                              ),
                            ],
                          ),
                        ],
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
  final int tone;

  const _Metric({
    required this.width,
    required this.icon,
    required this.label,
    required this.value,
    required this.detail,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    final backgrounds = [const Color(0xFFF2FAFD), const Color(0xFFFFF1F7)];
    final borders = [const Color(0xFFCFE4ED), const Color(0xFFF2D9E5)];
    final foregrounds = [const Color(0xFF587889), const Color(0xFF9C637E)];
    return Container(
      width: width,
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: backgrounds[tone],
        border: Border.all(color: borders[tone]),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: foregrounds[tone]),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(fontSize: 10, color: foregrounds[tone]),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: foregrounds[tone],
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
}
