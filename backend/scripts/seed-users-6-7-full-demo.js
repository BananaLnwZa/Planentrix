// Preview first. --apply seeds ONLY users 6 and 7; academic dates/catalog stay intact.
// A complete scoped snapshot is saved before changes. Re-running refuses duplicates.
require('ts-node/register');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db').default;
const { selectAutomaticBalancedExamQuestions } = require('../src/services/exam-selection');
const { addDays, mondayOfWeek, minutesToTime } = require('../src/user/services/recommendation.rules');
const { checkpointWeeksFor } = require('../src/user/services/exam-attempt.rules');

const TAG = 'demo67-v1';
const USERS = [6, 7];
const apply = process.argv.includes('--apply');
const directory = path.resolve(__dirname, '../../artifacts/demo-users-6-7');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const inserted = {};
async function insert(c, table, row) {
  const columns = Object.keys(row);
  const [result] = await c.query(
    `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
    columns.map(key => row[key]),
  );
  (inserted[table] ??= []).push(result.insertId);
  return result.insertId;
}
async function rows(c, sql, parameters = []) {
  const [result] = await c.query(sql, parameters);
  return result;
}
async function snapshot(c) {
  const scopes = {
    student_terms: 'user_id IN (6,7)',
    enrollments: 'student_term_id IN (SELECT student_term_id FROM student_terms WHERE user_id IN (6,7))',
    user_constraints: 'user_id IN (6,7)',
  };
  const enrollmentScope = 'enrollment_id IN (SELECT e.enrollment_id FROM enrollments e JOIN student_terms st ON st.student_term_id=e.student_term_id WHERE st.user_id IN (6,7))';
  for (const table of ['workloads', 'study_sessions', 'exam_attempts', 'exam_checkpoints', 'student_class_meeting_overrides']) scopes[table] = enrollmentScope;
  scopes.score = 'workload_id IN (SELECT workload_id FROM workloads WHERE ' + enrollmentScope + ')';
  for (const table of ['exam_attempt_questions', 'exam_attempt_bank_results']) scopes[table] = 'exam_attempt_id IN (SELECT exam_attempt_id FROM exam_attempts WHERE ' + enrollmentScope + ')';
  scopes.weekly_recommendation = scopes.enrollments;
  for (const table of ['weekly_recommendation_item', 'weekly_schedule_block']) scopes[table] = 'recommendation_id IN (SELECT recommendation_id FROM weekly_recommendation WHERE ' + scopes.enrollments + ')';
  const data = {};
  for (const [table, where] of Object.entries(scopes)) {
    const [result] = await c.query({
      sql: `SELECT * FROM ${table} WHERE ${where}`,
      typeCast(field, next) {
        return ['DATE', 'DATETIME', 'TIMESTAMP'].includes(field.type) ? field.string() : next();
      },
    });
    data[table] = result;
  }
  return data;
}

async function seedAttempt(c, enrollmentId, bankRows, seed, date, ratios, checkpointId = null) {
  const banks = bankRows.map(bank => bank.question_bank_id);
  const questions = await rows(c, 'SELECT question_id,question_bank_id,question_text,question_image_path,question_score FROM question WHERE question_bank_id IN (?) AND is_active=1 ORDER BY question_id', [banks]);
  const selection = selectAutomaticBalancedExamQuestions(questions, seed, banks);
  assert(selection, 'The existing banks cannot generate a valid combined demo exam');
  const choices = await rows(c, 'SELECT * FROM choice WHERE question_id IN (?) ORDER BY question_id,choice_order', [selection.questions.map(q => q.question_id)]);
  const perBank = new Map();
  for (const q of selection.questions) {
    const group = perBank.get(q.question_bank_id) ?? [];
    group.push(q);
    perBank.set(q.question_bank_id, group);
  }
  const correctQuestions = new Set();
  banks.forEach((bankId, index) => {
    const group = perBank.get(bankId) ?? [];
    group.slice(0, Math.floor(group.length * ratios[index % ratios.length])).forEach(q => correctQuestions.add(q.question_id));
  });
  const scores = new Map(banks.map(id => [id, { actual: 0, maximum: 0 }]));
  for (const q of selection.questions) {
    const score = scores.get(q.question_bank_id);
    score.maximum += Number(q.question_score);
    if (correctQuestions.has(q.question_id)) score.actual += Number(q.question_score);
  }
  const actual = [...scores.values()].reduce((sum, s) => sum + s.actual, 0);
  const maximum = [...scores.values()].reduce((sum, s) => sum + s.maximum, 0);
  const weak = [...scores.values()].filter(s => s.actual / s.maximum < 0.5).length;
  const started = `${date} 09:00:00`;
  const submitted = `${date} 09:30:00`;
  const id = await insert(c, 'exam_attempts', {
    enrollment_id: enrollmentId, source_checkpoint_id: checkpointId,
    exam_period: 'midterm', workflow_phase: 'checkpoint', random_seed: seed,
    started_at: started, submitted_at: submitted, actual_score: actual,
    max_score: maximum, weak_topic_count: weak, status: 'submitted',
    created_at: started, updated_at: submitted,
  });
  for (const [index, q] of selection.questions.entries()) {
    const options = choices.filter(choice => choice.question_id === q.question_id);
    assert(options.length >= 2 && options.filter(o => o.is_correct).length === 1, 'Invalid bank choices');
    const correct = correctQuestions.has(q.question_id);
    const answer = options.find(o => Boolean(o.is_correct) === correct);
    await insert(c, 'exam_attempt_questions', {
      exam_attempt_id: id, source_question_id: q.question_id,
      source_bank_id: q.question_bank_id, display_order: index + 1,
      question_text_snapshot: q.question_text, image_path_snapshot: q.question_image_path,
      question_score_snapshot: Number(q.question_score),
      choices_snapshot: JSON.stringify(options.map(o => ({ choice_id: o.choice_id, choice_order: o.choice_order, choice_text: o.choice_text, choice_image_path: o.choice_image_path, is_correct: Boolean(o.is_correct) }))),
      selected_choice_order: answer.choice_order, is_correct: correct ? 1 : 0,
      awarded_score: correct ? Number(q.question_score) : 0,
      answered_at: submitted, created_at: started,
    });
  }
  for (const bank of bankRows) {
    const score = scores.get(bank.question_bank_id);
    await insert(c, 'exam_attempt_bank_results', {
      exam_attempt_id: id, question_bank_id: bank.question_bank_id,
      bank_name_snapshot: bank.bank_name, actual_score: score.actual,
      max_score: score.maximum, percentage: Number((score.actual / score.maximum * 100).toFixed(2)),
      is_weak_topic: score.actual / score.maximum < 0.5 ? 1 : 0, created_at: submitted,
    });
  }
  return { id, actual, maximum, weak, date };
}

async function checkpoint(c, enrollmentId, attempt, status, completedAt = null) {
  const weeks = checkpointWeeksFor(attempt.actual / attempt.maximum * 100);
  return insert(c, 'exam_checkpoints', {
    enrollment_id: enrollmentId, source_exam_attempt_id: attempt.id,
    exam_period: 'midterm', weak_topic_count: attempt.weak, interval_weeks: weeks,
    next_checkpoint_at: `${addDays(attempt.date, 7 * weeks)} 08:00:00`, status,
    completed_at: completedAt, created_at: `${attempt.date} 09:30:00`, updated_at: completedAt ?? `${attempt.date} 09:30:00`,
  });
}

async function workload(c, enrollment, types, type, name, date, score, note, completed = Boolean(score)) {
  const deadline = date;
  const created = `${addDays(date, -7)} 09:00:00`;
  const finished = completed ? `${date} 17:00:00` : null;
  const id = await insert(c, 'workloads', {
    enrollment_id: enrollment.enrollment_id, workload_type_id: types.get(type),
    workload_name: `[MOCK] ${name}`, deadline_date: deadline, deadline_time: '23:00:00',
    note: `[${TAG}] ${note}`, status: completed ? 'completed' : 'pending',
    created_at: created, finished_at: finished, updated_at: finished ?? created,
  });
  if (score) await insert(c, 'score', { workload_id: id, actual_score: score[0], max_score: score[1], recorded_at: `${date} 18:00:00`, updated_at: `${date} 18:00:00` });
}

async function session(c, enrollmentId, blockId, date, startMinute, minutes) {
  assert(minutes > 0 && minutes <= 180);
  const started = `${date} ${minutesToTime(startMinute)}`;
  const ended = `${date} ${minutesToTime(startMinute + minutes)}`;
  return insert(c, 'study_sessions', {
    enrollment_id: enrollmentId, weekly_block_id: blockId,
    started_at: started, ended_at: ended, status: 'completed', running_since: null,
    accumulated_seconds: minutes * 60, last_seen_at: ended,
    version: 2, created_at: started, updated_at: ended,
  });
}

async function seedPlan(c, userId, termId, enrollments, types, week, index) {
  const pending = index === 4;
  const generated = `${addDays(week, -1)} 18:00:00`;
  const recId = await insert(c, 'weekly_recommendation', {
    student_term_id: termId, week_start_date: week, week_end_date: addDays(week, 6),
    version: 1, trigger_type: 'manual', rule_version: TAG,
    status: pending ? 'pending' : 'accepted', generated_at: generated,
    accepted_at: pending ? null : `${addDays(week, -1)} 18:05:00`,
    created_at: generated, updated_at: generated,
  });
  const slots = [
    { e: 0, type: 'review', day: 1, start: 13 * 60, minutes: pending ? 150 : 120 },
    { e: 1, type: 'review', day: 2, start: 13 * 60, minutes: 90 },
    { e: 0, type: 'homework', day: 4, start: 13 * 60, minutes: 120 },
    { e: 1, type: 'homework', day: 4, start: 16 * 60, minutes: 120 },
  ];
  for (const slot of slots) {
    const previousMinutes = slot.type === 'review' && slot.e === 0 ? 120 : slot.minutes;
    const adherence = userId === 6 ? (slot.e === 0 ? 100 : 50) : 0;
    const actual = slot.e === 0 ? previousMinutes : previousMinutes / 2;
    const itemId = await insert(c, 'weekly_recommendation_item', {
      recommendation_id: recId, enrollment_id: enrollments[slot.e].enrollment_id,
      schedule_type_id: types.get(slot.type), current_minutes: previousMinutes,
      base_minutes: previousMinutes, raw_minutes: slot.minutes, max_minutes: slot.type === 'review' ? 300 : 360,
      target_minutes: slot.minutes, allocated_minutes: slot.minutes,
      difference_minutes: slot.minutes - previousMinutes,
      primary_action: pending && slot.minutes !== previousMinutes ? 'increase' : 'keep',
      previous_actual_minutes: index > 0 && slot.type === 'review' ? actual : 0,
      previous_adherent_minutes: index > 0 && slot.type === 'review' && userId === 6 ? actual : 0,
      previous_adherence_rate: index > 0 && slot.type === 'review' ? adherence : null,
      reasons_json: JSON.stringify([{ code: 'MOCK_BASELINE', minutes: slot.minutes, message: 'แผนตัวอย่างสำหรับสาธิตการใช้งานและเปรียบเทียบพฤติกรรมทบทวน' }]),
      changes_json: JSON.stringify(pending && slot.minutes !== previousMinutes ? [{ action: 'increase' }] : []),
      created_at: generated, updated_at: generated,
    });
    const blockId = await insert(c, 'weekly_schedule_block', {
      recommendation_id: recId, recommendation_item_id: itemId,
      enrollment_id: enrollments[slot.e].enrollment_id, schedule_type_id: types.get(slot.type),
      scheduled_date: addDays(week, slot.day), start_time: minutesToTime(slot.start),
      end_time: minutesToTime(slot.start + slot.minutes), source: 'generated',
      created_at: generated, updated_at: generated,
    });
    if (!pending && slot.type === 'review') {
      await session(c, enrollments[slot.e].enrollment_id, blockId,
        addDays(week, userId === 6 ? slot.day : (slot.e === 0 ? 5 : 6)),
        userId === 6 ? slot.start : 19 * 60,
        slot.e === 0 ? slot.minutes : slot.minutes / 2);
    }
  }
}

async function main() {
  const c = await db.getConnection();
  let committed = false;
  let backupPath;
  try {
    await c.beginTransaction();
    assert.equal((await rows(c, 'SELECT DATABASE() AS name'))[0].name, 'planentrix');
    const users = await rows(c, 'SELECT user_id,department_id,status FROM user WHERE user_id IN (?,?) FOR UPDATE', USERS);
    assert.equal(users.length, 2);
    assert(users.every(u => u.department_id === 6 && u.status === 'active'), 'Unexpected demo account department/status');
    const [academic] = await rows(c, "SELECT academic_term_id,semester_no,DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,DATE_FORMAT(midterm_start_date,'%Y-%m-%d') AS midterm_start_date,DATE_FORMAT(midterm_end_date,'%Y-%m-%d') AS midterm_end_date,DATE_FORMAT(final_start_date,'%Y-%m-%d') AS final_start_date,DATE_FORMAT(final_end_date,'%Y-%m-%d') AS final_end_date FROM academic_terms WHERE academic_term_id=1");
    assert(academic && academic.semester_no === 1);
    const start = mondayOfWeek(academic.start_date);
    const mid = mondayOfWeek(academic.midterm_start_date);
    const final = mondayOfWeek(academic.final_start_date);
    const before = await snapshot(c);
    assert(!before.workloads.some(w => String(w.note).includes(TAG)), 'This demo has already been seeded; refusing duplicate data');
    assert(!before.study_sessions.some(s => ['running', 'paused', 'interrupted'].includes(s.status)), 'Finish open timers before seeding');
    assert(!before.exam_attempts.some(a => a.status === 'in_progress'), 'Finish open exams before seeding');
    const sections = await rows(c, 'SELECT cs.section_id,cs.subject_id FROM course_sections cs JOIN section_curriculum_subjects sc ON sc.section_id=cs.section_id JOIN curriculum_subjects cur ON cur.curriculum_subject_id=sc.curriculum_subject_id WHERE cs.section_id IN (8,9) AND cs.academic_term_id=1 AND cur.department_id=6 AND cur.year_level=1 AND cur.semester_no=1 AND cur.is_active=1 ORDER BY cs.section_id');
    assert.equal(sections.length, 2);
    const banks = await rows(c, "SELECT DISTINCT qb.question_bank_id,qb.bank_name FROM question_banks qb JOIN section_instructors si ON si.instructor_id=qb.owner_instructor_id JOIN course_sections cs ON cs.section_id=si.section_id AND cs.subject_id=qb.subject_id WHERE cs.section_id=8 AND qb.exam_period='midterm' AND qb.status='published' ORDER BY qb.question_bank_id");
    assert(banks.length > 0);
    const workloadTypes = new Map((await rows(c, 'SELECT * FROM workload_types WHERE is_active=1')).map(r => [r.type_code, r.workload_type_id]));
    const scheduleTypes = new Map((await rows(c, 'SELECT * FROM schedule_types WHERE is_active=1')).map(r => [r.type_code, r.schedule_type_id]));
    assert(['assignment', 'project', 'midterm', 'quiz'].every(t => workloadTypes.has(t)));
    assert(['review', 'homework'].every(t => scheduleTypes.has(t)));
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', users: USERS, academic, existing: Object.fromEntries(Object.entries(before).map(([k, v]) => [k, v.length])), plan: 'Preserve workloads/scores/sessions; archive old test attempts/plans; add two midterm checkpoint attempts, five plans, workloads/scores and study history per user; leave dedicated and final assessments unsubmitted; reset midterm popup' }, null, 2));
    if (!apply) { await c.rollback(); return; }
    fs.mkdirSync(directory, { recursive: true });
    backupPath = path.join(directory, `before-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ tag: TAG, users: USERS, academic, data: before }, null, 2), { flag: 'wx' });
    const summaries = [];
    for (const userId of USERS) {
      const previousTerms = before.student_terms.filter(t => t.user_id === userId);
      assert(previousTerms.every(t => t.academic_term_id === 1 && t.status === 'active'), 'Unexpected other term; refuse to alter');
      let termId = previousTerms[0]?.student_term_id;
      if (!termId) termId = await insert(c, 'student_terms', { user_id: userId, academic_term_id: 1, department_id: 6, year_level: 1, status: 'active', created_at: `${start} 08:00:00` });
      await c.query('UPDATE student_terms SET midterm_followup_notified_at=NULL WHERE student_term_id=? AND user_id=?', [termId, userId]);
      let enrollments = await rows(c, 'SELECT * FROM enrollments WHERE student_term_id=? ORDER BY section_id', [termId]);
      assert(enrollments.every(e => [8, 9].includes(e.section_id) && e.status === 'enrolled'), 'Unexpected enrollments');
      for (const section of sections) if (!enrollments.some(e => e.section_id === section.section_id)) {
        await insert(c, 'enrollments', { student_term_id: termId, section_id: section.section_id, target_grade_code: 'A', status: 'enrolled', enrolled_at: `${start} 08:00:00` });
      }
      await c.query("UPDATE enrollments SET target_grade_code=COALESCE(target_grade_code,'A') WHERE student_term_id=?", [termId]);
      enrollments = await rows(c, 'SELECT * FROM enrollments WHERE student_term_id=? ORDER BY section_id', [termId]);
      const ids = enrollments.map(e => e.enrollment_id);
      // Retain original answer snapshots and scores, but reopen the demo workflow.
      await c.query("UPDATE exam_attempts SET status='cancelled' WHERE enrollment_id IN (?)", [ids]);
      await c.query("UPDATE exam_checkpoints SET status='cancelled' WHERE enrollment_id IN (?) AND status='pending'", [ids]);
      await c.query("UPDATE weekly_recommendation SET status='superseded',superseded_at=NOW() WHERE student_term_id=? AND status<>'superseded'", [termId]);

      // 13 July -> 20 July -> 3 August, expressed relative to the exam calendar.
      const firstDate = addDays(mid, -42);
      const secondDate = addDays(mid, -35);
      const first = await seedAttempt(c, ids[0], banks, `${TAG}-${userId}-initial-mid`, firstDate, [0.15, 0.25, 0.4, 0.5]);
      assert.equal(checkpointWeeksFor(first.actual / first.maximum * 100), 1);
      const cp = await checkpoint(c, ids[0], first, 'completed', `${secondDate} 09:30:00`);
      const second = await seedAttempt(c, ids[0], banks, `${TAG}-${userId}-checkpoint-mid`, secondDate, [0.35, 0.5, 0.7, 0.8], cp);
      assert.equal(checkpointWeeksFor(second.actual / second.maximum * 100), 2);
      await checkpoint(c, ids[0], second, 'pending');

      for (const [i, e] of enrollments.entries()) {
        const [[existingScore]] = await c.query('SELECT COALESCE(SUM(s.max_score),0) AS maximum FROM workloads w JOIN score s ON s.workload_id=w.workload_id WHERE w.enrollment_id=?', [e.enrollment_id]);
        const oldMax = Number(existingScore.maximum);
        assert([0, 20, 30].includes(oldMax), 'Existing score budget changed; inspect before seeding');
        const midMax = oldMax === 30 ? 20 : 30;
        const assignmentMax = 70 - oldMax - midMax - 10;
        await workload(c, e, workloadTypes, 'assignment', 'แบบฝึกหัดบทที่ 1–2', addDays(start, 18), [Math.round(assignmentMax * (i ? 0.85 : 0.9)), assignmentMax], 'งานสะสมคะแนนก่อนกลางภาค');
        await workload(c, e, workloadTypes, 'quiz', 'Quiz เก็บคะแนนระหว่างเรียน', addDays(start, 25), [i ? 8 : 9, 10], 'คะแนนจริงจากงานในรายวิชา ไม่ใช่แบบทดสอบวัดความรู้');
        await workload(c, e, workloadTypes, 'midterm', 'สอบกลางภาคของรายวิชา', addDays(mid, 2), [Math.round(midMax * (i ? 0.85 : 0.9)), midMax], 'คะแนนสอบกลางภาคสำหรับคำนวณเกรดและคะแนนปลายภาคที่ต้องได้');
        await workload(c, e, workloadTypes, 'assignment', 'สรุปบทเรียนรอตรวจคะแนน', addDays(final, -18), null, 'ส่งงานแล้ว แต่ยังไม่บันทึกคะแนน', true);
        await workload(c, e, workloadTypes, 'assignment', 'แบบฝึกหัดเตรียมสอบ', addDays(final, -11), null, 'งานค้างสำหรับสาธิตกำหนดส่ง/แจ้งเตือน');
        await workload(c, e, workloadTypes, 'assignment', 'รายงานสรุปเนื้อหา', addDays(final, -5), null, 'งานกำหนดส่งในสัปดาห์ก่อนสอบ');
        await workload(c, e, workloadTypes, 'project', 'โครงงานประยุกต์ความรู้', addDays(final, -3), null, 'โครงงานที่ระบบจัดเวลาทำอย่างน้อยสัปดาห์ละ 2 ชั่วโมง');
        await workload(c, e, workloadTypes, 'assignment', 'แบบฝึกทักษะเพิ่มเติม', addDays(final, 2), null, 'งานกำหนดส่งสัปดาห์ถัดไปสำหรับทดสอบ trigger');
      }
      for (let i = 0; i < 5; i++) await seedPlan(c, userId, termId, enrollments, scheduleTypes, addDays(start, i * 7), i);
      // Additional recorded study for the later-term statistics; no final exam scores.
      for (let week = 8; week < 15; week++) {
        await session(c, ids[0], null, addDays(start, week * 7 + 5), 19 * 60, userId === 6 ? 90 : 120);
        await session(c, ids[1], null, addDays(start, week * 7 + 6), 19 * 60, userId === 6 ? 45 : 30);
      }
      summaries.push({ user_id: userId, student_term_id: termId, enrollment_ids: ids, midterm_attempts: [first.id, second.id], initial_scores: [first.actual, second.actual], next_checkpoint_at: `${addDays(secondDate, 14)} 08:00:00`, final_assessments: 'not submitted', popup: 'reset' });
    }
    const invalid = await rows(c, 'SELECT e.enrollment_id,SUM(sc.max_score) AS maximum FROM enrollments e JOIN student_terms st ON st.student_term_id=e.student_term_id JOIN workloads w ON w.enrollment_id=e.enrollment_id JOIN score sc ON sc.workload_id=w.workload_id WHERE st.user_id IN (6,7) GROUP BY e.enrollment_id HAVING maximum > 70');
    assert.equal(invalid.length, 0, 'Score budget must leave at least 30 points for final');
    await c.commit();
    committed = true;
    const report = { tag: TAG, backup: backupPath, inserted, summaries };
    fs.writeFileSync(path.join(directory, `applied-${stamp}.json`), JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (!committed) await c.rollback();
    console.error(JSON.stringify({ committed, backup: backupPath, error: error.message }));
    throw error;
  } finally {
    c.release();
  }
}
main().catch(() => { process.exitCode = 1; }).finally(() => db.end());
