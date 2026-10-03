import { Request, Response } from "express";
import db from "../../config/db";

const TARGET_PER_LEVEL_PER_PART = 3; // กำหนดเป้าหมาย: ดึงระดับละ 3 ข้อต่อ Part
const TARGET_TOTAL_SCORE = 100;      // คะแนนรวมแบบทดสอบเป๊ะๆ 100 คะแนน

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

    // 1. ดึง Part ทั้งหมดของวิชานี้
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

    const selectedQuestions: any[] = [];
    const partSummary: any[] = [];
    const levels = ["easy", "medium", "hard"];

    // 2. วนลูปประมวลผลแยกราย Part
    for (const part of parts) {
      // 2.1 ดึงข้อสอบทั้งหมดใน Part นี้เพื่อคำนวณ Min/Max
      const [questionsInPart]: any = await db.query(
        `SELECT
           q.question_id,
           q.question_text,
           q.question_image,
           q.score AS question_score,
           ep.exam_part_id,
           ep.exam_part_name
         FROM question q
         JOIN exam_part ep ON q.exam_part_id = ep.exam_part_id
         WHERE ep.exam_part_id = ?`,
        [part.exam_part_id]
      );

      if (questionsInPart.length === 0) continue;

      // 2.2 หาค่า Score_max, Score_min และคำนวณ Delta (step)
      const scores = questionsInPart.map((q: any) => Number(q.question_score) || 1);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const scoreRange = maxScore - minScore;
      const step = scoreRange / 3; // Delta = (Max - Min) / 3

      // 2.3 แบ่งระดับความยากอัตโนมัติ (Easy, Medium, Hard) ตามช่วงคะแนน
      const categorizedQuestions = questionsInPart.map((q: any) => {
        const rawScore = Number(q.question_score) || 1;
        let autoLevel = "medium";

        if (scoreRange === 0) {
          autoLevel = "medium"; // Fallback เมื่อคะแนนเท่ากันหมดทุกข้อ
        } else if (rawScore < minScore + step) {
          autoLevel = "easy";
        } else if (rawScore >= maxScore - step) {
          autoLevel = "hard";
        } else {
          autoLevel = "medium";
        }

        return {
          ...q,
          difficulty_level: autoLevel,
          question_score: rawScore,
        };
      });

      // 2.4 ดึงข้อสอบ Easy, Medium, Hard ออกมาในจำนวนเท่าๆ กัน
      const partQuestions: any[] = [];
      const retrievedIds = new Set<number>();

      for (const level of levels) {
        const matched = categorizedQuestions
          .filter((q: any) => q.difficulty_level === level && !retrievedIds.has(q.question_id))
          .sort(() => 0.5 - Math.random()) // สุ่มข้อสอบ
          .slice(0, TARGET_PER_LEVEL_PER_PART);

        for (const q of matched) {
          partQuestions.push(q);
          retrievedIds.add(q.question_id);
        }
      }

      // 2.5 Fallback Pool: ถ้าบางระดับความยากขาด ให้ดึงข้อสอบส่วนที่เหลือใน Part มาเติมจนครบ
      const targetCount = TARGET_PER_LEVEL_PER_PART * levels.length;
      if (partQuestions.length < targetCount) {
        const remaining = categorizedQuestions
          .filter((q: any) => !retrievedIds.has(q.question_id))
          .sort(() => 0.5 - Math.random())
          .slice(0, targetCount - partQuestions.length);

        for (const q of remaining) {
          partQuestions.push(q);
          retrievedIds.add(q.question_id);
        }
      }

      if (partQuestions.length > 0) {
        selectedQuestions.push(...partQuestions);
        partSummary.push({
          part_id: part.exam_part_id,
          part_name: part.exam_part_name,
          min_score_in_part: minScore,
          max_score_in_part: maxScore,
          total_retrieved: partQuestions.length,
          available_levels: [...new Set(partQuestions.map((q) => q.difficulty_level))],
        });
      }
    }

    if (selectedQuestions.length === 0) {
      return res.status(404).json({ message: "No questions found in any part" });
    }

    // 3. คำนวณ Dynamic Weight Scaling ให้ได้คะแนนรวม 100 คะแนนเต็มเป๊ะ
    const rawTotalScore = selectedQuestions.reduce(
      (sum, q) => sum + Number(q.question_score),
      0
    );
    const scaleFactor = rawTotalScore > 0 ? TARGET_TOTAL_SCORE / rawTotalScore : 1;

    // 4. ดึง Choices และคำนวณคะแนนปรับสเกลประจำข้อ
    const questionsWithChoices = [];
    let calculatedTotalScore = 0;

    for (const q of selectedQuestions) {
      const [choiceRows]: any = await db.query(
        `SELECT choice_id, choice_order, choice_text
         FROM choice
         WHERE question_id = ?
         ORDER BY choice_order ASC`,
        [q.question_id]
      );

      const dbScore = Number(q.question_score);
      let scaledScore = Number((dbScore * scaleFactor).toFixed(2));
      calculatedTotalScore += scaledScore;

      questionsWithChoices.push({
        question_id: q.question_id,
        question_text: q.question_text,
        question_image: q.question_image,
        auto_assigned_level: q.difficulty_level, // ความยากที่จำแนกให้อัตโนมัติ
        raw_db_score: dbScore,
        score_in_this_test: scaledScore, // คะแนนประจำข้อที่ปรับสเกลแล้ว
        exam_part_id: q.exam_part_id,
        exam_part_name: q.exam_part_name,
        choices: choiceRows,
      });
    }

    // 5. เกลี่ยเศษทศนิยมสะสม การันตีรวมกันได้ 100.00 พอดีเป๊ะ
    const scoreDiff = Number((TARGET_TOTAL_SCORE - calculatedTotalScore).toFixed(2));
    if (scoreDiff !== 0 && questionsWithChoices.length > 0) {
      questionsWithChoices[0].score_in_this_test = Number(
        (questionsWithChoices[0].score_in_this_test + scoreDiff).toFixed(2)
      );
    }

    // 6. ส่ง Response ตอบกลับ
    res.json({
      message: "Practice test generated successfully",
      user_id: authUser.id,
      subject_id,
      total_parts: parts.length,
      total_questions: questionsWithChoices.length,
      total_test_score: TARGET_TOTAL_SCORE, // คะแนนรวม 100
      raw_total_score: rawTotalScore,
      part_summary: partSummary,
      questions: questionsWithChoices,
    });
  } catch (err) {
    console.error("generatePracticeTest error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};