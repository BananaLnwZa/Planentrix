// One-off demo data for user_id 5. Preview by default; pass --apply to insert.
// Adds completed workloads and scores without changing existing work or grades.
require('ts-node/register');
const db = require('../src/config/db').default;

const userId = 5;
const termId = 5;
const expected = [
  { enrollmentId: 21, earned: 34, max: 40 },
  { enrollmentId: 22, earned: 31, max: 40 },
  { enrollmentId: 23, earned: 25, max: 40 },
  { enrollmentId: 24, earned: 32, max: 40 },
  { enrollmentId: 25, earned: 28, max: 40 },
];
const additions = [
  { enrollmentId: 21, type: 'assignment', name: 'แบบฝึกค้นข้อมูลจากฐานข้อมูลวิชาการ', date: '2026-10-12', score: 17, max: 20 },
  { enrollmentId: 21, type: 'quiz', name: 'แบบทดสอบประเมินแหล่งสารสนเทศ', date: '2026-10-16', score: 15, max: 20 },
  { enrollmentId: 22, type: 'assignment', name: 'แบบฝึกการสื่อสารในสถานการณ์จริง', date: '2026-10-12', score: 18, max: 20 },
  { enrollmentId: 22, type: 'quiz', name: 'แบบทดสอบบทสนทนาและคำศัพท์', date: '2026-10-16', score: 17, max: 20 },
  { enrollmentId: 23, type: 'assignment', name: 'แบบฝึกสถิติเชิงพรรณนา', date: '2026-10-12', score: 23, max: 25 },
  { enrollmentId: 23, type: 'quiz', name: 'แบบทดสอบวิเคราะห์ข้อมูล', date: '2026-10-16', score: 22, max: 25 },
  { enrollmentId: 24, type: 'assignment', name: 'แบบฝึกวิเคราะห์กระบวนการธุรกิจ', date: '2026-10-12', score: 17, max: 20 },
  { enrollmentId: 24, type: 'quiz', name: 'แบบทดสอบระบบสารสนเทศองค์กร', date: '2026-10-16', score: 17, max: 20 },
  { enrollmentId: 25, type: 'assignment', name: 'แบบฝึกออกแบบฐานข้อมูล', date: '2026-10-12', score: 18, max: 20 },
  { enrollmentId: 25, type: 'quiz', name: 'แบบทดสอบ SQL JOIN และ Normalization', date: '2026-10-16', score: 18, max: 20 },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const connection = await db.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();
    const [[identity]] = await connection.query('SELECT DATABASE() AS db');
    if (identity.db !== 'planentrix') throw new Error('Unexpected database');

    const [terms] = await connection.query(
      "SELECT student_term_id FROM student_terms WHERE student_term_id=? AND user_id=? AND status='active' FOR UPDATE",
      [termId, userId]
    );
    if (terms.length !== 1) throw new Error('Demo user active term changed');

    const [enrollments] = await connection.query(
      "SELECT enrollment_id FROM enrollments WHERE student_term_id=? AND status='enrolled' ORDER BY enrollment_id FOR UPDATE",
      [termId]
    );
    if (JSON.stringify(enrollments.map((row) => Number(row.enrollment_id))) !==
        JSON.stringify(expected.map((item) => item.enrollmentId))) {
      throw new Error('Demo enrollments changed');
    }

    const [existing] = await connection.query(
      `SELECT w.enrollment_id,w.workload_name,w.status,s.actual_score,s.max_score
       FROM workloads w LEFT JOIN score s ON s.workload_id=w.workload_id
       WHERE w.enrollment_id IN (?,?,?,?,?) FOR UPDATE`,
      expected.map((item) => item.enrollmentId)
    );
    const demoNames = new Set(additions.map((item) => item.name));
    if (existing.some((row) => demoNames.has(row.workload_name))) {
      throw new Error('Demo scores already exist; refusing to duplicate them');
    }
    for (const item of expected) {
      const completed = existing.filter((row) => row.enrollment_id === item.enrollmentId && row.status === 'completed');
      const earned = completed.reduce((sum, row) => sum + Number(row.actual_score || 0), 0);
      const max = completed.reduce((sum, row) => sum + Number(row.max_score || 0), 0);
      if (earned !== item.earned || max !== item.max) {
        throw new Error(`Existing scores changed for enrollment ${item.enrollmentId}`);
      }
    }

    const [types] = await connection.query(
      "SELECT workload_type_id,LOWER(type_code) AS type_code FROM workload_types WHERE is_active=1"
    );
    const typeIds = new Map(types.map((row) => [row.type_code, Number(row.workload_type_id)]));
    if (!typeIds.has('assignment') || !typeIds.has('quiz')) throw new Error('Required workload types are missing');

    const preview = expected.map((item) => {
      const added = additions.filter((row) => row.enrollmentId === item.enrollmentId);
      const score = item.earned + added.reduce((sum, row) => sum + row.score, 0);
      const max = item.max + added.reduce((sum, row) => sum + row.max, 0);
      if (max > 100 || added.some((row) => row.score < 0 || row.score > row.max)) {
        throw new Error(`Invalid total for enrollment ${item.enrollmentId}`);
      }
      return { enrollment_id: item.enrollmentId, earned_score: score, recorded_max: max };
    });
    if (!apply) {
      console.log(JSON.stringify({ mode: 'preview', user_id: userId, additions, totals: preview }, null, 2));
      return;
    }

    const inserted = [];
    for (const item of additions) {
      const createdAt = `${item.date} 08:00:00`;
      const finishedAt = `${item.date} 18:00:00`;
      const recordedAt = `${item.date} 19:00:00`;
      const [workload] = await connection.query(
        `INSERT INTO workloads (
           enrollment_id,workload_type_id,workload_name,deadline_date,deadline_time,
           note,status,created_at,finished_at,updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [item.enrollmentId, typeIds.get(item.type), item.name, item.date, '23:00:00',
          null, 'completed', createdAt, finishedAt, finishedAt]
      );
      const [score] = await connection.query(
        `INSERT INTO score (workload_id,actual_score,max_score,recorded_at,updated_at)
         VALUES (?,?,?,?,?)`,
        [workload.insertId, item.score, item.max, recordedAt, recordedAt]
      );
      inserted.push({ enrollment_id: item.enrollmentId, workload_id: workload.insertId, score_id: score.insertId });
    }
    await connection.commit();
    committed = true;
    console.log(JSON.stringify({ mode: 'applied', user_id: userId, inserted, totals: preview }, null, 2));
  } finally {
    if (!committed) await connection.rollback();
    connection.release();
  }
}

main()
  .catch((error) => { console.error(error.code || error.message); process.exitCode = 1; })
  .finally(() => db.end());
