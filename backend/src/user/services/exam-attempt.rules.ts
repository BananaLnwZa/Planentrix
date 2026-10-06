export interface SnapshotChoice {
  choice_id: number;
  choice_order: number;
  choice_text: string;
  choice_image_path: string | null;
  is_correct: boolean;
}

export interface SnapshotQuestionForScoring {
  question_score_snapshot: number | string;
  selected_choice_order: number | string | null;
  choices_snapshot: unknown;
}

export interface SnapshotScore {
  actualScore: number;
  maximumScore: number;
  correctAnswers: number;
  results: Array<{ isCorrect: boolean; awardedScore: number }>;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

export const parseSnapshotChoices = (value: unknown): SnapshotChoice[] => {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((rawChoice) => {
    const choice = asRecord(rawChoice);
    if (!choice) return [];
    const choiceId = Number(choice.choice_id);
    const choiceOrder = Number(choice.choice_order);
    if (
      !Number.isInteger(choiceId) ||
      choiceId <= 0 ||
      !Number.isInteger(choiceOrder) ||
      choiceOrder <= 0
    ) {
      return [];
    }
    return [
      {
        choice_id: choiceId,
        choice_order: choiceOrder,
        choice_text: String(choice.choice_text ?? ""),
        choice_image_path:
          choice.choice_image_path == null
            ? null
            : String(choice.choice_image_path),
        is_correct:
          choice.is_correct === true ||
          choice.is_correct === 1 ||
          choice.is_correct === "1",
      },
    ];
  });
};

export const scoreSnapshotQuestions = (
  questions: SnapshotQuestionForScoring[],
): SnapshotScore => {
  let actualScore = 0;
  let maximumScore = 0;
  let correctAnswers = 0;

  const results = questions.map((question) => {
    const score = Number(question.question_score_snapshot);
    const safeScore = Number.isFinite(score) && score > 0 ? score : 0;
    const selectedOrder =
      question.selected_choice_order == null
        ? null
        : Number(question.selected_choice_order);
    const selectedChoice = parseSnapshotChoices(question.choices_snapshot).find(
      (choice) => choice.choice_order === selectedOrder,
    );
    const isCorrect = Boolean(selectedChoice?.is_correct);
    const awardedScore = isCorrect ? safeScore : 0;

    maximumScore += safeScore;
    actualScore += awardedScore;
    if (isCorrect) correctAnswers += 1;
    return { isCorrect, awardedScore };
  });

  return { actualScore, maximumScore, correctAnswers, results };
};

export const remainingSecondsFor = (
  timeLimitMinutes: number | null,
  elapsedSeconds: number,
) => timeLimitMinutes === null
  ? null
  : Math.max(0, timeLimitMinutes * 60 - elapsedSeconds);

export const checkpointWeeksFor = (percentage: number) =>
  percentage < 40 ? 1 : 2;
