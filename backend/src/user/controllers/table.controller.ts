import { Request, Response } from "express";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

const WEEKLY_ID_OFFSET = 1_000_000_000;
const ALLOWED_TYPES = [2, 3];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

type UserRequest = Request & { user?: { id: number; role?: string } };
interface TermRow extends RowDataPacket {
  term_id: number; term: number; semester: string; academic_year: number;
}
interface ScheduleRow extends RowDataPacket {
  schedule_time_id: number; schedule_type_id: number; schedule_type_name: string;
  subject_id: string; subject_name: string; teacher_name: string; credits: number;
  schedule_day: number; start_time: string; end_time: string;
  classroom: string | null; note: string | null;
}

const getUserId = (req: Request, res: Response) => {
  const user = (req as UserRequest).user;
  if (!user?.id) { res.status(401).json({ message: "Unauthorized: Missing user ID" }); return null; }
  if (user.role && user.role !== "user") { res.status(403).json({ message: "Forbidden: user role required" }); return null; }
  return user.id;
};

const getCurrentTerm = async (userId: number, connection: PoolConnection | typeof db = db) => {
  const [rows] = await connection.query<TermRow[]>(
    `SELECT st.student_term_id AS term_id, at.semester_no AS term,
       CONCAT('Semester ', at.semester_no) AS semester, at.academic_year
     FROM student_terms st
     INNER JOIN academic_terms at ON at.academic_term_id = st.academic_term_id
     WHERE st.user_id = ? AND st.status = 'active'
     ORDER BY st.student_term_id DESC LIMIT 1`, [userId]);
  return rows[0] ?? null;
};

const termJson = (term: TermRow) => ({
  term_id: Number(term.term_id), term: Number(term.term),
  academic_year: Number(term.academic_year), semester: term.semester,
});
const normalizeTime = (value: string) => value.length === 5 ? `${value}:00` : value;
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monday = () => { const d = new Date(); const day = d.getDay() || 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day + 1); return d; };
const dateForDay = (day: number) => { const d = monday(); d.setDate(d.getDate() + day - 1); return localDate(d); };
const validate = (day: unknown, start: unknown, end: unknown) => {
  const scheduleDay = Number(day); const startTime = String(start ?? ""); const endTime = String(end ?? "");
  if (!Number.isInteger(scheduleDay) || scheduleDay < 1 || scheduleDay > 7) return { error: "schedule_day must be an integer between 1 and 7" };
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) return { error: "start_time and end_time must use HH:mm or HH:mm:ss format" };
  if (normalizeTime(startTime) >= normalizeTime(endTime)) return { error: "start_time must be before end_time" };
  return { scheduleDay, startTime, endTime };
};

const CLASS_SQL = `SELECT cm.class_meeting_id AS schedule_time_id, 1 AS schedule_type_id,
  'Class' AS schedule_type_name, s.subject_id, s.subject_name,
  COALESCE(GROUP_CONCAT(DISTINCT CONCAT(i.first_name, ' ', i.last_name) SEPARATOR ', '), '') AS teacher_name,
  CAST(s.credits AS DOUBLE) AS credits,
  FIELD(cm.day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS schedule_day,
  TIME_FORMAT(cm.start_time,'%H:%i') AS start_time, TIME_FORMAT(cm.end_time,'%H:%i') AS end_time,
  cm.classroom, NULL AS note
 FROM student_terms st
 INNER JOIN enrollments e ON e.student_term_id=st.student_term_id AND e.status='enrolled'
 INNER JOIN course_sections cs ON cs.section_id=e.section_id
 INNER JOIN subjects s ON s.subject_id=cs.subject_id
 INNER JOIN class_meetings cm ON cm.section_id=cs.section_id
 LEFT JOIN section_instructors si ON si.section_id=cs.section_id
 LEFT JOIN admin i ON i.admin_id=si.instructor_id
 WHERE st.user_id=? AND st.student_term_id=?
 GROUP BY cm.class_meeting_id,s.subject_id,s.subject_name,s.credits,cm.day_of_week,cm.start_time,cm.end_time,cm.classroom`;

const WEEKLY_SQL = `SELECT (? + wb.weekly_block_id) AS schedule_time_id, wb.schedule_type_id,
  COALESCE(t.type_name,CASE wb.schedule_type_id WHEN 2 THEN 'Study' ELSE 'Homework' END) AS schedule_type_name,
  s.subject_id,s.subject_name,'' AS teacher_name,CAST(s.credits AS DOUBLE) AS credits,
  DAYOFWEEK(wb.scheduled_date + INTERVAL 1 DAY) AS schedule_day,
  TIME_FORMAT(wb.start_time,'%H:%i') AS start_time,TIME_FORMAT(wb.end_time,'%H:%i') AS end_time,
  NULL AS classroom,NULL AS note
 FROM weekly_schedule_block wb
 INNER JOIN weekly_recommendation wr ON wr.recommendation_id=wb.recommendation_id
 INNER JOIN enrollments e ON e.enrollment_id=wb.enrollment_id
 INNER JOIN course_sections cs ON cs.section_id=e.section_id
 INNER JOIN subjects s ON s.subject_id=cs.subject_id
 LEFT JOIN schedule_types t ON t.schedule_type_id=wb.schedule_type_id
 WHERE wr.student_term_id=? AND wr.status='accepted'`;

export const getScheduleForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res); if (!userId) return;
    const term = await getCurrentTerm(userId); if (!term) return res.status(404).json({ message: "No current term found" });
    const [classes] = await db.query<ScheduleRow[]>(CLASS_SQL, [userId, term.term_id]);
    const [weekly] = await db.query<ScheduleRow[]>(WEEKLY_SQL, [WEEKLY_ID_OFFSET, term.term_id]);
    const data = [...classes, ...weekly].sort((a,b) => Number(a.schedule_day)-Number(b.schedule_day) || String(a.start_time).localeCompare(String(b.start_time)));
    return res.json({ message: "Schedule retrieved successfully", user_id: userId, current_term: termJson(term), total: data.length, data });
  } catch (error) { console.error("getScheduleForCurrentTerm error:", error); return res.status(500).json({ message: "Internal server error" }); }
};

export const getSubjectsForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res); if (!userId) return;
    const term = await getCurrentTerm(userId); if (!term) return res.status(404).json({ message: "No current term found" });
    const [data] = await db.query<RowDataPacket[]>(`SELECT DISTINCT s.subject_id,s.subject_name FROM enrollments e
      INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      WHERE e.student_term_id=? AND e.status='enrolled' ORDER BY s.subject_name,s.subject_id`, [term.term_id]);
    return res.json({ message: "Current term subjects retrieved successfully", current_term: termJson(term), total: data.length, data });
  } catch (error) { console.error("getSubjectsForCurrentTerm error:", error); return res.status(500).json({ message: "Internal server error" }); }
};

export const getScheduleTimeById = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res); if (!userId) return;
    const term = await getCurrentTerm(userId); if (!term) return res.status(404).json({ message: "No current term found" });
    const id = Number(req.params.schedule_time_id); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid schedule_time_id" });
    let data: ScheduleRow | undefined;
    if (id >= WEEKLY_ID_OFFSET) {
      const [rows] = await db.query<ScheduleRow[]>(`${WEEKLY_SQL} AND wb.weekly_block_id=? LIMIT 1`, [WEEKLY_ID_OFFSET, term.term_id, id-WEEKLY_ID_OFFSET]); data=rows[0];
    } else {
      const [rows] = await db.query<ScheduleRow[]>(`${CLASS_SQL} HAVING cm.class_meeting_id=? LIMIT 1`, [userId, term.term_id, id]); data=rows[0];
    }
    if (!data) return res.status(404).json({ message: "Schedule time not found" });
    return res.json({ message: "Schedule time detail retrieved successfully", data });
  } catch (error) { console.error("getScheduleTimeById error:", error); return res.status(500).json({ message: "Internal server error" }); }
};

const ensureTypes = (connection: PoolConnection) => connection.query(`INSERT INTO schedule_types(schedule_type_id,type_code,type_name,is_active)
  VALUES(1,'class','Class',1),(2,'study','Study',1),(3,'homework','Homework',1)
  ON DUPLICATE KEY UPDATE type_code=VALUES(type_code),type_name=VALUES(type_name),is_active=1`);

const getAcceptedRecommendation = async (connection: PoolConnection, termId: number) => {
  const weekStart=localDate(monday()); const end=monday(); end.setDate(end.getDate()+6); const weekEnd=localDate(end);
  const [rows]=await connection.query<RowDataPacket[]>(`SELECT recommendation_id FROM weekly_recommendation
    WHERE student_term_id=? AND week_start_date=? AND status='accepted' ORDER BY version DESC LIMIT 1`,[termId,weekStart]);
  if(rows[0]) return Number(rows[0].recommendation_id);
  const [versions]=await connection.query<RowDataPacket[]>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM weekly_recommendation WHERE student_term_id=? AND week_start_date=?`,[termId,weekStart]);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO weekly_recommendation(student_term_id,week_start_date,week_end_date,version,trigger_type,rule_version,status,generated_at,accepted_at)
    VALUES(?,?,?,?,'manual','manual-v1','accepted',NOW(),NOW())`,[termId,weekStart,weekEnd,Number(versions[0].version)]);
  return result.insertId;
};

export const addTime = async (req: Request, res: Response) => {
  const userId=getUserId(req,res); if(!userId)return;
  const {subject_id,schedule_day,start_time,end_time,schedule_type_id}=req.body;
  if(!subject_id || !ALLOWED_TYPES.includes(Number(schedule_type_id))) return res.status(400).json({message:"subject_id and schedule_type_id 2 or 3 are required"});
  const valid=validate(schedule_day,start_time,end_time); if(valid.error)return res.status(400).json({message:valid.error});
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction(); const term=await getCurrentTerm(userId,connection);
    if(!term){await connection.rollback();return res.status(404).json({message:"No current term found"});}
    const [subjects]=await connection.query<RowDataPacket[]>(`SELECT e.enrollment_id,s.subject_name FROM enrollments e
      INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      WHERE e.student_term_id=? AND e.status='enrolled' AND s.subject_id=? LIMIT 1`,[term.term_id,subject_id]);
    if(!subjects[0]){await connection.rollback();return res.status(404).json({message:"Subject is not enrolled in the current term"});}
    await ensureTypes(connection); const recommendationId=await getAcceptedRecommendation(connection,term.term_id);
    const [result]=await connection.query<ResultSetHeader>(`INSERT INTO weekly_schedule_block(recommendation_id,enrollment_id,schedule_type_id,scheduled_date,start_time,end_time,source,is_user_modified)
      VALUES(?,?,?,?,?,?,'user_added',1)`,[recommendationId,subjects[0].enrollment_id,Number(schedule_type_id),dateForDay(valid.scheduleDay!),normalizeTime(valid.startTime!),normalizeTime(valid.endTime!)]);
    await connection.commit(); return res.status(201).json({message:"Schedule time added successfully",schedule_time_id:WEEKLY_ID_OFFSET+result.insertId,user_id:userId,term_id:term.term_id,subject_id,subject_name:subjects[0].subject_name,schedule_day:valid.scheduleDay,start_time:valid.startTime,end_time:valid.endTime,schedule_type_id:Number(schedule_type_id)});
  }catch(error){await connection.rollback();console.error("addTime error:",error);return res.status(500).json({message:"Internal server error"});}finally{connection.release();}
};

export const updateScheduleTime = async (req: Request,res: Response) => {
  try{
    const userId=getUserId(req,res);if(!userId)return;const id=Number(req.params.schedule_time_id);
    if(id<WEEKLY_ID_OFFSET)return res.status(409).json({message:"Class times are managed by staff"});
    const term=await getCurrentTerm(userId);if(!term)return res.status(404).json({message:"No current term found"});
    const [rows]=await db.query<RowDataPacket[]>(`SELECT wb.*,DAYOFWEEK(wb.scheduled_date + INTERVAL 1 DAY) AS schedule_day FROM weekly_schedule_block wb
      INNER JOIN weekly_recommendation wr ON wr.recommendation_id=wb.recommendation_id WHERE wb.weekly_block_id=? AND wr.student_term_id=? LIMIT 1`,[id-WEEKLY_ID_OFFSET,term.term_id]);
    if(!rows[0])return res.status(404).json({message:"Schedule time not found"});
    const valid=validate(req.body.schedule_day??rows[0].schedule_day,req.body.start_time??rows[0].start_time,req.body.end_time??rows[0].end_time);if(valid.error)return res.status(400).json({message:valid.error});
    await db.query(`UPDATE weekly_schedule_block SET scheduled_date=?,start_time=?,end_time=?,source='user_adjusted',is_user_modified=1 WHERE weekly_block_id=?`,[dateForDay(valid.scheduleDay!),normalizeTime(valid.startTime!),normalizeTime(valid.endTime!),id-WEEKLY_ID_OFFSET]);
    return res.json({message:"Schedule time updated successfully",schedule_time_id:id,user_id:userId,updated_data:{schedule_day:valid.scheduleDay,start_time:valid.startTime,end_time:valid.endTime,classroom:null,note:null}});
  }catch(error){console.error("updateScheduleTime error:",error);return res.status(500).json({message:"Internal server error"});}
};

export const deleteScheduleTime = async (req: Request,res: Response) => {
  try{
    const userId=getUserId(req,res);if(!userId)return;const id=Number(req.params.schedule_time_id);
    if(id<WEEKLY_ID_OFFSET)return res.status(409).json({message:"Class times are managed by staff"});
    const term=await getCurrentTerm(userId);if(!term)return res.status(404).json({message:"No current term found"});
    const [rows]=await db.query<RowDataPacket[]>(`SELECT wb.*,cs.subject_id,DAYOFWEEK(wb.scheduled_date + INTERVAL 1 DAY) AS schedule_day FROM weekly_schedule_block wb
      INNER JOIN weekly_recommendation wr ON wr.recommendation_id=wb.recommendation_id INNER JOIN enrollments e ON e.enrollment_id=wb.enrollment_id INNER JOIN course_sections cs ON cs.section_id=e.section_id
      WHERE wb.weekly_block_id=? AND wr.student_term_id=? LIMIT 1`,[id-WEEKLY_ID_OFFSET,term.term_id]);
    if(!rows[0])return res.status(404).json({message:"Schedule time not found"});await db.query(`DELETE FROM weekly_schedule_block WHERE weekly_block_id=?`,[id-WEEKLY_ID_OFFSET]);
    return res.json({message:"Schedule time deleted successfully",schedule_time_id:id,user_id:userId,deleted_data:{schedule_time_id:id,term_id:term.term_id,user_id:userId,schedule_type_id:Number(rows[0].schedule_type_id),subject_id:rows[0].subject_id,schedule_day:Number(rows[0].schedule_day),start_time:rows[0].start_time,end_time:rows[0].end_time,classroom:null,target_score:null,note:null}});
  }catch(error){console.error("deleteScheduleTime error:",error);return res.status(500).json({message:"Internal server error"});}
};
