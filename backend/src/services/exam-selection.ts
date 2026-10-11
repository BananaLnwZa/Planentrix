export const TARGET_EXAM_SCORE = 100;

const TARGET_EXAM_SCORE_CENTS = TARGET_EXAM_SCORE * 100;

export interface ScoredExamQuestion {
  question_id: number | string;
  question_score: number | string;
  question_bank_id?: number | string;
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
  groupIndex: Map<number, number>,
) => {
  type Subset = { score: number; groupMask: bigint; questions: T[] };
  const subsets: Array<Map<string, Subset>> = Array.from(
    { length: targetCount + 1 },
    () => new Map<string, Subset>(),
  );
  subsets[0].set("0:0", { score: 0, groupMask: BigInt(0), questions: [] });

  for (const question of questions) {
    const score = scoreToCents(question.question_score);
    if (score === null || score > TARGET_EXAM_SCORE_CENTS) continue;
    for (let count = targetCount - 1; count >= 0; count -= 1) {
      for (const subset of subsets[count].values()) {
        const nextScore = subset.score + score;
        const index = groupIndex.get(Number(question.question_bank_id));
        const nextMask = subset.groupMask | (index === undefined ? BigInt(0) : BigInt(1) << BigInt(index));
        const key = `${nextScore}:${nextMask}`;
        if (
          nextScore <= TARGET_EXAM_SCORE_CENTS &&
          !subsets[count + 1].has(key)
        ) {
          subsets[count + 1].set(key, {
            score: nextScore,
            groupMask: nextMask,
            questions: [...subset.questions, question],
          });
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
  requiredGroupIds: number[] = [],
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
  const groupIndex = new Map(requiredGroupIds.map((id, index) => [id, index]));
  const requiredMask = (BigInt(1) << BigInt(requiredGroupIds.length)) - BigInt(1);
  if (requiredGroupIds.some((id) =>
    !questions.some((question) => Number(question.question_bank_id) === id)
  )) return null;

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

    const easySubsets = subsetsByScore(easy, easyCount, groupIndex);
    const mediumSubsets = subsetsByScore(medium, mediumCount, groupIndex);
    const hardSubsets = subsetsByScore(hard, hardCount, groupIndex);
    const hardByScore = new Map<
      number,
      Array<{ score: number; groupMask: bigint; questions: T[] }>
    >();
    for (const subset of hardSubsets.values()) {
      const candidates = hardByScore.get(subset.score) ?? [];
      candidates.push(subset);
      hardByScore.set(subset.score, candidates);
    }

    for (const easySubset of easySubsets.values()) {
      for (const mediumSubset of mediumSubsets.values()) {
        const requiredHardScore =
          TARGET_EXAM_SCORE_CENTS - easySubset.score - mediumSubset.score;
        const hardSubset = hardByScore.get(requiredHardScore)?.find(
          (candidate) =>
            (easySubset.groupMask | mediumSubset.groupMask | candidate.groupMask) === requiredMask,
        );
        if (!hardSubset) continue;

        const selected = shuffled(
          [...easySubset.questions, ...mediumSubset.questions, ...hardSubset.questions],
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
  requiredGroupIds: number[] = [],
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
  for (let drawCount = Math.max(3, requiredGroupIds.length); drawCount <= maximumPossibleCount; drawCount += 1) {
    const selection = selectBalancedExamQuestions(
      questions,
      drawCount,
      seed,
      requiredGroupIds,
    );
    if (selection) return selection;
  }

  return null;
};
