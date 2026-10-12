// Repair only the legacy follow-up identified in the demo screenshot.
// Default is read-only preview. Preserve the completed exam and original appointment.
require('ts-node/register');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db').default;

async function main() {
  if (process.argv.includes('--verify')) {
    const { voidPendingCheckpointsForExamFlow } = require('../src/user/services/term-workflow');
    const original = db.query;
    let statement;
    db.query = async sql => { statement = sql; return [{}]; };
    try { await voidPendingCheckpointsForExamFlow(6); }
    finally { db.query = original; }
    const select = statement
      .replace('UPDATE exam_checkpoints checkpoint', 'SELECT checkpoint.exam_checkpoint_id FROM exam_checkpoints checkpoint')
      .replace("SET checkpoint.status = 'cancelled', checkpoint.updated_at = NOW()", '');
    for (const userId of [6, 7]) {
      const [invalid] = await db.query(select, [userId]);
      assert.equal(invalid.length, 0);
    }
    const [states] = await db.query('SELECT exam_checkpoint_id,status FROM exam_checkpoints WHERE exam_checkpoint_id IN (25,27,28) ORDER BY exam_checkpoint_id');
    assert.deepEqual(states.map(row => row.status), ['completed', 'pending', 'cancelled']);
    console.log(JSON.stringify({ verified: true, states }));
    return;
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`SELECT cp.*,st.user_id,
      a.source_checkpoint_id AS completed_checkpoint_id,
      DATE_FORMAT(a.submitted_at,'%Y-%m-%d') AS submitted_date
      FROM exam_checkpoints cp JOIN enrollments e USING(enrollment_id)
      JOIN student_terms st USING(student_term_id)
      JOIN exam_attempts a ON a.exam_attempt_id=cp.source_exam_attempt_id
      WHERE cp.exam_checkpoint_id=28 AND st.user_id=6 FOR UPDATE`);
    assert.equal(rows.length, 1);
    const checkpoint = rows[0];
    assert.equal(checkpoint.source_exam_attempt_id, 77);
    assert.equal(checkpoint.completed_checkpoint_id, 25);
    assert.equal(checkpoint.submitted_date, '2026-08-03');
    assert(['pending', 'cancelled'].includes(checkpoint.status));
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'preview', checkpoint }, null, 2));
    if (!process.argv.includes('--apply') || checkpoint.status === 'cancelled') {
      await connection.rollback();
      return;
    }
    const directory = path.resolve(__dirname, '../../artifacts/demo-users-6-7');
    fs.mkdirSync(directory, { recursive: true });
    const backup = path.join(directory, `checkpoint-28-before-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(rows, null, 2), { flag: 'wx' });
    const [result] = await connection.query(`UPDATE exam_checkpoints
      SET status='cancelled',updated_at=NOW()
      WHERE exam_checkpoint_id=28 AND source_exam_attempt_id=77 AND status='pending'`);
    assert.equal(result.affectedRows, 1);
    await connection.commit();
    console.log(JSON.stringify({ cancelled_checkpoint: 28, backup, deleted_records: 0 }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.end());
