import 'dart:convert';

class RecommendationReason {
  final String code;
  final int minutes;
  final String message;
  final Map<String, dynamic> metadata;

  const RecommendationReason({
    required this.code,
    required this.minutes,
    required this.message,
    this.metadata = const {},
  });

  factory RecommendationReason.fromJson(Map<String, dynamic> json) =>
      RecommendationReason(
        code: _text(json['code']),
        minutes: _integer(json['minutes']),
        message: _text(json['message']),
        metadata: _map(json['metadata']),
      );
}

class RecommendationChange {
  final String action;
  final Map<String, dynamic>? from;
  final Map<String, dynamic>? to;

  const RecommendationChange({required this.action, this.from, this.to});

  factory RecommendationChange.fromJson(Map<String, dynamic> json) =>
      RecommendationChange(
        action: _text(json['action']),
        from: json['from'] == null ? null : _map(json['from']),
        to: json['to'] == null ? null : _map(json['to']),
      );
}

class WeeklyScheduleBlock {
  final int weeklyBlockId;
  final int recommendationId;
  final int? recommendationItemId;
  final int? scheduleTimeId;
  final String subjectId;
  final String subjectName;
  final int scheduleTypeId;
  final String scheduleTypeName;
  final String scheduledDate;
  final String startTime;
  final String endTime;
  final String source;
  final bool isUserModified;

  const WeeklyScheduleBlock({
    required this.weeklyBlockId,
    required this.recommendationId,
    this.recommendationItemId,
    this.scheduleTimeId,
    required this.subjectId,
    required this.subjectName,
    required this.scheduleTypeId,
    required this.scheduleTypeName,
    required this.scheduledDate,
    required this.startTime,
    required this.endTime,
    required this.source,
    required this.isUserModified,
  });

  factory WeeklyScheduleBlock.fromJson(Map<String, dynamic> json) =>
      WeeklyScheduleBlock(
        weeklyBlockId: _integer(json['weekly_block_id']),
        recommendationId: _integer(json['recommendation_id']),
        recommendationItemId: _nullableInteger(json['recommendation_item_id']),
        scheduleTimeId: _nullableInteger(json['schedule_time_id']),
        subjectId: _text(json['subject_id']),
        subjectName: _text(json['subject_name']),
        scheduleTypeId: _integer(json['schedule_type_id']),
        scheduleTypeName: _text(json['schedule_type_name']),
        scheduledDate: _text(json['scheduled_date']),
        startTime: _time(json['start_time']),
        endTime: _time(json['end_time']),
        source: _text(json['source']),
        isUserModified: _boolean(json['is_user_modified']),
      );
}

class WeeklyRecommendationItem {
  final int recommendationItemId;
  final String subjectId;
  final String subjectName;
  final int scheduleTypeId;
  final String scheduleTypeName;
  final int currentMinutes;
  final int targetMinutes;
  final int allocatedMinutes;
  final int unallocatedMinutes;
  final int differenceMinutes;
  final String primaryAction;
  final bool capApplied;
  final bool capacityLimited;
  final List<RecommendationReason> reasons;
  final List<RecommendationChange> changes;

  const WeeklyRecommendationItem({
    required this.recommendationItemId,
    required this.subjectId,
    required this.subjectName,
    required this.scheduleTypeId,
    required this.scheduleTypeName,
    required this.currentMinutes,
    required this.targetMinutes,
    required this.allocatedMinutes,
    required this.unallocatedMinutes,
    required this.differenceMinutes,
    required this.primaryAction,
    required this.capApplied,
    required this.capacityLimited,
    this.reasons = const [],
    this.changes = const [],
  });

  factory WeeklyRecommendationItem.fromJson(
    Map<String, dynamic> json,
  ) => WeeklyRecommendationItem(
    recommendationItemId: _integer(json['recommendation_item_id']),
    subjectId: _text(json['subject_id']),
    subjectName: _text(json['subject_name']),
    scheduleTypeId: _integer(json['schedule_type_id']),
    scheduleTypeName: _text(json['schedule_type_name']),
    currentMinutes: _integer(json['current_minutes']),
    targetMinutes: _integer(json['target_minutes']),
    allocatedMinutes: _integer(json['allocated_minutes']),
    unallocatedMinutes: _integer(json['unallocated_minutes']),
    differenceMinutes: _integer(json['difference_minutes']),
    primaryAction: _text(json['primary_action']),
    capApplied: _boolean(json['cap_applied']),
    capacityLimited: _boolean(json['capacity_limited']),
    reasons: _list(json['reasons_json'])
        .whereType<Map>()
        .map(
          (item) =>
              RecommendationReason.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList(),
    changes: _list(json['changes_json'])
        .whereType<Map>()
        .map(
          (item) =>
              RecommendationChange.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList(),
  );
}

class WeeklyRecommendation {
  final int recommendationId;
  final int userId;
  final int termId;
  final int version;
  final String weekStart;
  final String weekEnd;
  final String triggerType;
  final String status;
  final List<WeeklyRecommendationItem> items;
  final List<WeeklyScheduleBlock> blocks;

  const WeeklyRecommendation({
    required this.recommendationId,
    required this.userId,
    required this.termId,
    required this.version,
    required this.weekStart,
    required this.weekEnd,
    required this.triggerType,
    required this.status,
    this.items = const [],
    this.blocks = const [],
  });

  factory WeeklyRecommendation.fromJson(Map<String, dynamic> json) =>
      WeeklyRecommendation(
        recommendationId: _integer(json['recommendation_id']),
        userId: _integer(json['user_id']),
        termId: _integer(json['term_id']),
        version: _integer(json['version'], fallback: 1),
        weekStart: _text(json['week_start']),
        weekEnd: _text(json['week_end']),
        triggerType: _text(json['trigger_type']),
        status: _text(json['status']),
        items: _list(json['items'])
            .whereType<Map>()
            .map(
              (item) => WeeklyRecommendationItem.fromJson(
                Map<String, dynamic>.from(item),
              ),
            )
            .toList(),
        blocks: _list(json['blocks'])
            .whereType<Map>()
            .map(
              (item) =>
                  WeeklyScheduleBlock.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList(),
      );
}

class RecurringClassBlock {
  final int scheduleTimeId;
  final String subjectId;
  final String subjectName;
  final int scheduleDay;
  final String startTime;
  final String endTime;
  final String? classroom;

  const RecurringClassBlock({
    required this.scheduleTimeId,
    required this.subjectId,
    required this.subjectName,
    required this.scheduleDay,
    required this.startTime,
    required this.endTime,
    this.classroom,
  });

  factory RecurringClassBlock.fromJson(Map<String, dynamic> json) =>
      RecurringClassBlock(
        scheduleTimeId: _integer(json['schedule_time_id']),
        subjectId: _text(json['subject_id']),
        subjectName: _text(json['subject_name']),
        scheduleDay: _integer(json['schedule_day'], fallback: 1),
        startTime: _time(json['start_time']),
        endTime: _time(json['end_time']),
        classroom: json['classroom']?.toString(),
      );
}

class AcceptedWeeklySchedule {
  final String weekStart;
  final String weekEnd;
  final List<RecurringClassBlock> recurringClasses;
  final WeeklyRecommendation? acceptedRecommendation;
  final List<WeeklyScheduleBlock> weeklyBlocks;

  const AcceptedWeeklySchedule({
    required this.weekStart,
    required this.weekEnd,
    this.recurringClasses = const [],
    this.acceptedRecommendation,
    this.weeklyBlocks = const [],
  });

  factory AcceptedWeeklySchedule.fromJson(Map<String, dynamic> json) =>
      AcceptedWeeklySchedule(
        weekStart: _text(json['week_start']),
        weekEnd: _text(json['week_end']),
        recurringClasses: _list(json['recurring_classes'])
            .whereType<Map>()
            .map(
              (item) =>
                  RecurringClassBlock.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList(),
        acceptedRecommendation: json['accepted_recommendation'] is Map
            ? WeeklyRecommendation.fromJson(
                Map<String, dynamic>.from(
                  json['accepted_recommendation'] as Map,
                ),
              )
            : null,
        weeklyBlocks: _list(json['weekly_blocks'])
            .whereType<Map>()
            .map(
              (item) =>
                  WeeklyScheduleBlock.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList(),
      );
}

class WeeklyBlockInput {
  final String subjectId;
  final int scheduleTypeId;
  final String scheduledDate;
  final String startTime;
  final String endTime;
  final bool allowConstraintOverlap;

  const WeeklyBlockInput({
    required this.subjectId,
    required this.scheduleTypeId,
    required this.scheduledDate,
    required this.startTime,
    required this.endTime,
    this.allowConstraintOverlap = false,
  });

  Map<String, dynamic> toJson({bool includeSubject = true}) => {
    if (includeSubject) 'subject_id': subjectId,
    if (includeSubject) 'schedule_type_id': scheduleTypeId,
    'scheduled_date': scheduledDate,
    'start_time': startTime,
    'end_time': endTime,
    if (allowConstraintOverlap)
      'allow_constraint_overlap': allowConstraintOverlap,
  };
}

String _text(dynamic value) => value == null ? '' : '$value';

int _integer(dynamic value, {int fallback = 0}) {
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? fallback;
}

int? _nullableInteger(dynamic value) => value == null ? null : _integer(value);

bool _boolean(dynamic value) => value == true || value == 1 || value == '1';

String _time(dynamic value) {
  final text = _text(value);
  return text.length >= 5 ? text.substring(0, 5) : text;
}

Map<String, dynamic> _map(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : const <String, dynamic>{};

List<dynamic> _list(dynamic value) {
  if (value is List) return value;
  if (value is String && value.isNotEmpty) {
    try {
      final decoded = jsonDecode(value);
      return decoded is List ? decoded : const [];
    } catch (_) {
      return const [];
    }
  }
  return const [];
}
