export interface ExamSummary {
  examRepositoryId: number;
  scheduleTimeId: number;
  subjectId: string;
  subjectName: string;
  examName: string;
  totalScore: number;
  totalQuestion: number;
  timeLimitMinutes: number;
}

export interface ExamChoice {
  choiceId: number;
  order: number;
  text: string;
}

export interface ExamQuestion {
  questionId: number;
  order: number;
  text: string;
  score: number;
  partName: string;
  choices: ExamChoice[];
}

export interface ExamDetail {
  summary: ExamSummary;
  questions: ExamQuestion[];
}

export interface ExamHistoryWeakTopic {
  topicName: string;
  percentage: number;
}

export interface ExamHistoryItem {
  historyId: number;
  examRepositoryId: number;
  subjectId: string;
  examName: string;
  subjectName: string;
  actualScore: number;
  maximumScore: number;
  examDate: Date | null;
  weakTopics: ExamHistoryWeakTopic[];
}

export interface WeakTopicInsight {
  scheduleTimeId: number;
  examRepositoryId: number;
  examPartId: number;
  topicName: string;
  subjectId: string;
  subjectName: string;
  examName: string;
  actualScore: number;
  maximumScore: number;
  percentage: number;
  studyTypeId: number;
  studyTypeName: string;
}

export interface ExamCheckpointInsight {
  scheduleTimeId: number;
  examRepositoryId: number;
  examName: string;
  subjectId: string;
  subjectName: string;
  nextCheckpointAt: Date;
  intervalWeeks: number;
  weakTopicCount: number;
  reviewMinutesDelta: number;
  reviewScheduleTypeId: number;
}

export interface ExamInsights {
  weakTopics: WeakTopicInsight[];
  nextCheckpoints: ExamCheckpointInsight[];
}

export interface ExamAnswer {
  questionId: number;
  choiceId: number;
}

export interface ExamSubmissionResult {
  historyId: number;
  actualScore: number;
  maximumScore: number;
  correctAnswers: number;
  totalQuestions: number;
  nextCheckpointAt: Date | null;
  checkpointIntervalWeeks: number;
  weakTopicCount: number;
  reviewMinutesDelta: number;
  scheduleRecommendationId: number | null;
  reviewMethod: {
    studyTypeId: number;
    studyTypeName: string;
    fallbackUsed: boolean;
  } | null;
}
