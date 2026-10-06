class ExamSummary {
  final int examRepositoryId;
  final int scheduleTimeId;
  final String subjectId;
  final String subjectName;
  final String examName;
  final double totalScore;
  final int totalQuestion;
  final int? timeLimitMinutes;

  const ExamSummary({
    required this.examRepositoryId,
    required this.scheduleTimeId,
    required this.subjectId,
    required this.subjectName,
    required this.examName,
    required this.totalScore,
    required this.totalQuestion,
    required this.timeLimitMinutes,
  });

  factory ExamSummary.fromJson(Map<String, dynamic> json) {
    return ExamSummary(
      examRepositoryId: _asInt(json['exam_repository_id']),
      scheduleTimeId: _asInt(json['schedule_time_id']),
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      examName: '${json['exam_name'] ?? ''}',
      totalScore: _asDouble(json['total_score']),
      totalQuestion: _asInt(json['total_question']),
      timeLimitMinutes: json['time_limit'] == null
          ? null
          : _asInt(json['time_limit']),
    );
  }
}

class ExamChoice {
  final int choiceId;
  final int order;
  final String text;
  final String? imageUrl;

  const ExamChoice({
    required this.choiceId,
    required this.order,
    required this.text,
    this.imageUrl,
  });

  factory ExamChoice.fromJson(Map<String, dynamic> json) {
    return ExamChoice(
      choiceId: _asInt(json['choice_id']),
      order: _asInt(json['choice_order']),
      text: '${json['choice_text'] ?? ''}',
      imageUrl: _asNullableText(json['choice_image_url']),
    );
  }
}

class ExamQuestion {
  final int questionId;
  final int order;
  final String text;
  final String? imageUrl;
  final double score;
  final String partName;
  final List<ExamChoice> choices;

  const ExamQuestion({
    required this.questionId,
    required this.order,
    required this.text,
    this.imageUrl,
    required this.score,
    required this.partName,
    required this.choices,
  });

  factory ExamQuestion.fromJson(
    Map<String, dynamic> json, {
    required String partName,
  }) {
    final choices = json['choices'];
    return ExamQuestion(
      questionId: _asInt(json['question_id']),
      order: _asInt(json['question_order']),
      text: '${json['question_text'] ?? ''}',
      imageUrl: _asNullableText(json['question_image_url']),
      score: _asDouble(json['question_score']),
      partName: partName,
      choices: choices is List
          ? choices
                .whereType<Map>()
                .map(
                  (item) =>
                      ExamChoice.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
    );
  }
}

class ExamDetail {
  final ExamSummary summary;
  final List<ExamQuestion> questions;

  const ExamDetail({required this.summary, required this.questions});

  factory ExamDetail.fromJson(Map<String, dynamic> json) {
    final parts = json['parts'];
    final questions = <ExamQuestion>[];
    if (parts is List) {
      for (final rawPart in parts.whereType<Map>()) {
        final part = Map<String, dynamic>.from(rawPart);
        final partName = '${part['exam_part_name'] ?? ''}';
        final rawQuestions = part['questions'];
        if (rawQuestions is! List) continue;
        questions.addAll(
          rawQuestions.whereType<Map>().map(
            (item) => ExamQuestion.fromJson(
              Map<String, dynamic>.from(item),
              partName: partName,
            ),
          ),
        );
      }
    }
    return ExamDetail(
      summary: ExamSummary.fromJson(json),
      questions: questions,
    );
  }
}

class ExamAttemptSession {
  final int attemptId;
  final int? remainingSeconds;
  final bool resumed;
  final List<ExamAnswer> answers;
  final ExamDetail exam;

  const ExamAttemptSession({
    required this.attemptId,
    required this.remainingSeconds,
    required this.resumed,
    required this.exam,
    this.answers = const [],
  });

  factory ExamAttemptSession.fromJson(Map<String, dynamic> json) {
    final rawAnswers = json['answers'];
    return ExamAttemptSession(
      attemptId: _asInt(json['exam_attempt_id']),
      remainingSeconds: json['remaining_seconds'] == null
          ? null
          : _asInt(json['remaining_seconds']),
      resumed:
          json['resumed'] == true ||
          json['resumed'] == 1 ||
          json['resumed'] == '1',
      exam: ExamDetail.fromJson(Map<String, dynamic>.from(json['exam'] as Map)),
      answers: rawAnswers is List
          ? rawAnswers
                .whereType<Map>()
                .map(
                  (item) =>
                      ExamAnswer.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
    );
  }
}

class ExamHistoryWeakTopic {
  final String topicName;
  final double percentage;

  const ExamHistoryWeakTopic({
    required this.topicName,
    required this.percentage,
  });

  factory ExamHistoryWeakTopic.fromJson(Map<String, dynamic> json) {
    return ExamHistoryWeakTopic(
      topicName: '${json['topic_name'] ?? ''}',
      percentage: _asDouble(json['percentage']),
    );
  }
}

class ExamHistoryItem {
  final int historyId;
  final int examRepositoryId;
  final String subjectId;
  final String examName;
  final String subjectName;
  final double actualScore;
  final double maximumScore;
  final DateTime? examDate;
  final List<ExamHistoryWeakTopic> weakTopics;

  const ExamHistoryItem({
    required this.historyId,
    required this.examRepositoryId,
    this.subjectId = '',
    required this.examName,
    required this.subjectName,
    required this.actualScore,
    required this.maximumScore,
    required this.examDate,
    this.weakTopics = const [],
  });

  factory ExamHistoryItem.fromJson(Map<String, dynamic> json) {
    final rawWeakTopics = json['weak_topics'];
    return ExamHistoryItem(
      historyId: _asInt(json['exam_score_history_id']),
      examRepositoryId: _asInt(json['exam_repository_id']),
      subjectId: '${json['subject_id'] ?? ''}',
      examName: '${json['exam_name'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      actualScore: _asDouble(json['actual_score']),
      maximumScore: _asDouble(json['exam_max_score']),
      examDate: DateTime.tryParse('${json['exam_date'] ?? ''}')?.toLocal(),
      weakTopics: rawWeakTopics is List
          ? rawWeakTopics
                .whereType<Map>()
                .map(
                  (item) => ExamHistoryWeakTopic.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
}

class ExamSubmissionResult {
  final int historyId;
  final double actualScore;
  final double maximumScore;
  final int correctAnswers;
  final int totalQuestions;
  final DateTime? nextCheckpointAt;
  final int checkpointIntervalWeeks;
  final int weakTopicCount;
  final int reviewMinutesDelta;

  const ExamSubmissionResult({
    required this.historyId,
    required this.actualScore,
    required this.maximumScore,
    required this.correctAnswers,
    required this.totalQuestions,
    this.nextCheckpointAt,
    this.checkpointIntervalWeeks = 0,
    this.weakTopicCount = 0,
    this.reviewMinutesDelta = 0,
  });

  factory ExamSubmissionResult.fromJson(Map<String, dynamic> json) {
    return ExamSubmissionResult(
      historyId: _asInt(json['exam_score_history_id']),
      actualScore: _asDouble(json['actual_score']),
      maximumScore: _asDouble(json['exam_max_score']),
      correctAnswers: _asInt(json['correct_answers']),
      totalQuestions: _asInt(json['total_questions']),
      nextCheckpointAt: DateTime.tryParse(
        '${json['next_checkpoint_at'] ?? ''}',
      )?.toLocal(),
      checkpointIntervalWeeks: _asInt(json['checkpoint_interval_weeks']),
      weakTopicCount: _asInt(json['weak_topic_count']),
      reviewMinutesDelta: _asInt(json['review_minutes_delta']),
    );
  }
}

class WeakTopicInsight {
  final int scheduleTimeId;
  final int examRepositoryId;
  final int examPartId;
  final String topicName;
  final String subjectId;
  final String subjectName;
  final String examName;
  final double actualScore;
  final double maximumScore;
  final double percentage;

  const WeakTopicInsight({
    required this.scheduleTimeId,
    required this.examRepositoryId,
    required this.examPartId,
    required this.topicName,
    required this.subjectId,
    required this.subjectName,
    required this.examName,
    required this.actualScore,
    required this.maximumScore,
    required this.percentage,
  });

  factory WeakTopicInsight.fromJson(Map<String, dynamic> json) {
    return WeakTopicInsight(
      scheduleTimeId: _asInt(json['schedule_time_id']),
      examRepositoryId: _asInt(json['exam_repository_id']),
      examPartId: _asInt(json['exam_part_id']),
      topicName: '${json['topic_name'] ?? ''}',
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      examName: '${json['exam_name'] ?? ''}',
      actualScore: _asDouble(json['actual_score']),
      maximumScore: _asDouble(json['max_score']),
      percentage: _asDouble(json['percentage']),
    );
  }
}

class ExamCheckpointInsight {
  final int scheduleTimeId;
  final int examRepositoryId;
  final String examName;
  final String subjectId;
  final String subjectName;
  final DateTime nextCheckpointAt;
  final int intervalWeeks;
  final int weakTopicCount;
  final int reviewMinutesDelta;
  final int reviewScheduleTypeId;

  const ExamCheckpointInsight({
    required this.scheduleTimeId,
    required this.examRepositoryId,
    required this.examName,
    required this.subjectId,
    required this.subjectName,
    required this.nextCheckpointAt,
    required this.intervalWeeks,
    required this.weakTopicCount,
    required this.reviewMinutesDelta,
    required this.reviewScheduleTypeId,
  });

  factory ExamCheckpointInsight.fromJson(Map<String, dynamic> json) {
    return ExamCheckpointInsight(
      scheduleTimeId: _asInt(json['schedule_time_id']),
      examRepositoryId: _asInt(json['exam_repository_id']),
      examName: '${json['exam_name'] ?? ''}',
      subjectId: '${json['subject_id'] ?? ''}',
      subjectName: '${json['subject_name'] ?? ''}',
      nextCheckpointAt:
          DateTime.tryParse('${json['next_checkpoint_at'] ?? ''}')?.toLocal() ??
          DateTime.now(),
      intervalWeeks: _asInt(json['interval_weeks']),
      weakTopicCount: _asInt(json['weak_topic_count']),
      reviewMinutesDelta: _asInt(json['review_minutes_delta']),
      reviewScheduleTypeId: _asInt(
        json['review_schedule_type_id'],
        fallback: 2,
      ),
    );
  }

  int weeksUntil(DateTime now) {
    final days = nextCheckpointAt.difference(now).inDays;
    if (days <= 0) return 0;
    return (days / 7).ceil();
  }
}

class ExamInsights {
  final List<WeakTopicInsight> weakTopics;
  final List<ExamCheckpointInsight> nextCheckpoints;

  const ExamInsights({
    this.weakTopics = const [],
    this.nextCheckpoints = const [],
  });

  factory ExamInsights.fromJson(Map<String, dynamic> json) {
    final rawTopics = json['weak_topics'];
    final rawCheckpoints = json['next_checkpoints'];
    return ExamInsights(
      weakTopics: rawTopics is List
          ? rawTopics
                .whereType<Map>()
                .map(
                  (item) => WeakTopicInsight.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
      nextCheckpoints: rawCheckpoints is List
          ? rawCheckpoints
                .whereType<Map>()
                .map(
                  (item) => ExamCheckpointInsight.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
          : const [],
    );
  }
}

class ExamAnswer {
  final int questionId;
  final int choiceId;

  const ExamAnswer({required this.questionId, required this.choiceId});

  factory ExamAnswer.fromJson(Map<String, dynamic> json) => ExamAnswer(
    questionId: _asInt(json['question_id']),
    choiceId: _asInt(json['choice_id']),
  );

  Map<String, dynamic> toJson() => {
    'question_id': questionId,
    'choice_id': choiceId,
  };
}

int _asInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  return int.tryParse('$value') ?? fallback;
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}

String? _asNullableText(dynamic value) {
  if (value == null) return null;
  final text = '$value'.trim();
  return text.isEmpty ? null : text;
}
