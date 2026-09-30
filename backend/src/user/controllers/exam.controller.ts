import { Request, Response } from "express";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

type UserRequest = Request & { user?: { id?: number | string; role?: string } };
interface ExamRow extends RowDataPacket {
  exam_repository_id: number; schedule_time_id: number; subject_id: string;
  subject_name: string; exam_name: string; total_score: number | string;
  total_question: number; time_limit: number; exam_period: "midterm" | "final";
}
interface QuestionRow extends RowDataPacket {
  question_id: number; question_text: string; question_image_path: string | null;
  question_score: number | string; question_order: number;
}
interface ChoiceRow extends RowDataPacket {
  choice_id: number; question_id: number; choice_order: number;
  choice_text: string; choice_image_path: string | null; is_correct: 0 | 1;
}
interface AttemptRow extends RowDataPacket {
  exam_attempt_id: number;
  started_at: Date | string;
  elapsed_seconds: number | string;
  status: "in_progress" | "submitted" | "expired" | "cancelled";
}

const questionImageUrl = (req: Request, imagePath: string | null) => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const filename = imagePath.split(/[\\/]/).pop();
  return filename
    ? `${req.protocol}://${req.get("host")}/uploads/questions/${encodeURIComponent(filename)}`
    : null;
};

const userIdFrom = (req: Request, res: Response) => {
  const user=(req as UserRequest).user;
  if(!user?.id){res.status(401).json({message:"Unauthorized: Missing user ID"});return null;}
  if(user.role&&user.role!=="user"){res.status(403).json({message:"Forbidden: user role required"});return null;}
  return Number(user.id);
};
const examIdFrom=(req:Request,res:Response)=>{const id=Number(req.params.exam_repository_id);if(!Number.isInteger(id)||id<=0){res.status(400).json({message:"Invalid exam_repository_id"});return null;}return id;};

const ACCESSIBLE_EXAM_SQL=`SELECT qb.question_bank_id AS exam_repository_id,e.enrollment_id AS schedule_time_id,
  qb.subject_id,s.subject_name,qb.bank_name AS exam_name,
  COALESCE(SUM(CASE WHEN q.is_active=1 THEN q.question_score ELSE 0 END),0) AS total_score,
  COUNT(CASE WHEN q.is_active=1 THEN q.question_id END) AS total_question,
  qb.time_limit_minutes AS time_limit,qb.exam_period
 FROM question_banks qb
 INNER JOIN subjects s ON s.subject_id=qb.subject_id
 INNER JOIN course_sections cs ON cs.subject_id=qb.subject_id AND cs.status IN ('open','closed')
 INNER JOIN section_instructors si ON si.section_id=cs.section_id AND si.instructor_id=qb.owner_instructor_id
 INNER JOIN enrollments e ON e.section_id=cs.section_id AND e.status='enrolled'
 INNER JOIN student_terms st ON st.student_term_id=e.student_term_id AND st.academic_term_id=cs.academic_term_id AND st.status='active'
 LEFT JOIN question q ON q.question_bank_id=qb.question_bank_id
 WHERE st.user_id=? AND qb.status='published'`;

const getAccessibleExam=async(userId:number,examId:number,connection:PoolConnection|typeof db=db)=>{
  const [rows]=await connection.query<ExamRow[]>(`${ACCESSIBLE_EXAM_SQL} AND qb.question_bank_id=?
    GROUP BY qb.question_bank_id,e.enrollment_id,qb.subject_id,s.subject_name,qb.bank_name,qb.time_limit_minutes,qb.exam_period LIMIT 1`,[userId,examId]);
  return rows[0]??null;
};

const getQuestions=async(examId:number,connection:PoolConnection|typeof db=db)=>{
  const [questions]=await connection.query<QuestionRow[]>(`SELECT q.question_id,q.question_text,q.question_image_path,q.question_score,
    ROW_NUMBER() OVER(ORDER BY q.question_id) AS question_order FROM question q
    WHERE q.question_bank_id=? AND q.is_active=1 ORDER BY q.question_id`,[examId]);
  const [choices]=questions.length?await connection.query<ChoiceRow[]>(`SELECT c.choice_id,c.question_id,c.choice_order,c.choice_text,c.choice_image_path,c.is_correct
    FROM choice c INNER JOIN question q ON q.question_id=c.question_id
    WHERE q.question_bank_id=? AND q.is_active=1 AND c.is_active=1 ORDER BY q.question_id,c.choice_order`,[examId]):[[] as ChoiceRow[],[] as unknown[]];
  return {questions,choices:choices as ChoiceRow[]};
};

export const getExamsForCurrentTerm=async(req:Request,res:Response)=>{
  try{const userId=userIdFrom(req,res);if(!userId)return;const [rows]=await db.query<ExamRow[]>(`${ACCESSIBLE_EXAM_SQL}
      GROUP BY qb.question_bank_id,e.enrollment_id,qb.subject_id,s.subject_name,qb.bank_name,qb.time_limit_minutes,qb.exam_period
      ORDER BY s.subject_name,qb.bank_name`,[userId]);
    return res.json({message:"Exams retrieved successfully",user_id:userId,total:rows.length,data:rows});
  }catch(error){console.error("getExamsForCurrentTerm error:",error);return res.status(500).json({message:"Internal server error"});}
};

export const getExamDetail=async(req:Request,res:Response)=>{
  try{const userId=userIdFrom(req,res);if(!userId)return;const examId=examIdFrom(req,res);if(!examId)return;const exam=await getAccessibleExam(userId,examId);if(!exam)return res.status(404).json({message:"Exam was not found for the current term"});
    const {questions,choices}=await getQuestions(examId);const byQuestion=new Map<number,ChoiceRow[]>();for(const choice of choices){const list=byQuestion.get(Number(choice.question_id))??[];list.push(choice);byQuestion.set(Number(choice.question_id),list);}
    const part={exam_part_id:examId,part_order:1,exam_part_name:exam.exam_name,questions:questions.map(question=>({question_id:Number(question.question_id),question_order:Number(question.question_order),question_text:question.question_text,question_image_url:questionImageUrl(req,question.question_image_path),question_score:Number(question.question_score),choices:(byQuestion.get(Number(question.question_id))??[]).map(choice=>({choice_id:Number(choice.choice_id),choice_order:Number(choice.choice_order),choice_text:choice.choice_text,choice_image_url:questionImageUrl(req,choice.choice_image_path)}))}))};
    return res.json({message:"Exam detail retrieved successfully",data:{...exam,parts:[part]}});
  }catch(error){console.error("getExamDetail error:",error);return res.status(500).json({message:"Internal server error"});}
};

export const getExamScoreHistory=async(req:Request,res:Response)=>{
  try{const userId=userIdFrom(req,res);if(!userId)return;
    const [rows]=await db.query<RowDataPacket[]>(`SELECT ea.exam_attempt_id AS exam_score_history_id,eabr.question_bank_id AS exam_repository_id,
      s.subject_id,s.subject_name,eabr.bank_name_snapshot AS exam_name,eabr.actual_score,eabr.max_score AS exam_max_score,
      ea.submitted_at AS exam_date,eabr.is_weak_topic,eabr.percentage
      FROM exam_attempts ea INNER JOIN enrollments e ON e.enrollment_id=ea.enrollment_id
      INNER JOIN student_terms st ON st.student_term_id=e.student_term_id
      INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      INNER JOIN exam_attempt_bank_results eabr ON eabr.exam_attempt_id=ea.exam_attempt_id
      WHERE st.user_id=? AND st.status='active' AND ea.status='submitted' ORDER BY ea.submitted_at DESC`,[userId]);
    const data=rows.map(row=>({...row,weak_topics:Number(row.is_weak_topic)?[{topic_name:row.exam_name,percentage:Number(row.percentage)}]:[]}));
    return res.json({message:"Exam score history retrieved successfully",user_id:userId,total:data.length,data});
  }catch(error){console.error("getExamScoreHistory error:",error);return res.status(500).json({message:"Internal server error"});}
};

export const getExamInsights=async(req:Request,res:Response)=>{
  try{const userId=userIdFrom(req,res);if(!userId)return;
    const [weak]=await db.query<RowDataPacket[]>(`SELECT e.enrollment_id AS schedule_time_id,eabr.question_bank_id AS exam_repository_id,
      eabr.question_bank_id AS exam_part_id,eabr.bank_name_snapshot AS topic_name,s.subject_id,s.subject_name,eabr.bank_name_snapshot AS exam_name,
      eabr.actual_score,eabr.max_score,eabr.percentage,4 AS study_type_id,'review' AS study_type_name
      FROM exam_attempt_bank_results eabr INNER JOIN exam_attempts ea ON ea.exam_attempt_id=eabr.exam_attempt_id
      INNER JOIN enrollments e ON e.enrollment_id=ea.enrollment_id INNER JOIN student_terms st ON st.student_term_id=e.student_term_id
      INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      WHERE st.user_id=? AND st.status='active' AND eabr.is_weak_topic=1 ORDER BY ea.submitted_at DESC`,[userId]);
    const [checkpoints]=await db.query<RowDataPacket[]>(`SELECT ec.enrollment_id AS schedule_time_id,COALESCE(eabr.question_bank_id,0) AS exam_repository_id,
      COALESCE(eabr.bank_name_snapshot,CONCAT(UPPER(ec.exam_period),' review')) AS exam_name,s.subject_id,s.subject_name,
      ec.next_checkpoint_at,ec.interval_weeks,ec.weak_topic_count,(ec.weak_topic_count*30) AS review_minutes_delta,2 AS review_schedule_type_id
      FROM exam_checkpoints ec INNER JOIN enrollments e ON e.enrollment_id=ec.enrollment_id
      INNER JOIN student_terms st ON st.student_term_id=e.student_term_id INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      LEFT JOIN exam_attempt_bank_results eabr ON eabr.exam_attempt_id=ec.source_exam_attempt_id
      WHERE st.user_id=? AND st.status='active' AND ec.status='pending' ORDER BY ec.next_checkpoint_at`,[userId]);
    return res.json({message:"Exam insights retrieved successfully",weak_topics:weak,next_checkpoints:checkpoints});
  }catch(error){console.error("getExamInsights error:",error);return res.status(500).json({message:"Internal server error"});}
};

const checkpointWeeks=(percentage:number)=>percentage<40?1:percentage<60?2:4;
const remainingSecondsFor=(timeLimitMinutes:number,elapsedSeconds:number)=>Math.max(0,timeLimitMinutes*60-elapsedSeconds);

export const startExam=async(req:Request,res:Response)=>{
  const userId=userIdFrom(req,res);if(!userId)return;const examId=examIdFrom(req,res);if(!examId)return;
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const exam=await getAccessibleExam(userId,examId,connection);
    if(!exam){await connection.rollback();return res.status(404).json({message:"Exam was not found for the current term"});}
    // Lock enrollment to serialize simultaneous start requests for this student.
    await connection.query("SELECT enrollment_id FROM enrollments WHERE enrollment_id=? FOR UPDATE",[exam.schedule_time_id]);
    const [activeRows]=await connection.query<AttemptRow[]>(`SELECT attempt.exam_attempt_id,attempt.started_at,
      TIMESTAMPDIFF(SECOND,attempt.started_at,NOW()) AS elapsed_seconds,attempt.status
      FROM exam_attempts attempt
      WHERE attempt.enrollment_id=? AND attempt.exam_period=? AND attempt.status='in_progress'
        AND EXISTS(SELECT 1 FROM exam_attempt_questions attempt_question
          WHERE attempt_question.exam_attempt_id=attempt.exam_attempt_id AND attempt_question.source_bank_id=?)
      ORDER BY attempt.exam_attempt_id DESC LIMIT 1 FOR UPDATE`,[exam.schedule_time_id,exam.exam_period,examId]);
    const active=activeRows[0];
    if(active){
      const remainingSeconds=remainingSecondsFor(Number(exam.time_limit),Number(active.elapsed_seconds));
      if(remainingSeconds>0){
        const [answerRows]=await connection.query<RowDataPacket[]>(`SELECT attempt_question.source_question_id AS question_id,choice.choice_id
          FROM exam_attempt_questions attempt_question
          INNER JOIN choice choice ON choice.question_id=attempt_question.source_question_id
            AND choice.choice_order=attempt_question.selected_choice_order AND choice.is_active=1
          WHERE attempt_question.exam_attempt_id=? AND attempt_question.source_bank_id=?
            AND attempt_question.selected_choice_order IS NOT NULL`,[active.exam_attempt_id,examId]);
        await connection.commit();
        return res.json({message:"Exam attempt resumed successfully",data:{exam_attempt_id:Number(active.exam_attempt_id),
          started_at:active.started_at,remaining_seconds:remainingSeconds,resumed:true,
          answers:answerRows.map(row=>({question_id:Number(row.question_id),choice_id:Number(row.choice_id)}))}});
      }
      await connection.query(`UPDATE exam_attempts SET status='expired',
        submitted_at=DATE_ADD(started_at,INTERVAL ? MINUTE),updated_at=NOW()
        WHERE exam_attempt_id=? AND status='in_progress'`,[Number(exam.time_limit),active.exam_attempt_id]);
    }
    const {questions,choices}=await getQuestions(examId,connection);
    if(!questions.length){await connection.rollback();return res.status(409).json({message:"This exam has no active questions"});}
    const [attempt]=await connection.query<ResultSetHeader>(`INSERT INTO exam_attempts
      (enrollment_id,exam_period,started_at,status,weak_topic_count) VALUES(?,?,NOW(),'in_progress',0)`,[exam.schedule_time_id,exam.exam_period]);
    const choicesByQuestion=new Map<number,ChoiceRow[]>();
    for(const choice of choices){const items=choicesByQuestion.get(Number(choice.question_id))??[];items.push(choice);choicesByQuestion.set(Number(choice.question_id),items);}
    for(const question of questions){
      const options=choicesByQuestion.get(Number(question.question_id))??[];
      await connection.query(`INSERT INTO exam_attempt_questions
        (exam_attempt_id,source_question_id,source_bank_id,display_order,question_text_snapshot,
         image_path_snapshot,question_score_snapshot,choices_snapshot)
        VALUES(?,?,?,?,?,?,?,?)`,[attempt.insertId,question.question_id,examId,question.question_order,
          question.question_text,question.question_image_path,Number(question.question_score),
          JSON.stringify(options.map(option=>({choice_order:Number(option.choice_order),choice_text:option.choice_text,choice_image_path:option.choice_image_path})))]);
    }
    const [startedRows]=await connection.query<RowDataPacket[]>("SELECT started_at FROM exam_attempts WHERE exam_attempt_id=?",[attempt.insertId]);
    await connection.commit();
    return res.status(201).json({message:"Exam attempt started successfully",data:{exam_attempt_id:Number(attempt.insertId),
      started_at:startedRows[0]?.started_at,remaining_seconds:Math.max(0,Number(exam.time_limit)*60),resumed:false,answers:[]}});
  }catch(error){await connection.rollback();console.error("startExam error:",error);return res.status(500).json({message:"Unable to start exam"});}
  finally{connection.release();}
};

export const saveExamAnswer=async(req:Request,res:Response)=>{
  const userId=userIdFrom(req,res);if(!userId)return;const examId=examIdFrom(req,res);if(!examId)return;
  const attemptId=Number(req.params.attempt_id),questionId=Number(req.body?.question_id),choiceId=Number(req.body?.choice_id);
  if(![attemptId,questionId,choiceId].every(value=>Number.isInteger(value)&&value>0))return res.status(400).json({message:"A valid attempt, question and choice are required"});
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const exam=await getAccessibleExam(userId,examId,connection);
    if(!exam){await connection.rollback();return res.status(404).json({message:"Exam was not found for the current term"});}
    const [attemptRows]=await connection.query<AttemptRow[]>(`SELECT attempt.exam_attempt_id,attempt.started_at,
      TIMESTAMPDIFF(SECOND,attempt.started_at,NOW()) AS elapsed_seconds,attempt.status
      FROM exam_attempts attempt INNER JOIN exam_attempt_questions attempt_question
        ON attempt_question.exam_attempt_id=attempt.exam_attempt_id
       AND attempt_question.source_bank_id=? AND attempt_question.source_question_id=?
      WHERE attempt.exam_attempt_id=? AND attempt.enrollment_id=? AND attempt.exam_period=?
        AND attempt.status='in_progress' LIMIT 1 FOR UPDATE`,[examId,questionId,attemptId,exam.schedule_time_id,exam.exam_period]);
    const attempt=attemptRows[0];
    if(!attempt){await connection.rollback();return res.status(409).json({message:"This exam attempt is no longer active"});}
    if(remainingSecondsFor(Number(exam.time_limit),Number(attempt.elapsed_seconds))<=0){
      await connection.query(`UPDATE exam_attempts SET status='expired',submitted_at=DATE_ADD(started_at,INTERVAL ? MINUTE),updated_at=NOW()
        WHERE exam_attempt_id=? AND status='in_progress'`,[Number(exam.time_limit),attemptId]);
      await connection.commit();return res.status(409).json({message:"เวลาทำข้อสอบหมดแล้ว"});
    }
    const [choiceRows]=await connection.query<RowDataPacket[]>(`SELECT choice.choice_order FROM choice choice
      INNER JOIN question question ON question.question_id=choice.question_id
      WHERE choice.choice_id=? AND question.question_id=? AND question.question_bank_id=?
        AND question.is_active=1 AND choice.is_active=1 LIMIT 1`,[choiceId,questionId,examId]);
    if(!choiceRows[0]){await connection.rollback();return res.status(400).json({message:"The selected choice is invalid"});}
    await connection.query(`UPDATE exam_attempt_questions SET selected_choice_order=?,answered_at=NOW()
      WHERE exam_attempt_id=? AND source_bank_id=? AND source_question_id=?`,[choiceRows[0].choice_order,attemptId,examId,questionId]);
    await connection.commit();return res.json({message:"Answer saved",question_id:questionId});
  }catch(error){await connection.rollback();console.error("saveExamAnswer error:",error);return res.status(500).json({message:"Unable to save exam answer"});}
  finally{connection.release();}
};

export const submitExam=async(req:Request,res:Response)=>{
  const userId=userIdFrom(req,res);if(!userId)return;const examId=examIdFrom(req,res);if(!examId)return;
  const attemptId=Number(req.body?.exam_attempt_id);
  if(!Number.isInteger(attemptId)||attemptId<=0)return res.status(400).json({message:"A valid exam_attempt_id is required"});
  const answers=Array.isArray(req.body.answers)?req.body.answers:[];const selected=new Map<number,number>();
  for(const answer of answers){const questionId=Number(answer?.question_id),choiceId=Number(answer?.choice_id);if(Number.isInteger(questionId)&&Number.isInteger(choiceId))selected.set(questionId,choiceId);}
  const connection=await db.getConnection();
  try{await connection.beginTransaction();const exam=await getAccessibleExam(userId,examId,connection);if(!exam){await connection.rollback();return res.status(404).json({message:"Exam was not found for the current term"});}
    const [attemptRows]=await connection.query<AttemptRow[]>(`SELECT attempt.exam_attempt_id,attempt.started_at,
      TIMESTAMPDIFF(SECOND,attempt.started_at,NOW()) AS elapsed_seconds,attempt.status
      FROM exam_attempts attempt WHERE attempt.exam_attempt_id=? AND attempt.enrollment_id=?
        AND attempt.exam_period=? AND attempt.status='in_progress'
        AND EXISTS(SELECT 1 FROM exam_attempt_questions attempt_question
          WHERE attempt_question.exam_attempt_id=attempt.exam_attempt_id AND attempt_question.source_bank_id=?)
      LIMIT 1 FOR UPDATE`,[attemptId,exam.schedule_time_id,exam.exam_period,examId]);
    const attempt=attemptRows[0];if(!attempt){await connection.rollback();return res.status(409).json({message:"This exam attempt is no longer active"});}
    if(remainingSecondsFor(Number(exam.time_limit),Number(attempt.elapsed_seconds))<=0){
      await connection.query(`UPDATE exam_attempts SET status='expired',submitted_at=DATE_ADD(started_at,INTERVAL ? MINUTE),updated_at=NOW()
        WHERE exam_attempt_id=? AND status='in_progress'`,[Number(exam.time_limit),attemptId]);
      await connection.commit();return res.status(409).json({message:"เวลาทำข้อสอบหมดแล้ว"});
    }
    const {questions,choices}=await getQuestions(examId,connection);if(!questions.length){await connection.rollback();return res.status(409).json({message:"This exam has no active questions"});}
    const choiceMap=new Map<number,ChoiceRow[]>();for(const choice of choices){const list=choiceMap.get(Number(choice.question_id))??[];list.push(choice);choiceMap.set(Number(choice.question_id),list);}
    let actual=0,maximum=0,correct=0;const results=questions.map(question=>{const options=choiceMap.get(Number(question.question_id))??[];const choiceId=selected.get(Number(question.question_id));const chosen=options.find(choice=>Number(choice.choice_id)===choiceId);const isCorrect=Boolean(chosen?.is_correct);const score=Number(question.question_score);maximum+=score;if(isCorrect){actual+=score;correct++;}return{question,options,chosen,isCorrect,awarded:isCorrect?score:0};});
    const percentage=maximum>0?(actual/maximum)*100:0;const weak=percentage<50;
    for(const result of results){await connection.query(`UPDATE exam_attempt_questions
      SET selected_choice_order=?,is_correct=?,awarded_score=?,answered_at=IF(? IS NULL,NULL,COALESCE(answered_at,NOW()))
      WHERE exam_attempt_id=? AND source_bank_id=? AND source_question_id=?`,[result.chosen?Number(result.chosen.choice_order):null,result.isCorrect?1:0,result.awarded,result.chosen?Number(result.chosen.choice_order):null,attemptId,examId,result.question.question_id]);}
    await connection.query(`UPDATE exam_attempts SET submitted_at=NOW(),actual_score=?,max_score=?,weak_topic_count=?,status='submitted',updated_at=NOW()
      WHERE exam_attempt_id=? AND status='in_progress'`,[actual,maximum,weak?1:0,attemptId]);
    await connection.query(`INSERT INTO exam_attempt_bank_results(exam_attempt_id,question_bank_id,bank_name_snapshot,actual_score,max_score,percentage,is_weak_topic)
      VALUES(?,?,?,?,?,?,?)`,[attemptId,examId,exam.exam_name,actual,maximum,Number(percentage.toFixed(2)),weak?1:0]);
    let nextCheckpointAt:Date|null=null;let intervalWeeks=0;if(weak){intervalWeeks=checkpointWeeks(percentage);nextCheckpointAt=new Date();nextCheckpointAt.setDate(nextCheckpointAt.getDate()+intervalWeeks*7);await connection.query(`UPDATE exam_checkpoints SET status='superseded',updated_at=NOW() WHERE enrollment_id=? AND exam_period=? AND status='pending'`,[exam.schedule_time_id,exam.exam_period]);await connection.query(`INSERT INTO exam_checkpoints(enrollment_id,source_exam_attempt_id,exam_period,weak_topic_count,interval_weeks,next_checkpoint_at,status) VALUES(?,?,?,?,?,?,'pending')`,[exam.schedule_time_id,attemptId,exam.exam_period,1,intervalWeeks,nextCheckpointAt]);}
    await connection.commit();return res.json({message:"Exam submitted successfully",exam_score_history_id:attemptId,actual_score:actual,exam_max_score:maximum,correct_answers:correct,total_questions:questions.length,next_checkpoint_at:nextCheckpointAt,checkpoint_interval_weeks:intervalWeeks,weak_topic_count:weak?1:0,review_minutes_delta:weak?30:0,schedule_recommendation_id:null,review_method:weak?{study_type_id:4,study_type_name:"review",fallback_used:false}:null});
  }catch(error){await connection.rollback();console.error("submitExam error:",error);return res.status(500).json({message:"Internal server error"});}finally{connection.release();}
};
