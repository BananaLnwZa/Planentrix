import type { RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

interface TermIdRow extends RowDataPacket {
  academic_term_id: number;
}

interface TermReadinessRow extends RowDataPacket {
  section_id: number;
  has_curriculum: number | boolean;
  has_owner: number | boolean;
  has_meeting: number | boolean;
  meetings_have_rooms: number | boolean;
}

const getBangkokDate = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

/** Moves academic terms and their sections forward according to the term calendar. */
export const transitionAcademicTerms = async (): Promise<void> => {
  const connection = await db.getConnection();
  let lockAcquired = false;

  try {
    const today = getBangkokDate();
    const [lockRows] = await connection.query<RowDataPacket[]>(
      "SELECT GET_LOCK('planentrix_academic_term_scheduler', 0) AS acquired",
    );
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) return;

    await connection.beginTransaction();

    const [endedTerms] = await connection.query<TermIdRow[]>(
      `SELECT academic_term_id
       FROM academic_terms
       WHERE status = 'active' AND end_date < ?
       FOR UPDATE`,
      [today],
    );
    if (endedTerms.length > 0) {
      const ids = endedTerms.map((term) => Number(term.academic_term_id));
      const placeholders = ids.map(() => "?").join(", ");
      await connection.query(
        `UPDATE academic_terms
         SET status = 'completed', updated_at = NOW()
         WHERE academic_term_id IN (${placeholders}) AND status = 'active'`,
        ids,
      );
      await connection.query(
        `UPDATE course_sections
         SET status = 'completed', updated_at = NOW()
         WHERE academic_term_id IN (${placeholders})
           AND status IN ('draft', 'open', 'closed')`,
        ids,
      );
    }

    // A draft whose entire calendar window was missed must not be opened late.
    const [expiredDrafts] = await connection.query<TermIdRow[]>(
      `SELECT academic_term_id
       FROM academic_terms
       WHERE status = 'draft' AND end_date < ?
       FOR UPDATE`,
      [today],
    );
    if (expiredDrafts.length > 0) {
      const ids = expiredDrafts.map((term) => Number(term.academic_term_id));
      const placeholders = ids.map(() => "?").join(", ");
      await connection.query(
        `UPDATE academic_terms
         SET status = 'completed', updated_at = NOW()
         WHERE academic_term_id IN (${placeholders}) AND status = 'draft'`,
        ids,
      );
      await connection.query(
        `UPDATE course_sections
         SET status = 'completed', updated_at = NOW()
         WHERE academic_term_id IN (${placeholders})
           AND status IN ('draft', 'open', 'closed')`,
        ids,
      );
    }

    const [activeTerms] = await connection.query<TermIdRow[]>(
      "SELECT academic_term_id FROM academic_terms WHERE status = 'active' FOR UPDATE",
    );
    if (activeTerms.length === 0) {
      const [nextTerms] = await connection.query<TermIdRow[]>(
        `SELECT academic_term_id
         FROM academic_terms
         WHERE status = 'draft'
           AND start_date <= ?
           AND end_date >= ?
         ORDER BY start_date, academic_year, semester_no
         LIMIT 1
         FOR UPDATE`,
        [today, today],
      );
      const nextTermId = nextTerms[0]?.academic_term_id;
      if (nextTermId) {
        const [readinessRows] = await connection.query<TermReadinessRow[]>(
          `SELECT
             section.section_id,
             EXISTS(
               SELECT 1 FROM section_curriculum_subjects mapping
               WHERE mapping.section_id = section.section_id
             ) AS has_curriculum,
             EXISTS(
               SELECT 1 FROM section_instructors assignment
               WHERE assignment.section_id = section.section_id
                 AND assignment.instructor_role = 'owner'
             ) AS has_owner,
             EXISTS(
               SELECT 1 FROM class_meetings meeting
               WHERE meeting.section_id = section.section_id
             ) AS has_meeting,
             NOT EXISTS(
               SELECT 1 FROM class_meetings meeting
               WHERE meeting.section_id = section.section_id
                 AND (meeting.classroom IS NULL OR TRIM(meeting.classroom) = '')
             ) AS meetings_have_rooms
           FROM course_sections section
           WHERE section.academic_term_id = ?
             AND section.status <> 'cancelled'
           FOR UPDATE`,
          [nextTermId],
        );
        const ready = readinessRows.length > 0 && readinessRows.every(
          (section) =>
            Number(section.has_curriculum) &&
            Number(section.has_owner) &&
            Number(section.has_meeting) &&
            Number(section.meetings_have_rooms),
        );
        if (ready) {
          await connection.query(
            `UPDATE academic_terms
             SET status = 'active', updated_at = NOW()
             WHERE academic_term_id = ? AND status = 'draft'`,
            [nextTermId],
          );
          await connection.query(
            `UPDATE course_sections
             SET status = 'open', updated_at = NOW()
             WHERE academic_term_id = ? AND status = 'draft'`,
            [nextTermId],
          );
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (lockAcquired) {
      await connection.query(
        "SELECT RELEASE_LOCK('planentrix_academic_term_scheduler')",
      );
    }
    connection.release();
  }
};

export const startAcademicTermScheduler = (): void => {
  const run = () => {
    void transitionAcademicTerms().catch((error) => {
      console.error("Academic term transition failed:", error);
    });
  };

  run();
  const timer = setInterval(run, 60_000);
  timer.unref();
};
