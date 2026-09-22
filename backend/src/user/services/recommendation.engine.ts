import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";
import { addDays, durationMinutes, isoDay, resolveTargetWeek } from "./recommendation.rules";
import { buildSchedulePlan } from "./recommendation.scheduler";
import type {
  BaseBlockRow, BusyRow, ClassBlockRow, ConstraintRow, GenerateRecommendationInput,
  RecommendationItemDraft, RecommendationTrigger,
} from "./recommendation.types";
import { HOMEWORK_SCHEDULE_TYPE_ID, REVIEW_SCHEDULE_TYPE_ID, RULE_VERSION } from "./recommendation.types";

interface TermRow extends RowDataPacket { term_id:number; user_id:number; }
interface EnrollmentRow extends RowDataPacket {
  enrollment_id:number; subject_id:string; subject_name:string; credits:number;
  weak_topic_count:number; workload_minutes:number; deadline_minutes:number;
}
interface HeaderRow extends RowDataPacket {
  recommendation_id:number; user_id:number; term_id:number; previous_recommendation_id:number|null;
  exam_score_history_id:number|null; workload_id:number|null; week_start:string; week_end:string;
  version:number; trigger_type:RecommendationTrigger; rule_version:string; status:string;
  generated_at:Date; accepted_at:Date|null; rejected_at:Date|null; superseded_at:Date|null; updated_at:Date;
}

export class RecommendationServiceError extends Error {
  constructor(public readonly statusCode:number,public readonly code:string,message:string,public readonly details?:unknown){super(message);}
}

const ensureTypes=(connection:PoolConnection)=>connection.query(`INSERT INTO schedule_types(schedule_type_id,type_code,type_name,is_active)
  VALUES(1,'class','Class',1),(2,'study','Study',1),(3,'homework','Homework',1)
  ON DUPLICATE KEY UPDATE type_code=VALUES(type_code),type_name=VALUES(type_name),is_active=1`);

const currentTerm=async(connection:PoolConnection,userId:number,lock=false)=>{
  const [rows]=await connection.query<TermRow[]>(`SELECT student_term_id AS term_id,user_id FROM student_terms
    WHERE user_id=? AND status='active' ORDER BY student_term_id DESC LIMIT 1${lock?" FOR UPDATE":""}`,[userId]);
  return rows[0]??null;
};

const ownedHeader=async(connection:PoolConnection,userId:number,recommendationId:number,lock=false)=>{
  const [rows]=await connection.query<HeaderRow[]>(`SELECT wr.recommendation_id,st.user_id,wr.student_term_id AS term_id,
    wr.previous_recommendation_id,wr.source_exam_attempt_id AS exam_score_history_id,wr.source_workload_id AS workload_id,
    DATE_FORMAT(wr.week_start_date,'%Y-%m-%d') AS week_start,DATE_FORMAT(wr.week_end_date,'%Y-%m-%d') AS week_end,
    wr.version,wr.trigger_type,wr.rule_version,wr.status,wr.generated_at,wr.accepted_at,wr.rejected_at,wr.superseded_at,wr.updated_at
    FROM weekly_recommendation wr INNER JOIN student_terms st ON st.student_term_id=wr.student_term_id
    WHERE wr.recommendation_id=? AND st.user_id=? LIMIT 1${lock?" FOR UPDATE":""}`,[recommendationId,userId]);
  if(!rows[0])throw new RecommendationServiceError(404,"RECOMMENDATION_NOT_FOUND","Recommendation was not found");
  return rows[0];
};

const loadEnrollments=async(connection:PoolConnection,termId:number)=>{
  const [rows]=await connection.query<EnrollmentRow[]>(`SELECT e.enrollment_id,s.subject_id,s.subject_name,CAST(s.credits AS UNSIGNED) AS credits,
    COALESCE((SELECT MAX(ec.weak_topic_count) FROM exam_checkpoints ec WHERE ec.enrollment_id=e.enrollment_id AND ec.status='pending'),0) AS weak_topic_count,
    COALESCE((SELECT SUM(CASE LOWER(wt.type_code) WHEN 'project' THEN 120 ELSE 60 END) FROM workloads w INNER JOIN workload_types wt ON wt.workload_type_id=w.workload_type_id WHERE w.enrollment_id=e.enrollment_id AND w.status='pending'),0) AS workload_minutes,
    COALESCE((SELECT SUM(CASE WHEN w.deadline_date<=DATE_ADD(CURDATE(),INTERVAL 2 DAY) THEN 60 WHEN w.deadline_date<=DATE_ADD(CURDATE(),INTERVAL 7 DAY) THEN 30 ELSE 0 END) FROM workloads w WHERE w.enrollment_id=e.enrollment_id AND w.status='pending'),0) AS deadline_minutes
    FROM enrollments e INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id
    WHERE e.student_term_id=? AND e.status='enrolled' ORDER BY s.subject_id`,[termId]);return rows;
};

const loadConstraints=async(connection:PoolConnection,userId:number)=>{
  const [rows]=await connection.query<ConstraintRow[]>(`SELECT constraint_id,
    FIELD(day_off,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS day_off,
    continuous_working_minutes AS continuous_working_duration,break_minutes,
    TIME_FORMAT(available_start_time,'%H:%i:%s') AS start_time,TIME_FORMAT(available_end_time,'%H:%i:%s') AS end_time
    FROM user_constraints WHERE user_id=? ORDER BY constraint_id DESC LIMIT 1`,[userId]);
  const constraint=rows[0]??null;if(!constraint)return{constraint,busy:[] as BusyRow[]};
  const [busy]=await connection.query<BusyRow[]>(`SELECT FIELD(day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS recurring_busy_day,
    TIME_FORMAT(start_time,'%H:%i:%s') AS start_time,TIME_FORMAT(end_time,'%H:%i:%s') AS end_time FROM recurring_busy WHERE constraint_id=?`,[constraint.constraint_id]);
  return{constraint,busy};
};

const loadClasses=async(connection:PoolConnection,termId:number)=>{
  const [rows]=await connection.query<ClassBlockRow[]>(`SELECT FIELD(cm.day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS schedule_day,
    TIME_FORMAT(cm.start_time,'%H:%i:%s') AS start_time,TIME_FORMAT(cm.end_time,'%H:%i:%s') AS end_time
    FROM class_meetings cm INNER JOIN course_sections cs ON cs.section_id=cm.section_id INNER JOIN enrollments e ON e.section_id=cs.section_id
    WHERE e.student_term_id=? AND e.status='enrolled'`,[termId]);return rows;
};

const acceptedForWeek=async(connection:PoolConnection,termId:number,weekStart:string)=>{
  const [rows]=await connection.query<RowDataPacket[]>(`SELECT recommendation_id FROM weekly_recommendation
    WHERE student_term_id=? AND week_start_date=? AND status='accepted' ORDER BY version DESC LIMIT 1`,[termId,weekStart]);return rows[0]?Number(rows[0].recommendation_id):null;
};

const baseBlocks=async(connection:PoolConnection,recommendationId:number|null)=>{
  if(!recommendationId)return[] as BaseBlockRow[];
  const [rows]=await connection.query<RowDataPacket[]>(`SELECT wb.weekly_block_id,wb.enrollment_id AS schedule_time_id,cs.subject_id,wb.schedule_type_id,
    DATE_FORMAT(wb.scheduled_date,'%Y-%m-%d') AS scheduled_date,TIME_FORMAT(wb.start_time,'%H:%i:%s') AS start_time,TIME_FORMAT(wb.end_time,'%H:%i:%s') AS end_time,
    wb.source,wb.is_user_modified FROM weekly_schedule_block wb INNER JOIN enrollments e ON e.enrollment_id=wb.enrollment_id INNER JOIN course_sections cs ON cs.section_id=e.section_id
    WHERE wb.recommendation_id=? ORDER BY wb.scheduled_date,wb.start_time`,[recommendationId]);
  return rows.map(row=>({...row,weekly_block_id:Number(row.weekly_block_id),schedule_time_id:Number(row.schedule_time_id),subject_id:String(row.subject_id),schedule_type_id:Number(row.schedule_type_id),source:"copied_previous"})) as BaseBlockRow[];
};

const makeItems=(enrollments:EnrollmentRow[],base:BaseBlockRow[])=>{
  const items:RecommendationItemDraft[]=[];
  for(const row of enrollments){
    const currentStudy=base.filter(b=>b.subject_id===row.subject_id&&Number(b.schedule_type_id)===2).reduce((n,b)=>n+durationMinutes(b.start_time,b.end_time),0);
    const studyBase=Math.min(360,Math.max(60,Number(row.credits)*60));const weak=Number(row.weak_topic_count)*30;const studyTarget=Math.min(360,studyBase+weak);
    items.push({key:`${row.subject_id}:2`,subjectId:row.subject_id,subjectName:row.subject_name,scheduleTypeId:2,currentMinutes:currentStudy,baseMinutes:studyBase,scoreGapMinutes:0,weakTopicMinutes:weak,examProximityMinutes:0,quizFloorMinutes:0,workloadMinutes:0,deadlineMinutes:0,rawTargetMinutes:studyBase+weak,maxTargetMinutes:360,targetMinutes:studyTarget,allocatedMinutes:0,unallocatedMinutes:studyTarget,differenceMinutes:-currentStudy,capApplied:studyBase+weak>360,capacityLimited:false,primaryAction:"create",reasons:[{code:"credit_base",minutes:studyBase,message:"Base review time from course credits"},...(weak?[{code:"weak_topics",minutes:weak,message:"Extra review for weak topics"}]:[])],workloadDemands:[],placementDeadline:null,placementPriority:3});
    const workload=Number(row.workload_minutes),deadline=Number(row.deadline_minutes),homeworkTarget=Math.min(480,workload+deadline);
    if(homeworkTarget>0){const current=base.filter(b=>b.subject_id===row.subject_id&&Number(b.schedule_type_id)===3).reduce((n,b)=>n+durationMinutes(b.start_time,b.end_time),0);items.push({key:`${row.subject_id}:3`,subjectId:row.subject_id,subjectName:row.subject_name,scheduleTypeId:3,currentMinutes:current,baseMinutes:0,scoreGapMinutes:0,weakTopicMinutes:0,examProximityMinutes:0,quizFloorMinutes:0,workloadMinutes:workload,deadlineMinutes:deadline,rawTargetMinutes:workload+deadline,maxTargetMinutes:480,targetMinutes:homeworkTarget,allocatedMinutes:0,unallocatedMinutes:homeworkTarget,differenceMinutes:-current,capApplied:workload+deadline>480,capacityLimited:false,primaryAction:"create",reasons:[{code:"pending_workload",minutes:workload,message:"Time for pending assignments"},...(deadline?[{code:"deadline",minutes:deadline,message:"Extra time for approaching deadlines"}]:[])],workloadDemands:[],placementDeadline:null,placementPriority:2});}
  }
  return items;
};

const insertPlan=async(connection:PoolConnection,headerId:number,termId:number,enrollments:EnrollmentRow[],items:RecommendationItemDraft[],blocks:ReturnType<typeof buildSchedulePlan>["blocks"])=>{
  const enrollmentBySubject=new Map(enrollments.map(row=>[row.subject_id,Number(row.enrollment_id)]));
  for(const item of items){const enrollmentId=enrollmentBySubject.get(item.subjectId)!;const changes=(item as RecommendationItemDraft&{changes?:unknown[]}).changes??[];
    const [result]=await connection.query<ResultSetHeader>(`INSERT INTO weekly_recommendation_item(recommendation_id,enrollment_id,schedule_type_id,current_minutes,base_minutes,score_gap_minutes,weak_topic_minutes,exam_proximity_minutes,quiz_floor_minutes,workload_minutes,deadline_minutes,raw_minutes,max_minutes,target_minutes,allocated_minutes,unallocated_minutes,difference_minutes,primary_action,cap_applied,capacity_limited,reasons_json,changes_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[headerId,enrollmentId,item.scheduleTypeId,item.currentMinutes,item.baseMinutes,item.scoreGapMinutes,item.weakTopicMinutes,item.examProximityMinutes,item.quizFloorMinutes,item.workloadMinutes,item.deadlineMinutes,item.rawTargetMinutes,item.maxTargetMinutes,item.targetMinutes,item.allocatedMinutes,item.unallocatedMinutes,item.differenceMinutes,item.primaryAction,item.capApplied?1:0,item.capacityLimited?1:0,JSON.stringify(item.reasons),JSON.stringify(changes)]);item.recommendationItemId=result.insertId;}
  for(const block of blocks){const item=items.find(i=>i.subjectId===block.subjectId&&i.scheduleTypeId===block.scheduleTypeId);await connection.query(`INSERT INTO weekly_schedule_block(recommendation_id,recommendation_item_id,enrollment_id,schedule_type_id,source_weekly_block_id,scheduled_date,start_time,end_time,source,is_user_modified)
      VALUES(?,?,?,?,?,?,?,?,?,?)`,[headerId,item?.recommendationItemId??null,enrollmentBySubject.get(block.subjectId),block.scheduleTypeId,block.sourceWeeklyBlockId,block.scheduledDate,block.startTime,block.endTime,block.source==='copied_base'?'generated':block.source,block.isUserModified?1:0]);}
};

export const generateRecommendation=async(input:GenerateRecommendationInput)=>{
  const connection=await db.getConnection();try{await connection.beginTransaction();const term=await currentTerm(connection,input.userId,true);if(!term)throw new RecommendationServiceError(404,"NO_CURRENT_TERM","No current term found");
    await ensureTypes(connection);const target=resolveTargetWeek(input.triggerType,input.now??new Date(),input.targetWeekStart);const enrollments=await loadEnrollments(connection,term.term_id);if(!enrollments.length)throw new RecommendationServiceError(409,"NO_ENROLLED_SUBJECTS","No enrolled subjects were found for the current term");
    const previous=await acceptedForWeek(connection,term.term_id,target.weekStart);const base=await baseBlocks(connection,previous);const items=makeItems(enrollments,base);const classes=await loadClasses(connection,term.term_id);const constraints=await loadConstraints(connection,input.userId);
    const plan=buildSchedulePlan({items,baseBlocks:base,classBlocks:classes,busyBlocks:constraints.busy,constraint:constraints.constraint,weekStart:target.weekStart,weekEnd:target.weekEnd,userId:input.userId,termId:term.term_id,now:input.now??new Date(),previousAcceptedRecommendationId:previous});
    const [versions]=await connection.query<RowDataPacket[]>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM weekly_recommendation WHERE student_term_id=? AND week_start_date=?`,[term.term_id,target.weekStart]);
    await connection.query(`UPDATE weekly_recommendation SET status='superseded',superseded_at=NOW() WHERE student_term_id=? AND week_start_date=? AND status='pending'`,[term.term_id,target.weekStart]);
    const [header]=await connection.query<ResultSetHeader>(`INSERT INTO weekly_recommendation(student_term_id,previous_recommendation_id,source_exam_attempt_id,source_workload_id,week_start_date,week_end_date,version,trigger_type,rule_version,status)
      VALUES(?,?,?,?,?,?,?,?,?,'pending')`,[term.term_id,previous,input.examScoreHistoryId??null,input.workloadId??null,target.weekStart,target.weekEnd,Number(versions[0].version),input.triggerType,RULE_VERSION]);
    await insertPlan(connection,header.insertId,term.term_id,enrollments,plan.items,plan.blocks);await connection.commit();return getRecommendationById(input.userId,header.insertId);
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
};

export const getRecommendationById=async(userId:number,recommendationId:number)=>{
  const connection=await db.getConnection();try{const header=await ownedHeader(connection,userId,recommendationId);
    const [items]=await connection.query<RowDataPacket[]>(`SELECT i.recommendation_item_id,i.recommendation_id,s.subject_id,s.subject_name,i.schedule_type_id,t.type_name AS schedule_type_name,
      i.current_minutes,i.base_minutes,i.score_gap_minutes,i.weak_topic_minutes,i.exam_proximity_minutes,i.quiz_floor_minutes,i.workload_minutes,i.deadline_minutes,i.raw_minutes AS raw_target_minutes,i.max_minutes AS max_target_minutes,
      i.target_minutes,i.allocated_minutes,i.unallocated_minutes,i.difference_minutes,i.primary_action,i.cap_applied,i.capacity_limited,i.reasons_json,i.changes_json
      FROM weekly_recommendation_item i INNER JOIN enrollments e ON e.enrollment_id=i.enrollment_id INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id INNER JOIN schedule_types t ON t.schedule_type_id=i.schedule_type_id WHERE i.recommendation_id=? ORDER BY s.subject_name,i.schedule_type_id`,[recommendationId]);
    const [blocks]=await connection.query<RowDataPacket[]>(`SELECT b.weekly_block_id,b.recommendation_id,b.recommendation_item_id,b.enrollment_id AS schedule_time_id,b.source_weekly_block_id,
      st.user_id,b.recommendation_id AS term_id,s.subject_id,s.subject_name,b.schedule_type_id,t.type_name AS schedule_type_name,DATE_FORMAT(b.scheduled_date,'%Y-%m-%d') AS scheduled_date,TIME_FORMAT(b.start_time,'%H:%i:%s') AS start_time,TIME_FORMAT(b.end_time,'%H:%i:%s') AS end_time,b.source,b.is_user_modified
      FROM weekly_schedule_block b INNER JOIN enrollments e ON e.enrollment_id=b.enrollment_id INNER JOIN student_terms st ON st.student_term_id=e.student_term_id INNER JOIN course_sections cs ON cs.section_id=e.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id INNER JOIN schedule_types t ON t.schedule_type_id=b.schedule_type_id WHERE b.recommendation_id=? ORDER BY b.scheduled_date,b.start_time`,[recommendationId]);
    const normalizedBlocks:Array<Record<string,any>>=blocks.map(block=>({...block,is_user_modified:Boolean(block.is_user_modified),term_id:header.term_id}));return{...header,items:items.map(item=>({...item,cap_applied:Boolean(item.cap_applied),capacity_limited:Boolean(item.capacity_limited),reasons_json:typeof item.reasons_json==='string'?JSON.parse(item.reasons_json):item.reasons_json,changes_json:typeof item.changes_json==='string'?JSON.parse(item.changes_json):item.changes_json,blocks:normalizedBlocks.filter(block=>Number(block.recommendation_item_id)===Number(item.recommendation_item_id))})),blocks:normalizedBlocks};
  }finally{connection.release();}
};

export const getLatestRecommendation=async(userId:number,weekStart?:string)=>{
  const [rows]=await db.query<RowDataPacket[]>(`SELECT wr.recommendation_id FROM weekly_recommendation wr INNER JOIN student_terms st ON st.student_term_id=wr.student_term_id
    WHERE st.user_id=? AND st.status='active' AND wr.status<>'superseded'${weekStart?" AND wr.week_start_date=?":""} ORDER BY wr.week_start_date DESC,wr.version DESC LIMIT 1`,weekStart?[userId,weekStart]:[userId]);
  return rows[0]?getRecommendationById(userId,Number(rows[0].recommendation_id)):null;
};

export const acceptRecommendation=async(userId:number,recommendationId:number)=>{
  const connection=await db.getConnection();try{await connection.beginTransaction();const header=await ownedHeader(connection,userId,recommendationId,true);if(header.status!=="pending")throw new RecommendationServiceError(409,"RECOMMENDATION_NOT_PENDING","Only a pending recommendation can be accepted");
    await connection.query(`UPDATE weekly_recommendation SET status='superseded',superseded_at=NOW() WHERE student_term_id=? AND week_start_date=? AND status='accepted' AND recommendation_id<>?`,[header.term_id,header.week_start,recommendationId]);await connection.query(`UPDATE weekly_recommendation SET status='accepted',accepted_at=NOW() WHERE recommendation_id=?`,[recommendationId]);await connection.commit();return getRecommendationById(userId,recommendationId);
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
};
export const rejectRecommendation=async(userId:number,recommendationId:number)=>{const connection=await db.getConnection();try{await connection.beginTransaction();const header=await ownedHeader(connection,userId,recommendationId,true);if(header.status!=="pending")throw new RecommendationServiceError(409,"RECOMMENDATION_NOT_PENDING","Only a pending recommendation can be rejected");await connection.query(`UPDATE weekly_recommendation SET status='rejected',rejected_at=NOW() WHERE recommendation_id=?`,[recommendationId]);await connection.commit();return getRecommendationById(userId,recommendationId);}catch(error){await connection.rollback();throw error;}finally{connection.release();}};

const validateBlock=(input:any,header:HeaderRow)=>{const date=String(input.scheduled_date??"");const start=String(input.start_time??"");const end=String(input.end_time??"");if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}(:\d{2})?$/.test(start)||!/^\d{2}:\d{2}(:\d{2})?$/.test(end)||start>=end)throw new RecommendationServiceError(400,"INVALID_BLOCK","A valid date, start_time, and end_time are required");if(date<header.week_start||date>header.week_end)throw new RecommendationServiceError(400,"BLOCK_OUTSIDE_WEEK","Block must be inside the recommendation week");return{date,start,end};};
const editableHeader=async(connection:PoolConnection,userId:number,id:number)=>{const h=await ownedHeader(connection,userId,id,true);if(!["pending","accepted"].includes(h.status))throw new RecommendationServiceError(409,"RECOMMENDATION_NOT_EDITABLE","Only pending or accepted plans can be edited");return h;};

export const addPreviewBlock=async(userId:number,recommendationId:number,input:any)=>{const connection=await db.getConnection();try{await connection.beginTransaction();const header=await editableHeader(connection,userId,recommendationId);const block=validateBlock(input,header);const type=Number(input.schedule_type_id);if(![2,3].includes(type))throw new RecommendationServiceError(400,"INVALID_SCHEDULE_TYPE","schedule_type_id must be 2 or 3");const [enrollments]=await connection.query<RowDataPacket[]>(`SELECT e.enrollment_id FROM enrollments e INNER JOIN course_sections cs ON cs.section_id=e.section_id WHERE e.student_term_id=? AND e.status='enrolled' AND cs.subject_id=? LIMIT 1`,[header.term_id,String(input.subject_id)]);if(!enrollments[0])throw new RecommendationServiceError(404,"SUBJECT_NOT_FOUND","Subject is not enrolled in the current term");await ensureTypes(connection);await connection.query(`INSERT INTO weekly_schedule_block(recommendation_id,enrollment_id,schedule_type_id,scheduled_date,start_time,end_time,source,is_user_modified) VALUES(?,?,?,?,?,?,'user_added',1)`,[recommendationId,enrollments[0].enrollment_id,type,block.date,block.start,block.end]);await connection.commit();return getRecommendationById(userId,recommendationId);}catch(error){await connection.rollback();throw error;}finally{connection.release();}};
export const updatePreviewBlock=async(userId:number,recommendationId:number,weeklyBlockId:number,input:any)=>{const connection=await db.getConnection();try{await connection.beginTransaction();const header=await editableHeader(connection,userId,recommendationId);const block=validateBlock(input,header);const [owned]=await connection.query<RowDataPacket[]>(`SELECT weekly_block_id FROM weekly_schedule_block WHERE weekly_block_id=? AND recommendation_id=? LIMIT 1`,[weeklyBlockId,recommendationId]);if(!owned[0])throw new RecommendationServiceError(404,"BLOCK_NOT_FOUND","Schedule block was not found");await connection.query(`UPDATE weekly_schedule_block SET scheduled_date=?,start_time=?,end_time=?,source='user_adjusted',is_user_modified=1 WHERE weekly_block_id=?`,[block.date,block.start,block.end,weeklyBlockId]);await connection.commit();return getRecommendationById(userId,recommendationId);}catch(error){await connection.rollback();throw error;}finally{connection.release();}};
export const deletePreviewBlock=async(userId:number,recommendationId:number,weeklyBlockId:number)=>{const connection=await db.getConnection();try{await connection.beginTransaction();await editableHeader(connection,userId,recommendationId);const [result]=await connection.query<ResultSetHeader>(`DELETE FROM weekly_schedule_block WHERE weekly_block_id=? AND recommendation_id=?`,[weeklyBlockId,recommendationId]);if(!result.affectedRows)throw new RecommendationServiceError(404,"BLOCK_NOT_FOUND","Schedule block was not found");await connection.commit();return getRecommendationById(userId,recommendationId);}catch(error){await connection.rollback();throw error;}finally{connection.release();}};

export const getAcceptedWeeklySchedule=async(userId:number,weekStart?:string)=>{const target=weekStart??resolveTargetWeek("manual",new Date()).weekStart;const connection=await db.getConnection();try{const term=await currentTerm(connection,userId);if(!term)throw new RecommendationServiceError(404,"NO_CURRENT_TERM","No current term found");const accepted=await acceptedForWeek(connection,term.term_id,target);const [classes]=await connection.query<RowDataPacket[]>(`SELECT cm.class_meeting_id AS schedule_time_id,s.subject_id,s.subject_name,1 AS schedule_type_id,'Class' AS schedule_type_name,
    FIELD(cm.day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS schedule_day,TIME_FORMAT(cm.start_time,'%H:%i:%s') AS start_time,TIME_FORMAT(cm.end_time,'%H:%i:%s') AS end_time,cm.classroom,NULL AS note
    FROM class_meetings cm INNER JOIN course_sections cs ON cs.section_id=cm.section_id INNER JOIN subjects s ON s.subject_id=cs.subject_id INNER JOIN enrollments e ON e.section_id=cs.section_id WHERE e.student_term_id=? AND e.status='enrolled' ORDER BY schedule_day,cm.start_time`,[term.term_id]);const recommendation=accepted?await getRecommendationById(userId,accepted):null;return{week_start:target,week_end:addDays(target,6),recurring_classes:classes,accepted_recommendation:recommendation,weekly_blocks:recommendation?.blocks??[]};}finally{connection.release();}};

export const safelyGenerateRecommendation=async(input:GenerateRecommendationInput)=>{try{return{recommendation:await generateRecommendation(input),warning:null};}catch(error){console.error("generateRecommendation trigger error:",error);return{recommendation:null,warning:error instanceof Error?error.message:"Recommendation could not be generated"};}};
export const generateWeekendRecommendations=async(now=new Date())=>{const {weekStart}=resolveTargetWeek("weekend",now);if(isoDay(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(now))!==7)return[];const [users]=await db.query<RowDataPacket[]>(`SELECT DISTINCT user_id FROM student_terms WHERE status='active'`);const results=[];for(const row of users){const existing=await getLatestRecommendation(Number(row.user_id),weekStart);if(existing)continue;results.push(await safelyGenerateRecommendation({userId:Number(row.user_id),triggerType:"weekend",now,targetWeekStart:weekStart}));}return results;};
