import { Request, Response } from "express";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

const HARD_LIMIT_SECONDS = 4 * 60 * 60;
const STALE_AFTER_MINUTES = 15;
const METHODS = [
  { study_type_id: 1, study_type_name: "reading" },
  { study_type_id: 2, study_type_name: "practice" },
  { study_type_id: 3, study_type_name: "video" },
  { study_type_id: 4, study_type_name: "review" },
] as const;
type MethodName = (typeof METHODS)[number]["study_type_name"];
type SessionStatus = "running" | "paused" | "completed" | "interrupted" | "cancelled";
type RecoveryAction = "continue" | "finish_last_seen" | "finish_now" | "save_interrupted" | "cancel";
type UserRequest = Request & { user?: { id: number; role?: string } };

interface TermRow extends RowDataPacket {
  term_id: number; term: number; semester: string; academic_year: number; created_at: Date;
}
interface SessionRow extends RowDataPacket {
  study_time_id: number; schedule_time_id: number; study_type_id: number; study_type_name: MethodName;
  subject_id: string; subject_name: string; start_time: Date; end_time: Date | null;
  time_spent: string | null; session_status: SessionStatus; running_since: Date | null;
  accumulated_seconds: number; last_seen_at: Date | null; version: number;
  updated_at: Date; elapsed_seconds: number; is_stale: number; server_time: Date;
}
interface WeeklyRow extends RowDataPacket { week_number: number; total_minutes: string | number; }
interface HistoryRow extends RowDataPacket {
  month_key: string; subject_id: string; subject_name: string; study_type_name: MethodName;
  total_minutes: string | number; session_count: number;
}

const SESSION_SELECT = `SELECT ss.study_session_id AS study_time_id,
  ss.enrollment_id AS schedule_time_id,
  CASE ss.study_method WHEN 'reading' THEN 1 WHEN 'practice' THEN 2 WHEN 'video' THEN 3 ELSE 4 END AS study_type_id,
  ss.study_method AS study_type_name,s.subject_id,s.subject_name,
  ss.started_at AS start_time,ss.ended_at AS end_time,
  CASE WHEN ss.status='completed' THEN ROUND(ss.accumulated_seconds/60,2) ELSE NULL END AS time_spent,
  ss.status AS session_status,ss.running_since,ss.accumulated_seconds,ss.last_seen_at,ss.version,ss.updated_at,
  LEAST(${HARD_LIMIT_SECONDS},ss.accumulated_seconds + CASE WHEN ss.status='running' AND ss.running_since IS NOT NULL
    THEN GREATEST(0,TIMESTAMPDIFF(SECOND,ss.running_since,NOW())) ELSE 0 END) AS elapsed_seconds,
  CASE WHEN ss.status='running' AND (ss.last_seen_at IS NULL OR ss.last_seen_at<DATE_SUB(NOW(),INTERVAL ${STALE_AFTER_MINUTES} MINUTE)) THEN 1 ELSE 0 END AS is_stale,
  NOW() AS server_time
 FROM study_sessions ss
 INNER JOIN enrollments e ON e.enrollment_id=ss.enrollment_id
 INNER JOIN student_terms st ON st.student_term_id=e.student_term_id
 INNER JOIN course_sections cs ON cs.section_id=e.section_id
 INNER JOIN subjects s ON s.subject_id=cs.subject_id`;

const userIdFrom = (req: Request, res: Response) => {
  const user=(req as UserRequest).user;
  if(!user?.id){res.status(401).json({code:"UNAUTHORIZED",message:"Unauthorized: Missing user ID"});return null;}
  if(user.role&&user.role!=="user"){res.status(403).json({code:"FORBIDDEN",message:"Forbidden: user role required"});return null;}
  return user.id;
};
const positiveInt=(value:unknown)=>{const n=Number(value);return Number.isInteger(n)&&n>0?n:null;};
const toNumber=(value:unknown)=>Number(value??0);
const methodById=(id:number)=>METHODS.find(method=>method.study_type_id===id);
const formatDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

const getCurrentTerm=async(userId:number,connection:PoolConnection|typeof db=db,lock=false)=>{
  const [rows]=await connection.query<TermRow[]>(`SELECT st.student_term_id AS term_id,at.semester_no AS term,
    CONCAT('Semester ',at.semester_no) AS semester,at.academic_year,st.created_at
    FROM student_terms st INNER JOIN academic_terms at ON at.academic_term_id=st.academic_term_id
    WHERE st.user_id=? AND st.status='active' ORDER BY st.student_term_id DESC LIMIT 1${lock?" FOR UPDATE":""}`,[userId]);
  return rows[0]??null;
};
const serialize=(row:SessionRow)=>({
  study_time_id:Number(row.study_time_id),schedule_time_id:Number(row.schedule_time_id),study_type_id:Number(row.study_type_id),study_type_name:row.study_type_name,
  subject_id:row.subject_id,subject_name:row.subject_name,start_time:row.start_time,end_time:row.end_time,
  time_spent:row.time_spent===null?null:Number(row.time_spent),session_status:row.session_status,running_since:row.running_since,
  accumulated_seconds:Number(row.accumulated_seconds),last_seen_at:row.last_seen_at,version:Number(row.version),updated_at:row.updated_at,
  elapsed_seconds:Math.min(HARD_LIMIT_SECONDS,Number(row.elapsed_seconds??row.accumulated_seconds)),is_stale:Boolean(row.is_stale),server_time:row.server_time,hard_limit_seconds:HARD_LIMIT_SECONDS,
});
const ownedSession=async(connection:PoolConnection,id:number,userId:number,lock=false)=>{
  const [rows]=await connection.query<SessionRow[]>(`${SESSION_SELECT} WHERE ss.study_session_id=? AND st.user_id=? AND st.status='active' LIMIT 1${lock?" FOR UPDATE":""}`,[id,userId]);return rows[0]??null;
};
const openSession=async(connection:PoolConnection,userId:number,lock=false)=>{
  const [rows]=await connection.query<SessionRow[]>(`${SESSION_SELECT} WHERE st.user_id=? AND st.status='active'
    AND (ss.status IN ('running','paused') OR ss.status='interrupted') ORDER BY ss.study_session_id DESC LIMIT 1${lock?" FOR UPDATE":""}`,[userId]);return rows[0]??null;
};
const reload=async(connection:PoolConnection,id:number,userId:number)=>{const row=await ownedSession(connection,id,userId);if(!row)throw new Error("Study session could not be reloaded");return row;};
const conflict=(res:Response,row:SessionRow)=>res.status(409).json({code:"SESSION_VERSION_CONFLICT",message:"Study session was updated from another device",data:serialize(row)});
const invalid=(res:Response,row:SessionRow,expected:string)=>res.status(409).json({code:"INVALID_SESSION_STATE",message:`Study session must be ${expected}`,data:serialize(row)});
const interruptExpired=async(connection:PoolConnection,userId:number,termId:number)=>{
  await connection.query(`UPDATE study_sessions ss INNER JOIN enrollments e ON e.enrollment_id=ss.enrollment_id
    INNER JOIN student_terms st ON st.student_term_id=e.student_term_id
    SET ss.ended_at=TIMESTAMPADD(SECOND,GREATEST(0,?-ss.accumulated_seconds),ss.running_since),ss.accumulated_seconds=?,
      ss.status='interrupted',ss.running_since=NULL,ss.last_seen_at=NOW(),ss.version=ss.version+1
    WHERE st.user_id=? AND st.student_term_id=? AND ss.status='running' AND ss.running_since IS NOT NULL
      AND ss.accumulated_seconds+GREATEST(0,TIMESTAMPDIFF(SECOND,ss.running_since,NOW()))>=?`,[HARD_LIMIT_SECONDS,HARD_LIMIT_SECONDS,userId,termId,HARD_LIMIT_SECONDS]);
};

export const getTimerSetup=async(req:Request,res:Response)=>{
  try{const userId=userIdFrom(req,res);if(!userId)return;const term=await getCurrentTerm(userId);if(!term)return res.status(404).json({code:"NO_CURRENT_TERM",message:"No current term found"});
    const [subjects]=await db.query<RowDataPacket[]>(`SELECT e.enrollment_id AS schedule_time_id,s.subject_id,s.subject_name,
      COALESCE(GROUP_CONCAT(DISTINCT CONCAT(i.first_name,' ',i.last_name) SEPARATOR ', '),'') AS teacher_name
      FROM enrollments e INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      LEFT JOIN section_instructors si ON si.section_id=cs.section_id LEFT JOIN admin i ON i.admin_id=si.instructor_id
      WHERE e.student_term_id=? AND e.status='enrolled' GROUP BY e.enrollment_id,s.subject_id,s.subject_name ORDER BY s.subject_name`,[term.term_id]);
    return res.json({message:"Timer setup retrieved successfully",current_term:term,subjects,study_types:METHODS,timer_policy:{hard_limit_seconds:HARD_LIMIT_SECONDS,stale_after_seconds:STALE_AFTER_MINUTES*60}});
  }catch(error){console.error("getTimerSetup error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}
};

export const getActiveStudySession=async(req:Request,res:Response)=>{
  const userId=userIdFrom(req,res);if(!userId)return;const connection=await db.getConnection();
  try{await connection.beginTransaction();const term=await getCurrentTerm(userId,connection,true);if(!term){await connection.rollback();return res.status(404).json({code:"NO_CURRENT_TERM",message:"No current term found"});}
    await interruptExpired(connection,userId,term.term_id);const row=await openSession(connection,userId,true);await connection.commit();
    return res.json({message:row?"Open study session retrieved successfully":"No open study session",data:row?serialize(row):null,requires_recovery:Boolean(row&&(row.session_status==='interrupted'||row.is_stale))});
  }catch(error){await connection.rollback();console.error("getActiveStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

export const startStudySession=async(req:Request,res:Response)=>{
  const userId=userIdFrom(req,res);if(!userId)return;const enrollmentId=positiveInt(req.body.schedule_time_id);const methodId=positiveInt(req.body.study_type_id);const method=methodId?methodById(methodId):undefined;
  if(!enrollmentId||!method)return res.status(400).json({code:"INVALID_TIMER_SELECTION",message:"schedule_time_id and study_type_id are invalid"});
  const connection=await db.getConnection();try{await connection.beginTransaction();const term=await getCurrentTerm(userId,connection,true);if(!term){await connection.rollback();return res.status(404).json({code:"NO_CURRENT_TERM",message:"No current term found"});}
    await interruptExpired(connection,userId,term.term_id);const open=await openSession(connection,userId,true);if(open){await connection.rollback();return res.status(409).json({code:"OPEN_SESSION_EXISTS",message:"An open study session already exists",data:serialize(open)});}
    const [enrollments]=await connection.query<RowDataPacket[]>(`SELECT enrollment_id FROM enrollments WHERE enrollment_id=? AND student_term_id=? AND status='enrolled' LIMIT 1`,[enrollmentId,term.term_id]);
    if(!enrollments[0]){await connection.rollback();return res.status(404).json({code:"SUBJECT_NOT_FOUND",message:"Subject for the current term was not found"});}
    const [result]=await connection.query<ResultSetHeader>(`INSERT INTO study_sessions(enrollment_id,study_method,started_at,status,running_since,accumulated_seconds,last_seen_at,version)
      VALUES(?,?,NOW(),'running',NOW(),0,NOW(),1)`,[enrollmentId,method.study_type_name]);const created=await reload(connection,result.insertId,userId);await connection.commit();
    return res.status(201).json({message:"Study session started successfully",data:serialize(created)});
  }catch(error){await connection.rollback();console.error("startStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

const requestSession=async(req:Request,res:Response)=>{
  const userId=userIdFrom(req,res);const id=positiveInt(req.params.study_time_id);const version=positiveInt(req.body.version);
  if(!userId)return null;if(!id||!version){res.status(400).json({code:"INVALID_SESSION_REQUEST",message:"A valid study_time_id and version are required"});return null;}
  return {userId,id,version};
};

export const pauseStudySession=async(req:Request,res:Response)=>{
  const input=await requestSession(req,res);if(!input)return;const connection=await db.getConnection();
  try{await connection.beginTransaction();const row=await ownedSession(connection,input.id,input.userId,true);if(!row){await connection.rollback();return res.status(404).json({code:"SESSION_NOT_FOUND",message:"Study session was not found"});}
    if(row.session_status==='paused'){await connection.commit();return res.json({message:"Study session is already paused",data:serialize(row)});}if(row.session_status!=='running'){await connection.rollback();return invalid(res,row,"running");}if(row.version!==input.version){await connection.rollback();return conflict(res,row);}
    const seconds=Number(row.elapsed_seconds);if(seconds>=HARD_LIMIT_SECONDS){await connection.query(`UPDATE study_sessions SET ended_at=NOW(),accumulated_seconds=?,status='interrupted',running_since=NULL,last_seen_at=NOW(),version=version+1 WHERE study_session_id=?`,[HARD_LIMIT_SECONDS,input.id]);const updated=await reload(connection,input.id,input.userId);await connection.commit();return res.status(409).json({code:"SESSION_HARD_LIMIT_REACHED",message:"Study session reached the four-hour limit",data:serialize(updated)});}
    await connection.query(`UPDATE study_sessions SET accumulated_seconds=?,status='paused',running_since=NULL,last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[seconds,input.id,input.version]);const updated=await reload(connection,input.id,input.userId);await connection.commit();return res.json({message:"Study session paused successfully",data:serialize(updated)});
  }catch(error){await connection.rollback();console.error("pauseStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

export const resumeStudySession=async(req:Request,res:Response)=>{
  const input=await requestSession(req,res);if(!input)return;const connection=await db.getConnection();
  try{await connection.beginTransaction();const row=await ownedSession(connection,input.id,input.userId,true);if(!row){await connection.rollback();return res.status(404).json({code:"SESSION_NOT_FOUND",message:"Study session was not found"});}
    if(row.session_status==='running'){await connection.commit();return res.json({message:"Study session is already running",data:serialize(row)});}if(row.session_status!=='paused'){await connection.rollback();return invalid(res,row,"paused");}if(row.version!==input.version){await connection.rollback();return conflict(res,row);}if(row.accumulated_seconds>=HARD_LIMIT_SECONDS){await connection.rollback();return res.status(409).json({code:"SESSION_HARD_LIMIT_REACHED",message:"Study session reached the four-hour limit",data:serialize(row)});}
    await connection.query(`UPDATE study_sessions SET status='running',running_since=NOW(),last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[input.id,input.version]);const updated=await reload(connection,input.id,input.userId);await connection.commit();return res.json({message:"Study session resumed successfully",data:serialize(updated)});
  }catch(error){await connection.rollback();console.error("resumeStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

export const heartbeatStudySession=async(req:Request,res:Response)=>{
  const input=await requestSession(req,res);if(!input)return;const connection=await db.getConnection();
  try{await connection.beginTransaction();const row=await ownedSession(connection,input.id,input.userId,true);if(!row){await connection.rollback();return res.status(404).json({code:"SESSION_NOT_FOUND",message:"Study session was not found"});}
    if(!['running','paused'].includes(row.session_status)){await connection.rollback();return invalid(res,row,"running or paused");}if(row.version!==input.version){await connection.rollback();return conflict(res,row);}if(Number(row.elapsed_seconds)>=HARD_LIMIT_SECONDS){await connection.query(`UPDATE study_sessions SET ended_at=NOW(),accumulated_seconds=?,status='interrupted',running_since=NULL,last_seen_at=NOW(),version=version+1 WHERE study_session_id=?`,[HARD_LIMIT_SECONDS,input.id]);const updated=await reload(connection,input.id,input.userId);await connection.commit();return res.status(409).json({code:"SESSION_HARD_LIMIT_REACHED",message:"Study session reached the four-hour limit",data:serialize(updated)});}
    await connection.query(`UPDATE study_sessions SET last_seen_at=NOW() WHERE study_session_id=?`,[input.id]);const updated=await reload(connection,input.id,input.userId);await connection.commit();return res.json({message:"Study session heartbeat recorded",data:serialize(updated)});
  }catch(error){await connection.rollback();console.error("heartbeatStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

export const finishStudySession=async(req:Request,res:Response)=>{
  const input=await requestSession(req,res);if(!input)return;const connection=await db.getConnection();
  try{await connection.beginTransaction();const row=await ownedSession(connection,input.id,input.userId,true);if(!row){await connection.rollback();return res.status(404).json({code:"SESSION_NOT_FOUND",message:"Study session was not found"});}
    if(row.session_status==='completed'){await connection.commit();return res.json({message:"Study session is already completed",data:serialize(row)});}if(!['running','paused'].includes(row.session_status)){await connection.rollback();return invalid(res,row,"running or paused");}if(row.version!==input.version){await connection.rollback();return conflict(res,row);}
    const seconds=Number(row.elapsed_seconds);const status=seconds>=HARD_LIMIT_SECONDS?'interrupted':'completed';await connection.query(`UPDATE study_sessions SET accumulated_seconds=?,ended_at=NOW(),status=?,running_since=NULL,last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[Math.min(seconds,HARD_LIMIT_SECONDS),status,input.id,input.version]);const updated=await reload(connection,input.id,input.userId);await connection.commit();
    if(status==='interrupted')return res.status(409).json({code:"SESSION_HARD_LIMIT_REACHED",message:"Study session reached the four-hour limit",data:serialize(updated)});return res.json({message:"Study session finished successfully",data:serialize(updated)});
  }catch(error){await connection.rollback();console.error("finishStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

export const recoverStudySession=async(req:Request,res:Response)=>{
  const input=await requestSession(req,res);if(!input)return;const action=req.body.action as RecoveryAction;const allowed:RecoveryAction[]=['continue','finish_last_seen','finish_now','save_interrupted','cancel'];if(!allowed.includes(action))return res.status(400).json({code:"INVALID_RECOVERY_REQUEST",message:"A valid recovery action is required"});
  const connection=await db.getConnection();try{await connection.beginTransaction();const row=await ownedSession(connection,input.id,input.userId,true);if(!row){await connection.rollback();return res.status(404).json({code:"SESSION_NOT_FOUND",message:"Study session was not found"});}if(row.version!==input.version){await connection.rollback();return conflict(res,row);}
    if(action==='cancel'){if(!['running','paused','interrupted'].includes(row.session_status)){await connection.rollback();return invalid(res,row,"open");}await connection.query(`UPDATE study_sessions SET ended_at=COALESCE(ended_at,NOW()),status='cancelled',running_since=NULL,last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[input.id,input.version]);}
    else if(action==='save_interrupted'){if(row.session_status!=='interrupted'){await connection.rollback();return invalid(res,row,"interrupted");}await connection.query(`UPDATE study_sessions SET ended_at=COALESCE(ended_at,last_seen_at,NOW()),status='completed',last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[input.id,input.version]);}
    else{if(row.session_status!=='running'){await connection.rollback();return invalid(res,row,"running");}if(!row.is_stale){await connection.rollback();return res.status(409).json({code:"SESSION_NOT_STALE",message:"Study session does not require recovery",data:serialize(row)});}if(action==='continue'){await connection.query(`UPDATE study_sessions SET last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[input.id,input.version]);}else{const end=action==='finish_last_seen'?(row.last_seen_at??row.start_time):new Date();const running=row.running_since??row.start_time;const extra=Math.max(0,Math.floor((end.getTime()-running.getTime())/1000));const seconds=Math.min(HARD_LIMIT_SECONDS,row.accumulated_seconds+extra);await connection.query(`UPDATE study_sessions SET accumulated_seconds=?,ended_at=?,status='completed',running_since=NULL,last_seen_at=NOW(),version=version+1 WHERE study_session_id=? AND version=?`,[seconds,end,input.id,input.version]);}}
    const updated=await reload(connection,input.id,input.userId);await connection.commit();return res.json({message:"Study session recovery completed successfully",data:serialize(updated)});
  }catch(error){await connection.rollback();console.error("recoverStudySession error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}finally{connection.release();}
};

export const getStudyDashboard=async(req:Request,res:Response)=>{
  try{const userId=userIdFrom(req,res);if(!userId)return;const term=await getCurrentTerm(userId);if(!term)return res.status(404).json({code:"NO_CURRENT_TERM",message:"No current term found"});
    const [weekly]=await db.query<WeeklyRow[]>(`SELECT FLOOR(DATEDIFF(DATE(ss.started_at),DATE(?))/7)+1 AS week_number,ROUND(SUM(ss.accumulated_seconds)/60,2) AS total_minutes
      FROM study_sessions ss INNER JOIN enrollments e ON e.enrollment_id=ss.enrollment_id WHERE e.student_term_id=? AND ss.status='completed' AND ss.started_at>=? GROUP BY week_number ORDER BY week_number`,[term.created_at,term.term_id,term.created_at]);
    const [historyRows]=await db.query<HistoryRow[]>(`SELECT DATE_FORMAT(ss.started_at,'%Y-%m') AS month_key,s.subject_id,s.subject_name,ss.study_method AS study_type_name,
      ROUND(SUM(ss.accumulated_seconds)/60,2) AS total_minutes,COUNT(*) AS session_count FROM study_sessions ss
      INNER JOIN enrollments e ON e.enrollment_id=ss.enrollment_id INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
      WHERE e.student_term_id=? AND ss.status='completed' GROUP BY month_key,s.subject_id,s.subject_name,ss.study_method ORDER BY month_key DESC,s.subject_name`,[term.term_id]);
    const start=new Date(term.created_at),now=new Date(),weeksCount=Math.max(1,Math.floor((now.getTime()-start.getTime())/(7*86400000))+1),monthsCount=Math.max(1,(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth()+1);
    const totals=new Map(weekly.map(r=>[Number(r.week_number),toNumber(r.total_minutes)]));const weeks=Array.from({length:weeksCount},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i*7);return{week_number:i+1,week_start:formatDate(d),total_minutes:totals.get(i+1)??0};});
    const months=new Map<string,any>();for(const row of historyRows){const month=months.get(row.month_key)??{month_key:row.month_key,total_minutes:0,session_count:0,subjects:new Map()};const subject=month.subjects.get(row.subject_id)??{subject_id:row.subject_id,subject_name:row.subject_name,total_minutes:0,session_count:0,methods:{}};const minutes=toNumber(row.total_minutes);subject.total_minutes+=minutes;subject.session_count+=Number(row.session_count);subject.methods[row.study_type_name]=minutes;month.total_minutes+=minutes;month.session_count+=Number(row.session_count);month.subjects.set(row.subject_id,subject);months.set(row.month_key,month);}
    const history=Array.from(months.values()).map((m:any)=>({...m,total_minutes:Number(m.total_minutes.toFixed(2)),subjects:Array.from(m.subjects.values()).map((s:any)=>({...s,total_minutes:Number(s.total_minutes.toFixed(2))})).sort((a:any,b:any)=>b.total_minutes-a.total_minutes)}));const total=weeks.reduce((sum,w)=>sum+w.total_minutes,0);
    return res.json({message:"Study dashboard retrieved successfully",current_term:term,summary:{current_week_minutes:weeks.at(-1)?.total_minutes??0,total_term_minutes:Number(total.toFixed(2)),average_weekly_minutes:Number((total/weeksCount).toFixed(2)),average_monthly_minutes:Number((total/monthsCount).toFixed(2))},weeks,history});
  }catch(error){console.error("getStudyDashboard error:",error);return res.status(500).json({code:"INTERNAL_SERVER_ERROR",message:"Internal server error"});}
};
