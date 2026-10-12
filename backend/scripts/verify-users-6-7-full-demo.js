// Read-only verification. Does not call endpoints that mutate workflow state.
require('ts-node/register');
const assert = require('node:assert/strict');
const db = require('../src/config/db').default;
const { scoreSnapshotQuestions } = require('../src/user/services/exam-attempt.rules');
const { getExamWorkflowPhase } = require('../src/user/services/term-workflow');

async function main() {
  const [terms] = await db.query(`SELECT st.user_id,st.student_term_id,st.status,
    st.midterm_followup_notified_at,
    DATE_FORMAT(a.midterm_start_date,'%Y-%m-%d') midterm_start_date,
    DATE_FORMAT(a.midterm_end_date,'%Y-%m-%d') midterm_end_date,
    DATE_FORMAT(a.final_start_date,'%Y-%m-%d') final_start_date,
    DATE_FORMAT(a.final_end_date,'%Y-%m-%d') final_end_date
    FROM student_terms st JOIN academic_terms a USING(academic_term_id)
    WHERE st.user_id IN (6,7)`);
  assert.equal(terms.length, 2);
  const summaries = [];
  for (const term of terms) {
    assert.equal(term.status, 'active');
    assert.equal(term.midterm_followup_notified_at, null);
    const [enrollments] = await db.query(`SELECT e.enrollment_id,e.section_id,e.status,e.target_grade_code,
      SUM(sc.actual_score) actual,SUM(sc.max_score) maximum
      FROM enrollments e LEFT JOIN workloads w USING(enrollment_id)
      LEFT JOIN score sc USING(workload_id)
      WHERE e.student_term_id=? GROUP BY e.enrollment_id ORDER BY e.section_id`, [term.student_term_id]);
    assert.equal(enrollments.length, 2);
    for (const e of enrollments) {
      assert.equal(e.status, 'enrolled');
      assert.equal(e.target_grade_code, 'A');
      assert.equal(Number(e.maximum), 70);
      assert(Number(e.actual) >= 60 && Number(e.actual) <= 70);
    }
    const ids = enrollments.map(e => e.enrollment_id);
    const [[workloads]] = await db.query(`SELECT COUNT(*) count,
      SUM(status='completed') completed,SUM(status='pending') pending
      FROM workloads WHERE enrollment_id IN (?) AND note LIKE '%demo67-v1%'`, [ids]);
    assert.equal(workloads.count, 16);
    assert.equal(Number(workloads.completed), 8);
    assert.equal(Number(workloads.pending), 8);
    const [attempts] = await db.query(`SELECT * FROM exam_attempts
      WHERE enrollment_id IN (?) AND status='submitted'`, [ids]);
    assert.equal(attempts.length, 2);
    for (const a of attempts) {
      assert.equal(a.exam_period, 'midterm');
      assert.equal(a.workflow_phase, 'checkpoint');
      const [questions] = await db.query('SELECT * FROM exam_attempt_questions WHERE exam_attempt_id=?', [a.exam_attempt_id]);
      const scored = scoreSnapshotQuestions(questions);
      assert.equal(scored.actualScore, Number(a.actual_score));
      assert.equal(scored.maximumScore, Number(a.max_score));
      const [[bankTotals]] = await db.query('SELECT SUM(actual_score) actual,SUM(max_score) maximum FROM exam_attempt_bank_results WHERE exam_attempt_id=?', [a.exam_attempt_id]);
      assert.equal(Number(bankTotals.actual), scored.actualScore);
      assert.equal(Number(bankTotals.maximum), scored.maximumScore);
    }
    const [checkpoints] = await db.query(`SELECT exam_checkpoint_id,status,
      DATE_FORMAT(next_checkpoint_at,'%Y-%m-%d %H:%i:%s') due
      FROM exam_checkpoints WHERE enrollment_id IN (?) AND status='pending'`, [ids]);
    assert.equal(checkpoints.length, 1);
    assert.equal(checkpoints[0].due, '2026-08-03 08:00:00');
    const [[sessions]] = await db.query(`SELECT COUNT(*) count,SUM(accumulated_seconds)/60 minutes,
      SUM(accumulated_seconds>TIMESTAMPDIFF(SECOND,started_at,ended_at)) invalid
      FROM study_sessions WHERE enrollment_id IN (?) AND status='completed'`, [ids]);
    assert.equal(Number(sessions.invalid), 0);
    assert.equal(Number(sessions.count), term.user_id === 6 ? 24 : 22);
    const [[plans]] = await db.query(`SELECT COUNT(*) count,SUM(status='accepted') accepted,
      SUM(status='pending') pending FROM weekly_recommendation
      WHERE student_term_id=? AND rule_version='demo67-v1'`, [term.student_term_id]);
    assert.equal(plans.count, 5);
    assert.equal(Number(plans.accepted), 4);
    assert.equal(Number(plans.pending), 1);
    const [[overlaps]] = await db.query(`SELECT COUNT(*) count FROM weekly_schedule_block a
      JOIN weekly_schedule_block b ON a.recommendation_id=b.recommendation_id
        AND a.weekly_block_id<b.weekly_block_id AND a.scheduled_date=b.scheduled_date
        AND a.start_time<b.end_time AND b.start_time<a.end_time
      JOIN weekly_recommendation r ON r.recommendation_id=a.recommendation_id
      WHERE r.student_term_id=? AND r.rule_version='demo67-v1'`, [term.student_term_id]);
    assert.equal(overlaps.count, 0);
    const [[popup]] = await db.query(`SELECT (midterm_followup_notified_at IS NULL
      AND '2026-08-31'>DATE_ADD(a.midterm_end_date,INTERVAL (6-WEEKDAY(a.midterm_end_date)) DAY)
      AND '2026-08-31'<DATE_SUB(a.final_start_date,INTERVAL 7 DAY)) ready
      FROM student_terms st JOIN academic_terms a USING(academic_term_id)
      WHERE st.student_term_id=?`, [term.student_term_id]);
    assert.equal(Number(popup.ready), 1);
    const [finalBanks] = await db.query(`SELECT DISTINCT qb.question_bank_id FROM enrollments e
      JOIN course_sections cs USING(section_id) JOIN section_instructors si USING(section_id)
      JOIN question_banks qb ON qb.subject_id=cs.subject_id AND qb.owner_instructor_id=si.instructor_id
      WHERE e.student_term_id=? AND qb.exam_period='final' AND qb.status='published'
      AND EXISTS(SELECT 1 FROM question q WHERE q.question_bank_id=qb.question_bank_id AND q.is_active=1)`, [term.student_term_id]);
    assert(finalBanks.length > 0);
    summaries.push({ user_id: term.user_id, enrollments, workloads, sessions, plans,
      checkpoints, popup_ready_on_aug31: true, final_published_banks: finalBanks.length,
      submitted_final_exams: 0, overlapping_mock_blocks: overlaps.count });
  }
  const stages = [
    ['2026-08-03', 'midterm_3w'], ['2026-08-10', 'midterm_2w'],
    ['2026-08-17', 'midterm_1w'], ['2026-08-24', 'midterm_exam'],
    ['2026-08-31', 'midterm_post'], ['2026-10-05', 'final_3w'],
    ['2026-10-12', 'final_2w'], ['2026-10-19', 'final_1w'],
    ['2026-10-26', 'final_exam'], ['2026-11-02', 'final_post'],
  ];
  for (const [date, expected] of stages) {
    const period = expected.startsWith('final') ? 'final' : 'midterm';
    assert.equal(getExamWorkflowPhase(terms[0], period, new Date(`${date}T09:00:00+07:00`)), expected);
  }
  console.log(JSON.stringify({ verified: true, summaries, stages }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.end());
