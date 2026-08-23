// ignore_for_file: file_names

import 'package:flutter/material.dart';

import '../../../common/DateTimeFormat.dart';
import '../../../interfaces/recommendation.interface.dart';
import '../../../services/recommendation.service.dart';
import 'RecommendationPreviewSheet.dart';

class RecommendationCard extends StatefulWidget {
  final RecommendationRepository? repository;
  final VoidCallback? onAccepted;

  const RecommendationCard({super.key, this.repository, this.onAccepted});

  @override
  State<RecommendationCard> createState() => _RecommendationCardState();
}

class _RecommendationCardState extends State<RecommendationCard> {
  late final RecommendationRepository _repository;
  WeeklyRecommendation? _recommendation;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? RecommendationService();
    _load();
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final value = await _repository.getLatest();
      if (mounted) setState(() => _recommendation = value);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openPreview() async {
    final recommendation = _recommendation;
    if (recommendation == null) return;
    final updated = await showRecommendationPreviewSheet(
      context,
      recommendation: recommendation,
      repository: _repository,
    );
    if (updated == null || !mounted) return;
    setState(() => _recommendation = updated);
    if (updated.status == 'accepted') widget.onAccepted?.call();
  }

  Future<void> _act(bool accept) async {
    final recommendation = _recommendation;
    if (recommendation == null || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = accept
          ? await _repository.accept(recommendation.recommendationId)
          : await _repository.reject(recommendation.recommendationId);
      if (!mounted) return;
      setState(() => _recommendation = updated);
      if (accept) widget.onAccepted?.call();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final recommendation = _recommendation;
    final visible =
        recommendation != null && recommendation.status != 'rejected';
    final reviewItems = visible
        ? recommendation.items
              .where((item) => item.scheduleTypeId == 2)
              .toList()
        : const <WeeklyRecommendationItem>[];
    final homeworkItems = visible
        ? recommendation.items
              .where((item) => item.scheduleTypeId == 3)
              .toList()
        : const <WeeklyRecommendationItem>[];
    return Container(
      key: const Key('weekly-recommendation-card'),
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD7C7CD)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x24000000),
            blurRadius: 11,
            offset: Offset(0, 5),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 11),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFFCE4EC), Color(0xFFE5F4FB)],
              ),
              border: Border(bottom: BorderSide(color: Color(0xFFEADDE1))),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.schedule_rounded,
                  size: 19,
                  color: Color(0xFF6B9FB2),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'แนะนำจัดเวลา${_weekLabel(recommendation)}',
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF405B69),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (recommendation != null)
                        Text(
                          '${_triggerLabel(recommendation.triggerType)} · ${_displayDate(recommendation.weekStart)} – ${_displayDate(recommendation.weekEnd)}',
                          style: const TextStyle(
                            fontSize: 9.5,
                            color: Color(0xFF758991),
                          ),
                        ),
                    ],
                  ),
                ),
                if (recommendation?.status == 'accepted')
                  const _StatusBadge(text: 'ใช้งานแล้ว'),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: _loading
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 28),
                    child: Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : !visible
                ? _EmptyRecommendation(onRefresh: _load)
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _RecommendationGroup(
                        title: 'เวลาทบทวน',
                        items: reviewItems,
                      ),
                      const SizedBox(height: 13),
                      _RecommendationGroup(
                        title: 'เวลาทำการบ้าน',
                        items: homeworkItems,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 10),
                        _ErrorBox(text: _error!),
                      ],
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        key: const Key('recommendation-preview-button'),
                        onPressed: _busy ? null : _openPreview,
                        icon: const Icon(Icons.visibility_outlined, size: 17),
                        label: const Text('ดูตัวอย่างและปรับตาราง'),
                      ),
                      if (recommendation.status == 'pending') ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                key: const Key('recommendation-reject-button'),
                                onPressed: _busy ? null : () => _act(false),
                                icon: const Icon(Icons.close_rounded, size: 17),
                                label: const Text('ไม่ใช้คำแนะนำ'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: FilledButton.icon(
                                key: const Key('recommendation-accept-button'),
                                onPressed: _busy ? null : () => _act(true),
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF71A982),
                                ),
                                icon: const Icon(Icons.check_rounded, size: 17),
                                label: Text(
                                  _busy ? 'กำลังบันทึก...' : 'ยอมรับ',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _RecommendationGroup extends StatelessWidget {
  final String title;
  final List<WeeklyRecommendationItem> items;

  const _RecommendationGroup({required this.title, required this.items});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          color: Color(0xFF526A75),
          fontWeight: FontWeight.w600,
        ),
      ),
      const SizedBox(height: 7),
      if (items.isEmpty)
        const Text(
          'ไม่มีการเปลี่ยนแปลง',
          style: TextStyle(fontSize: 10.5, color: Color(0xFF8A999F)),
        )
      else
        for (final item in items) ...[
          _RecommendationItemTile(item: item),
          if (item != items.last) const SizedBox(height: 8),
        ],
    ],
  );
}

class _RecommendationItemTile extends StatelessWidget {
  final WeeklyRecommendationItem item;

  const _RecommendationItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final delta = item.differenceMinutes;
    final deltaColor = delta > 0
        ? const Color(0xFF56825C)
        : delta < 0
        ? const Color(0xFFB45E68)
        : const Color(0xFF6F7D84);
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.subjectName,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF405B69),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      _actionLabel(item.primaryAction),
                      style: const TextStyle(
                        fontSize: 9,
                        color: Color(0xFF84939A),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: deltaColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${delta > 0 ? '+' : ''}${_duration(delta)}',
                  style: TextStyle(
                    fontSize: 10,
                    color: deltaColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 13,
            runSpacing: 4,
            children: [
              _MinuteStat(label: 'เดิม', value: item.currentMinutes),
              _MinuteStat(label: 'เป้าหมาย', value: item.targetMinutes),
              _MinuteStat(label: 'จัดได้', value: item.allocatedMinutes),
            ],
          ),
          if (item.reasons.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final reason in item.reasons)
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text(
                  '• ${reason.message}',
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFF6E7E85),
                  ),
                ),
              ),
          ],
          if (item.changes.isNotEmpty) ...[
            const SizedBox(height: 7),
            const Text(
              'การเปลี่ยนแปลง',
              style: TextStyle(
                fontSize: 9.5,
                color: Color(0xFF6B7E86),
                fontWeight: FontWeight.w600,
              ),
            ),
            for (final change in item.changes)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '• ${_changeText(change)}',
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFF6E7E85),
                  ),
                ),
              ),
          ],
          if (item.capacityLimited || item.capApplied) ...[
            const SizedBox(height: 7),
            Text(
              item.capacityLimited
                  ? 'มีเวลา ${_duration(item.unallocatedMinutes)} ที่ยังจัดลงตารางไม่ได้'
                  : 'เวลาเป้าหมายถูกจำกัดตามเพดานรายวิชา',
              style: const TextStyle(fontSize: 9.5, color: Color(0xFFA0722A)),
            ),
          ],
        ],
      ),
    );
  }
}

class _MinuteStat extends StatelessWidget {
  final String label;
  final int value;

  const _MinuteStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 8.5, color: Color(0xFF91A0A7)),
      ),
      Text(
        _duration(value),
        style: const TextStyle(
          fontSize: 10,
          color: Color(0xFF536A74),
          fontWeight: FontWeight.w600,
        ),
      ),
    ],
  );
}

class _EmptyRecommendation extends StatelessWidget {
  final VoidCallback onRefresh;

  const _EmptyRecommendation({required this.onRefresh});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 25),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.7),
      borderRadius: BorderRadius.circular(13),
      border: Border.all(color: const Color(0xFFCBD9DE)),
    ),
    child: Column(
      children: [
        const Icon(Icons.calendar_month_outlined, color: Color(0xFF91AEB9)),
        const SizedBox(height: 7),
        const Text(
          'ยังไม่มีคำแนะนำที่รอใช้งาน',
          style: TextStyle(fontSize: 11, color: Color(0xFF6E8189)),
        ),
        TextButton(onPressed: onRefresh, child: const Text('โหลดใหม่')),
      ],
    ),
  );
}

class _StatusBadge extends StatelessWidget {
  final String text;

  const _StatusBadge({required this.text});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0xFFE4F3E5),
      borderRadius: BorderRadius.circular(15),
    ),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 9,
        color: Color(0xFF5A8060),
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class _ErrorBox extends StatelessWidget {
  final String text;

  const _ErrorBox({required this.text});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(9),
    decoration: BoxDecoration(
      color: const Color(0xFFFFE9EC),
      borderRadius: BorderRadius.circular(9),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 10, color: Color(0xFFB84E5C)),
    ),
  );
}

String _duration(int minutes) {
  final total = minutes.abs();
  final hours = total ~/ 60;
  final rest = total % 60;
  if (hours > 0 && rest > 0) return '$hours ชม. $rest นาที';
  if (hours > 0) return '$hours ชม.';
  return '$rest นาที';
}

String _displayDate(String value) {
  final date = DateTime.tryParse(value);
  return date == null ? value : formatDisplayDate(date);
}

String _weekLabel(WeeklyRecommendation? recommendation) {
  if (recommendation == null) return 'สัปดาห์ถัดไป';
  final now = DateTime.now();
  final monday = DateTime(
    now.year,
    now.month,
    now.day,
  ).subtract(Duration(days: now.weekday - 1));
  final start = DateTime.tryParse(recommendation.weekStart);
  return start != null && DateUtils.isSameDay(start, monday)
      ? 'สัปดาห์นี้'
      : 'สัปดาห์ถัดไป';
}

String _triggerLabel(String value) => switch (value) {
  'weekend' => 'คำแนะนำประจำสัปดาห์',
  'exam_submitted' => 'ปรับใหม่หลังทำแบบทดสอบ',
  'workload_changed' => 'ปรับใหม่ตามภาระงาน',
  'constraint_changed' => 'ปรับใหม่ตามข้อกำหนดเวลา',
  _ => 'คำแนะนำล่าสุด',
};

String _actionLabel(String value) => switch (value) {
  'create' => 'สร้างบล็อกใหม่',
  'increase' => 'เพิ่มเวลา',
  'decrease' => 'ลดเวลา',
  'move' => 'ย้ายเวลา',
  'remove' => 'นำออก',
  _ => 'คงเวลาเดิม',
};

String _changeText(RecommendationChange change) {
  final from = _blockText(change.from);
  final to = _blockText(change.to);
  return switch (change.action) {
    'create' => 'สร้างบล็อกใหม่ $to',
    'remove' => 'นำบล็อก $from ออกจากสัปดาห์นี้',
    'move' => 'ย้ายจาก $from ไป $to',
    'resize' => 'ปรับระยะเวลาจาก $from เป็น $to',
    'user_added' => 'เพิ่มบล็อกโดยผู้ใช้',
    'user_adjusted' => 'ปรับตารางโดยผู้ใช้',
    _ => _actionLabel(change.action),
  };
}

String _blockText(Map<String, dynamic>? value) {
  if (value == null) return '';
  final date = '${value['scheduled_date'] ?? value['scheduledDate'] ?? ''}';
  final start = '${value['start_time'] ?? value['startTime'] ?? ''}';
  final end = '${value['end_time'] ?? value['endTime'] ?? ''}';
  final time = start.isNotEmpty && end.isNotEmpty
      ? '${_shortTime(start)}–${_shortTime(end)}'
      : '';
  return '${_weekday(date)} $time'.trim();
}

String _shortTime(String value) =>
    value.length <= 5 ? value : value.substring(0, 5);

String _weekday(String value) {
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  return const [
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสบดี',
    'ศุกร์',
    'เสาร์',
    'อาทิตย์',
  ][date.weekday - 1];
}
