import test from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_STUDY_TYPE_NAME,
  getMappedStudyTypeName,
  isWeakTopic,
  resolveReviewMethod,
  WEAK_TOPIC_PERCENTAGE,
} from "./review-method.rules";

test("weak-topic rule remains separate from the review-method mapping", () => {
  assert.equal(WEAK_TOPIC_PERCENTAGE, 50);
  assert.equal(isWeakTopic(49.99), true);
  assert.equal(isWeakTopic(50), false);
  assert.equal(isWeakTopic(80), false);
});

test("maps each known subject type to its review-method rule", () => {
  assert.equal(getMappedStudyTypeName("ทฤษฎีและหลักการ"), "reading");
  assert.equal(getMappedStudyTypeName("เขียนโปรแกรม"), "practice");
  assert.equal(
    getMappedStudyTypeName("ออกแบบและวิเคราะห์ระบบ"),
    "review",
  );
  assert.equal(getMappedStudyTypeName("ฐานข้อมูล"), "practice");
  assert.equal(
    getMappedStudyTypeName("เครือข่ายและความปลอดภัย"),
    "video",
  );
  assert.equal(
    getMappedStudyTypeName("ปัญญาประดิษฐ์และข้อมูล"),
    "practice",
  );
  assert.equal(getMappedStudyTypeName("เว็บและแอปพลิเคชัน"), "practice");
  assert.equal(getMappedStudyTypeName("โครงงานและฝึกงาน"), "review");
});

test("leaves unknown subject types for the review fallback", () => {
  assert.equal(getMappedStudyTypeName("ประเภทวิชาใหม่"), null);
  assert.equal(FALLBACK_STUDY_TYPE_NAME, "review");
});

test("uses the subject-type mapping when one exists", () => {
  assert.deepEqual(
    resolveReviewMethod(
      { studyTypeId: 3, studyTypeName: "video" },
      { studyTypeId: 4, studyTypeName: "review" },
    ),
    { studyTypeId: 3, studyTypeName: "video", fallbackUsed: false },
  );
});

test("falls back to review when a subject type has no mapping", () => {
  assert.deepEqual(
    resolveReviewMethod(null, {
      studyTypeId: 4,
      studyTypeName: "review",
    }),
    { studyTypeId: 4, studyTypeName: "review", fallbackUsed: true },
  );
});

test("fails clearly when neither mapping nor review fallback exists", () => {
  assert.throws(
    () => resolveReviewMethod(null, null),
    /fallback were not found/,
  );
});
