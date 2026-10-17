// One-off demo data for user_id 5. Preview by default; pass --apply to insert.
// Existing workloads are never modified or deleted, and a second run cannot duplicate them.
require('ts-node/register');
const db = require('../src/config/db').default;

const userId = 5;
const termId = 5;
const expectedEnrollments = [21, 22, 23, 24, 25];
const work = [
  { enrollmentId: 21, type: 'midterm', name: 'สอบกลางภาค: การค้นคืนสารสนเทศ', deadline: '2026-08-26', time: '12:00:00', status: 'completed', created: '2026-08-20 09:00:00', finished: '2026-08-26 11:00:00', score: [26, 30], recorded: '2026-08-28 09:00:00' },
  { enrollmentId: 21, type: 'assignment', name: 'สรุปแหล่งข้อมูลวิชาการ', deadline: '2026-10-10', time: '23:00:00', status: 'completed', created: '2026-10-05 09:00:00', finished: '2026-10-09 18:00:00', score: [8, 10], recorded: '2026-10-11 09:00:00' },
  { enrollmentId: 21, type: 'assignment', name: 'รายงานค้นคว้าแหล่งข้อมูล', deadline: '2026-10-21', time: '23:00:00', status: 'pending', note: 'สรุปข้อมูลพร้อมอ้างอิงแหล่งที่มา' },

  { enrollmentId: 22, type: 'midterm', name: 'สอบกลางภาค: English for Communication', deadline: '2026-08-26', time: '12:00:00', status: 'completed', created: '2026-08-20 09:00:00', finished: '2026-08-26 11:00:00', score: [22, 30], recorded: '2026-08-28 09:00:00' },
  { enrollmentId: 22, type: 'assignment', name: 'แบบฝึกบทสนทนาภาษาอังกฤษ', deadline: '2026-10-10', time: '23:00:00', status: 'completed', created: '2026-10-05 09:00:00', finished: '2026-10-09 18:00:00', score: [9, 10], recorded: '2026-10-11 09:00:00' },
  { enrollmentId: 22, type: 'project', name: 'โครงงานนำเสนอภาษาอังกฤษ', deadline: '2026-11-06', time: '23:00:00', status: 'pending', note: 'เตรียมหัวข้อ สไลด์ และซ้อมนำเสนอ' },

  { enrollmentId: 23, type: 'midterm', name: 'สอบกลางภาค: Statistics for Scientist', deadline: '2026-08-26', time: '12:00:00', status: 'completed', created: '2026-08-20 09:00:00', finished: '2026-08-26 11:00:00', score: [18, 30], recorded: '2026-08-28 09:00:00' },
  { enrollmentId: 23, type: 'assignment', name: 'แบบฝึกหัดความน่าจะเป็น', deadline: '2026-10-10', time: '23:00:00', status: 'completed', created: '2026-10-05 09:00:00', finished: '2026-10-09 18:00:00', score: [7, 10], recorded: '2026-10-11 09:00:00' },
  { enrollmentId: 23, type: 'assignment', name: 'แบบฝึกหัดสถิติเชิงอนุมาน', deadline: '2026-10-23', time: '23:00:00', status: 'pending', note: 'ทำโจทย์ตัวอย่างและสรุปวิธีคำนวณ' },

  { enrollmentId: 24, type: 'midterm', name: 'สอบกลางภาค: Information Systems in Organization', deadline: '2026-08-26', time: '12:00:00', status: 'completed', created: '2026-08-20 09:00:00', finished: '2026-08-26 11:00:00', score: [24, 30], recorded: '2026-08-28 09:00:00' },
  { enrollmentId: 24, type: 'assignment', name: 'แผนภาพกระบวนการองค์กร', deadline: '2026-10-10', time: '23:00:00', status: 'completed', created: '2026-10-05 09:00:00', finished: '2026-10-09 18:00:00', score: [8, 10], recorded: '2026-10-11 09:00:00' },
  { enrollmentId: 24, type: 'project', name: 'โครงงานวิเคราะห์ระบบองค์กร', deadline: '2026-11-13', time: '23:00:00', status: 'pending', note: 'เก็บความต้องการและออกแบบกระบวนการ' },

  { enrollmentId: 25, type: 'midterm', name: 'สอบกลางภาค: Database System', deadline: '2026-08-26', time: '12:00:00', status: 'completed', created: '2026-08-20 09:00:00', finished: '2026-08-26 11:00:00', score: [20, 30], recorded: '2026-08-28 09:00:00' },
  { enrollmentId: 25, type: 'assignment', name: 'แบบฝึก SQL เบื้องต้น', deadline: '2026-10-10', time: '23:00:00', status: 'completed', created: '2026-10-05 09:00:00', finished: '2026-10-09 18:00:00', score: [8, 10], recorded: '2026-10-11 09:00:00' },
  { enrollmentId: 25, type: 'assignment', name: 'แบบฝึก SQL JOIN', deadline: '2026-10-24', time: '23:00:00', status: 'pending', note: 'ทำโจทย์ INNER JOIN และ LEFT JOIN' },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const connection = await db.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();
    const [[identity]] = await connection.query('SELECT DATABASE() AS db');
    if (identity.db !== 'planentrix') throw new Error('Unexpected database; nothing was inserted');

    const [terms] = await connection.query(
      "SELECT student_term_id FROM student_terms WHERE student_term_id=? AND user_id=? AND status='active' FOR UPDATE",
      [termId, userId]
    );
    if (terms.length !== 1) throw new Error('Demo user active term changed; nothing was inserted');

    const [enrollments] = await connection.query(
      "SELECT enrollment_id FROM enrollments WHERE student_term_id=? AND status='enrolled' ORDER BY enrollment_id FOR UPDATE",
      [termId]
    );
    if (JSON.stringify(enrollments.map(({ enrollment_id }) => Number(enrollment_id))) !== JSON.stringify(expectedEnrollments)) {
      throw new Error('Demo enrollments changed; nothing was inserted');
    }

    const [existing] = await connection.query(
      `SELECT workload_id FROM workloads WHERE enrollment_id IN (?,?,?,?,?) LIMIT 1`,
      expectedEnrollments
    );
    if (existing.length) throw new Error('Demo user already has workloads; refusing to duplicate or overwrite them');

    const [types] = await connection.query(
      "SELECT workload_type_id,LOWER(type_code) AS type_code FROM workload_types WHERE is_active=1"
    );
    const typeIds = new Map(types.map(({ workload_type_id, type_code }) => [type_code, Number(workload_type_id)]));
    if (!['assignment', 'project', 'midterm'].every((code) => typeIds.has(code))) {
      throw new Error('Required workload types are missing');
    }

    const totals = new Map();
    for (const item of work) {
      if (!typeIds.has(item.type)) throw new Error(`Unknown workload type ${item.type}`);
      if (item.score) {
        const [actual, max] = item.score;
        if (actual < 0 || actual > max || max <= 0) throw new Error('Invalid demo score');
        totals.set(item.enrollmentId, (totals.get(item.enrollmentId) || 0) + max);
      }
    }
    if ([...totals.values()].some((max) => max > 100)) throw new Error('Subject maximum scores exceed 100');

    const preview = expectedEnrollments.map((enrollmentId) => ({
      enrollment_id: enrollmentId,
      completed: work.filter((item) => item.enrollmentId === enrollmentId && item.status === 'completed').length,
      pending: work.filter((item) => item.enrollmentId === enrollmentId && item.status === 'pending').length,
      current_score: work.filter((item) => item.enrollmentId === enrollmentId && item.score).reduce((sum, item) => sum + item.score[0], 0),
      recorded_max: totals.get(enrollmentId) || 0,
      pending_work: work.filter((item) => item.enrollmentId === enrollmentId && item.status === 'pending').map(({ name, deadline }) => ({ name, deadline })),
    }));
    if (!apply) {
      console.log(JSON.stringify({ mode: 'preview', user_id: userId, student_term_id: termId, workload_count: work.length, scored_count: work.filter((item) => item.score).length, subjects: preview }, null, 2));
      await connection.rollback();
      return;
    }

    const workloadIds = [];
    const scoreIds = [];
    for (const item of work) {
      const [result] = await connection.query(
        `INSERT INTO workloads (
           enrollment_id,workload_type_id,workload_name,deadline_date,deadline_time,
           note,status,created_at,finished_at,updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [item.enrollmentId, typeIds.get(item.type), item.name, item.deadline,
          item.time, item.note || null, item.status, item.created || new Date(),
          item.finished || null, item.finished || new Date()]
      );
      workloadIds.push(result.insertId);
      if (item.score) {
        const [score] = await connection.query(
          `INSERT INTO score (workload_id,actual_score,max_score,recorded_at,updated_at)
           VALUES (?,?,?,?,?)`,
          [result.insertId, item.score[0], item.score[1], item.recorded, item.recorded]
        );
        scoreIds.push(score.insertId);
      }
    }
    await connection.commit();
    committed = true;
    console.log(JSON.stringify({ mode: 'applied', user_id: userId, student_term_id: termId, workload_ids: workloadIds, score_ids: scoreIds, subjects: preview }, null, 2));
  } finally {
    if (!committed) await connection.rollback();
    connection.release();
  }
}

main()
  .catch((error) => { console.error(error.code || error.message); process.exitCode = 1; })
  .finally(() => db.end());
