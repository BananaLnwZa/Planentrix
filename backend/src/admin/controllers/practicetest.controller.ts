import { Request, Response } from "express";
import db from "../../config/db";

const TARGET_PER_LEVEL_PER_PART = 3; // กำหนดเป้าหมาย: ดึงระดับละ 3 ข้อต่อ Part
const TARGET_TOTAL_SCORE = 100;      // คะแนนรวมแบบทดสอบเป๊ะๆ 100 คะแนน

function getValidScores(bucket: any[], targetCount: number): Map<number, any[]> {
  const dp: Map<number, any[]>[] = Array.from({ length: targetCount + 1 }, () => new Map());
  dp[0].set(0, []); 
  
  for (const q of bucket) {
    const score = Number(q.question_score);
    for (let c = targetCount - 1; c >= 0; c--) {
      for (const [s, prevSubset] of Array.from(dp[c].entries())) {
        const newScore = Number((s + score).toFixed(2));
        if (newScore <= 100 && !dp[c + 1].has(newScore)) {
          dp[c + 1].set(newScore, [...prevSubset, q]);
        }
      }
    }
  }
  return dp[targetCount];
}

function getPartitions(total: number): number[][] {
  const base = Math.floor(total / 3);
  const rem = total % 3;
  if (rem === 0) return [[base, base, base]];
  if (rem === 1) return [
    [base + 1, base, base], [base, base + 1, base], [base, base, base + 1]
  ];
  return [
    [base + 1, base + 1, base], [base + 1, base, base + 1], [base, base + 1, base + 1]
  ];
}

export const generatePracticeTest = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    const { subject_id } = req.body;
    if (!subject_id) {
      return res.status(400).json({ message: "subject_id is required" });
    }

    const [parts]: any = await db.query(
      `SELECT DISTINCT ep.exam_part_id, ep.exam_part_name 
       FROM exam_part ep
       JOIN exam_repository er ON ep.exam_repository_id = er.exam_repository_id
       WHERE er.subject_id = ?`,
      [subject_id]
    );

    if (parts.length === 0) {
      return res.status(404).json({ message: "No exam parts found for this subject" });
    }

    const [allQuestions]: any = await db.query(
      `SELECT
         q.question_id,
         q.question_text,
         q.question_image,
         q.score AS question_score,
         ep.exam_part_id,
         ep.exam_part_name
       FROM question q
       JOIN exam_part ep ON q.exam_part_id = ep.exam_part_id
       JOIN exam_repository er ON ep.exam_repository_id = er.exam_repository_id
       WHERE er.subject_id = ? AND q.is_active = 1`,
      [subject_id]
    );

    if (allQuestions.length === 0) {
      return res.status(404).json({ message: "No active questions found for this subject" });
    }

    const shuffledQuestions = [...allQuestions].sort(() => 0.5 - Math.random());
    const scores = shuffledQuestions.map((q: any) => Number(q.question_score));
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const easyBucket: any[] = [];
    const mediumBucket: any[] = [];
    const hardBucket: any[] = [];

    if (minScore === maxScore) {
      shuffledQuestions.forEach((q, i) => {
        if (i % 3 === 0) easyBucket.push({ ...q, difficulty_level: "easy" });
        else if (i % 3 === 1) mediumBucket.push({ ...q, difficulty_level: "medium" });
        else hardBucket.push({ ...q, difficulty_level: "hard" });
      });
    } else {
      const range = (maxScore - minScore) / 3;
      for (const q of shuffledQuestions) {
        const score = Number(q.question_score);
        if (score < minScore + range) {
          easyBucket.push({ ...q, difficulty_level: "easy" });
        } else if (score < maxScore - range) {
          mediumBucket.push({ ...q, difficulty_level: "medium" });
        } else {
          hardBucket.push({ ...q, difficulty_level: "hard" });
        }
      }
    }

    // เราจะลองจำนวนข้อที่แตกต่างกันไปเรื่อยๆ เพื่อหาชุดแรกที่รวมได้ 100 คะแนนเป๊ะ
    // เริ่มจากค่าตั้งต้นคือ 9 ข้อต่อ Part (เหมือนเวอร์ชันเดิม) แล้วค่อยขยับไปค่าอื่นถ้าหาไม่ได้
    const possibleDrawCounts = [
      parts.length * 9, 
      20, 25, 30, 15, 10, 35, 40, 45, 50, 60, 100
    ];
    
    let selectedQuestions: any[] = [];
    let found = false;

    for (const dCount of possibleDrawCounts) {
      if (easyBucket.length + mediumBucket.length + hardBucket.length < dCount) continue;
      
      const partitions = getPartitions(dCount);
      for (const [cE, cM, cH] of partitions) {
        if (easyBucket.length < cE || mediumBucket.length < cM || hardBucket.length < cH) continue;

        const easyCombinations = getValidScores(easyBucket, cE);
        const medCombinations = getValidScores(mediumBucket, cM);
        const hardCombinations = getValidScores(hardBucket, cH);

        for (const [scoreE, subsetE] of easyCombinations.entries()) {
          for (const [scoreM, subsetM] of medCombinations.entries()) {
            const scoreH = Number((100 - scoreE - scoreM).toFixed(2));
            if (hardCombinations.has(scoreH)) {
              selectedQuestions = [...subsetE, ...subsetM, ...hardCombinations.get(scoreH)!];
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }

    if (!found) {
      return res.status(409).json({ message: "ไม่สามารถสร้างชุดข้อสอบจำลองให้รวมได้ 100 คะแนนเป๊ะ จากคลังข้อสอบปัจจุบันได้ (กรุณาเพิ่มข้อสอบหรือปรับคะแนน)" });
    }

    const questionsWithChoices = [];

    for (const q of selectedQuestions) {
      const [choiceRows]: any = await db.query(
        `SELECT choice_id, choice_order, choice_text
         FROM choice
         WHERE question_id = ?
         ORDER BY choice_order ASC`,
        [q.question_id]
      );

      questionsWithChoices.push({
        question_id: q.question_id,
        question_text: q.question_text,
        question_image: q.question_image,
        auto_assigned_level: q.difficulty_level,
        raw_db_score: Number(q.question_score),
        score_in_this_test: Number(q.question_score), // ใช้คะแนนดิบ 100% ไม่มีการปรับสเกล
        exam_part_id: q.exam_part_id,
        exam_part_name: q.exam_part_name,
        choices: choiceRows,
      });
    }

    const partSummaryMap = new Map();
    for (const q of selectedQuestions) {
      if (!partSummaryMap.has(q.exam_part_id)) {
        partSummaryMap.set(q.exam_part_id, {
          part_id: q.exam_part_id,
          part_name: q.exam_part_name,
          total_retrieved: 0,
          levels: new Set()
        });
      }
      const p = partSummaryMap.get(q.exam_part_id);
      p.total_retrieved++;
      p.levels.add(q.difficulty_level);
    }
    const partSummary = Array.from(partSummaryMap.values()).map((p: any) => ({
      ...p,
      available_levels: Array.from(p.levels)
    }));

    res.json({
      message: "Practice test generated successfully (Exact 100 Raw Points)",
      user_id: authUser.id,
      subject_id,
      total_parts: partSummary.length,
      total_questions: questionsWithChoices.length,
      total_test_score: 100,
      raw_total_score: 100,
      part_summary: partSummary,
      questions: questionsWithChoices,
    });
  } catch (err) {
    console.error("generatePracticeTest error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};