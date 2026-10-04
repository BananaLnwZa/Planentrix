export const TARGET_EXAM_SCORE = 100;

const TARGET_EXAM_SCORE_CENTS = TARGET_EXAM_SCORE * 100;

export interface ScoredExamQuestion {
  question_id: number | string;
  question_score: number | string;
}

export interface BalancedExamSelection<T extends ScoredExamQuestion> {
  questions: T[];
  totalScore: number;
  distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

const scoreToCents = (value: number | string) => {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return null;
  const cents = Math.round(score * 100);
  return cents > 0 ? cents : null;
};

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: string) => {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffled = <T>(values: T[], random: () => number) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const balancedPartitions = (total: number): Array<[number, number, number]> => {
  const base = Math.floor(total / 3);
  const remainder = total % 3;
  if (remainder === 0) return [[base, base, base]];
  if (remainder === 1) {
    return [
      [base + 1, base, base],
      [base, base + 1, base],
      [base, base, base + 1],
    ];
  }
  return [
    [base + 1, base + 1, base],
    [base + 1, base, base + 1],
    [base, base + 1, base + 1],
  ];
};

const subsetsByScore = <T extends ScoredExamQuestion>(
  questions: T[],
  targetCount: number,
) => {
  const subsets: Array<Map<number, T[]>> = Array.from(
    { length: targetCount + 1 },
    () => new Map<number, T[]>(),
  );
  subsets[0].set(0, []);

  for (const question of questions) {
    const score = scoreToCents(question.question_score);
    if (score === null || score > TARGET_EXAM_SCORE_CENTS) continue;
    for (let count = targetCount - 1; count >= 0; count -= 1) {
      for (const [currentScore, currentQuestions] of subsets[count]) {
        const nextScore = currentScore + score;
        if (
          nextScore <= TARGET_EXAM_SCORE_CENTS &&
          !subsets[count + 1].has(nextScore)
        ) {
          subsets[count + 1].set(nextScore, [
            ...currentQuestions,
            question,
          ]);
        }
      }
    }
  }

  return subsets[targetCount];
};

const questionIdentity = (question: ScoredExamQuestion) =>
  String(Number(question.question_id));

const compareQuestionIdentity = (
  left: ScoredExamQuestion,
  right: ScoredExamQuestion,
) => Number(left.question_id) - Number(right.question_id);

const difficultyBuckets = <T extends ScoredExamQuestion>(questions: T[]) => {
  const orderedQuestions = [...questions].sort(compareQuestionIdentity);
  const scores = orderedQuestions.map((question) =>
    Number(question.question_score),
  );
  const minimumScore = Math.min(...scores);
  const maximumScore = Math.max(...scores);
  const easy: T[] = [];
  const medium: T[] = [];
  const hard: T[] = [];

  if (minimumScore === maximumScore) {
    orderedQuestions.forEach((question, index) => {
      if (index % 3 === 0) easy.push(question);
      else if (index % 3 === 1) medium.push(question);
      else hard.push(question);
    });
    return { easy, medium, hard };
  }

  const range = (maximumScore - minimumScore) / 3;
  for (const question of orderedQuestions) {
    const score = Number(question.question_score);
    if (score < minimumScore + range) easy.push(question);
    else if (score < maximumScore - range) medium.push(question);
    else hard.push(question);
  }
  return { easy, medium, hard };
};

export const selectBalancedExamQuestions = <T extends ScoredExamQuestion>(
  questions: T[],
  drawCount: number,
  seed: string,
): BalancedExamSelection<T> | null => {
  if (
    !Number.isInteger(drawCount) ||
    drawCount <= 0 ||
    questions.length < drawCount ||
    questions.some(
      (question) =>
        !Number.isInteger(Number(question.question_id)) ||
        Number(question.question_id) <= 0 ||
        scoreToCents(question.question_score) === null,
    )
  ) {
    return null;
  }

  const identities = new Set(questions.map(questionIdentity));
  if (identities.size !== questions.length) return null;

  const random = seededRandom(seed);
  const buckets = difficultyBuckets(questions);
  const easy = shuffled(buckets.easy, random);
  const medium = shuffled(buckets.medium, random);
  const hard = shuffled(buckets.hard, random);

  for (const [easyCount, mediumCount, hardCount] of balancedPartitions(drawCount)) {
    if (
      easy.length < easyCount ||
      medium.length < mediumCount ||
      hard.length < hardCount
    ) {
      continue;
    }

    const easySubsets = subsetsByScore(easy, easyCount);
    const mediumSubsets = subsetsByScore(medium, mediumCount);
    const hardSubsets = subsetsByScore(hard, hardCount);

    for (const [easyScore, easyQuestions] of easySubsets) {
      for (const [mediumScore, mediumQuestions] of mediumSubsets) {
        const requiredHardScore =
          TARGET_EXAM_SCORE_CENTS - easyScore - mediumScore;
        const hardQuestions = hardSubsets.get(requiredHardScore);
        if (!hardQuestions) continue;

        const selected = shuffled(
          [...easyQuestions, ...mediumQuestions, ...hardQuestions],
          random,
        );
        return {
          questions: selected,
          totalScore: TARGET_EXAM_SCORE,
          distribution: {
            easy: easyCount,
            medium: mediumCount,
            hard: hardCount,
          },
        };
      }
    }
  }

  return null;
};

export const selectAutomaticBalancedExamQuestions = <
  T extends ScoredExamQuestion,
>(
  questions: T[],
  seed: string,
): BalancedExamSelection<T> | null => {
  const validScores = questions
    .map((question) => scoreToCents(question.question_score))
    .filter((score): score is number => score !== null);
  if (validScores.length !== questions.length || questions.length < 3) {
    return null;
  }

  const smallestScore = Math.min(...validScores);
  const maximumPossibleCount = Math.min(
    questions.length,
    Math.floor(TARGET_EXAM_SCORE_CENTS / smallestScore),
  );

  // Start at three so every generated exam contains easy, medium, and hard
  // questions. Trying counts in ascending order also keeps the exam concise.
  for (let drawCount = 3; drawCount <= maximumPossibleCount; drawCount += 1) {
    const selection = selectBalancedExamQuestions(questions, drawCount, seed);
    if (selection) return selection;
  }

  return null;
};
