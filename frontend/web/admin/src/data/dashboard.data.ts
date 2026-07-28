export const weeklyStudyTrend = [11.2, 12.8, 13.4, 12.9, 14.1, 14.5, 14.8];

export const reviewTimeTrend = [5.1, 5.4, 5.8, 5.6, 6.1, 6.2, 6.4];

export const popularConstraints = [
  { label: "วันหยุดประจำสัปดาห์", value: "เสาร์–อาทิตย์", percent: 82 },
  { label: "ทำงานต่อเนื่องสูงสุด", value: "90 นาที", percent: 68 },
  { label: "เวลาพักระหว่างงาน", value: "15 นาที", percent: 61 },
  { label: "ช่วงเวลาที่สะดวก", value: "18:00–21:00", percent: 57 },
  { label: "วันที่มักไม่ว่าง", value: "วันพุธ", percent: 43 },
];

export const bestExamParts = [
  { label: "Part 2: วิเคราะห์โจทย์", score: 91 },
  { label: "Part 1: ความรู้พื้นฐาน", score: 88 },
  { label: "Part 4: ประยุกต์ใช้", score: 84 },
  { label: "Part 3: คำนวณ", score: 81 },
  { label: "Part 6: กรณีศึกษา", score: 78 },
];

export const weakestExamParts = [
  { label: "Part 8: เขียนอธิบาย", score: 54 },
  { label: "Part 7: เชื่อมโยงเนื้อหา", score: 58 },
  { label: "Part 5: จับเวลา", score: 62 },
  { label: "Part 10: สรุปผล", score: 65 },
  { label: "Part 9: ตรวจสอบคำตอบ", score: 67 },
];

export const userYearDistribution = [
  { label: "ปี 1", value: 612, percent: 33, color: "#78bdd6" },
  { label: "ปี 2", value: 493, percent: 27, color: "#9ccfe0" },
  { label: "ปี 3", value: 421, percent: 23, color: "#e8a28e" },
  { label: "ปี 4+", value: 316, percent: 17, color: "#f1c9bc" },
];

export const taskStatusDistribution = [
  { label: "งานเสร็จแล้ว", value: 18_462, percent: 74, color: "#68b89d" },
  { label: "งานค้าง", value: 6_487, percent: 26, color: "#e89a86" },
];

export const examScores = [
  { exam: "กลางภาค", average: 72, highest: 96, lowest: 38 },
  { exam: "ปลายภาค", average: 76, highest: 98, lowest: 42 },
  { exam: "Quiz", average: 81, highest: 100, lowest: 51 },
  { exam: "Mock test", average: 68, highest: 92, lowest: 35 },
];

export const reviewMethods = [
  { label: "ทำข้อสอบย้อนหลัง", percent: 78 },
  { label: "ทบทวนด้วย Flashcard", percent: 66 },
  { label: "สรุปโน้ตด้วยตนเอง", percent: 59 },
  { label: "เรียนเป็นกลุ่ม", percent: 46 },
  { label: "ดูวิดีโอบทเรียน", percent: 41 },
];
