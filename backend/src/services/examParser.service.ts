import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PDFParse } from "pdf-parse";

export interface ImageOutputDirs {
  questionDir: string;
  choiceDir: string;
}

export interface ParsedChoice {
  choice_text: string;
  choice_image_path: string | null;
  is_correct: boolean;
}

export interface ParsedQuestion {
  question_text: string;
  question_image_path: string | null;
  choices: ParsedChoice[];
  score?: number;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function getImgSrc(html: string): string | null {
  const match = html.match(/<img[^>]*src="([^"]+)"/);
  return match ? match[1] : null;
}

function ensureDirs(dirs: ImageOutputDirs) {
  for (const dir of [dirs.questionDir, dirs.choiceDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// ==========================================================================
// ฟังก์ชันแยกโจทย์, ตัวเลือก, เฉลย (*), และรูปภาพจาก HTML
// ==========================================================================
export function parseExamHtml(html: string): ParsedQuestion[] {
  // แตก HTML เป็นบล็อก: ย่อหน้า <p> (แยกตาม <br> / Shift+Enter) และรายการ <li> ใน <ol>/<ul>
  // mammoth ไม่ส่งตัวอักษร/ตัวเลขของ Word Numbering มาให้ จึงต้องจำว่าบล็อกไหนมาจากรายการ
  const paragraphs: { html: string; fromList: boolean }[] = [];
  const blockRegex = /<(ol|ul)[^>]*>([\s\S]*?)<\/\1>|<p[^>]*>([\s\S]*?)<\/p>/gi;
  for (const m of html.matchAll(blockRegex)) {
    if (m[1]) {
      for (const li of m[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        paragraphs.push({ html: li[1], fromList: true });
      }
    } else {
      for (const part of m[3].split(/<br\s*\/?>/i)) {
        paragraphs.push({ html: part, fromList: false });
      }
    }
  }

  const questions: ParsedQuestion[] = [];
  let currentQuestion: ParsedQuestion | null = null;

  const questionPattern = /^\s*(\d+)[\.\)]\s*(.*)$/;
  // ตัวเลือกที่รองรับ (มีเครื่องหมาย * นำหน้าได้ = เฉลย):
  //  - ไทย มีตัวคั่น:     ก.  ก)  (ก)
  //  - ละติน มีตัวคั่น:    a.  a)  (a)  ต้องมีช่องว่างตามหลัง เพื่อไม่ชนกับ "e.g." เป็นต้น
  //  - ไทย ไม่มีตัวคั่น:   "ก โปรแกรม"
  // ละตินที่ไม่มีตัวคั่น (เช่น "a few", "A database is...") จะไม่ถือเป็นตัวเลือก
  // groups: 1=* 2=ไทยมีตัวคั่น 3=ละตินมีตัวคั่น 4=ไทยไม่มีตัวคั่น 5=ข้อความ
  const choicePattern =
    /^\s*(\*?)\s*(?:\(?([ก-ง])[\.\)]\s*|\(?([a-eA-E])[\.\)]\s+|([ก-ง])\s+)(.+)$/;

  for (const { html: p, fromList } of paragraphs) {
    const imgSrc = getImgSrc(p);
    const text = stripTags(p);

    // เช็กตัวเลือกก่อนโจทย์ เพื่อไม่ให้ตัวเลือกที่ขึ้นต้นด้วยตัวเลขถูกมองเป็นโจทย์
    const choiceMatch = text.match(choicePattern);
    const questionMatch = choiceMatch ? null : text.match(questionPattern);

    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      const rawQuestionText = questionMatch[2].trim();
      let score: number | undefined;

      const scoreMatch = rawQuestionText.match(
        /[\(\[]\s*(\d+(?:\.\d+)?)\s*(?:คะแนน|points?|pts?)\s*[\)\]]/i
      );
      if (scoreMatch) {
        const parsedVal = parseFloat(scoreMatch[1]);
        if (!isNaN(parsedVal) && parsedVal > 0) {
          score = parsedVal;
        }
      }

      currentQuestion = {
        question_text: rawQuestionText,
        question_image_path: imgSrc,
        choices: [],
        score,
      };
    } else if (choiceMatch && currentQuestion) {
      const isCorrect = choiceMatch[1] === "*";
      currentQuestion.choices.push({
        choice_text: choiceMatch[5].trim(),
        choice_image_path: imgSrc,
        is_correct: isCorrect,
      });
    } else if (fromList && currentQuestion && (text || imgSrc)) {
      // ตัวเลือกจาก Word Numbering: ไม่มีตัวอักษรนำหน้าในข้อความ
      // เฉลยยังใช้เครื่องหมาย * นำหน้าข้อความตามเดิม
      currentQuestion.choices.push({
        choice_text: text.replace(/^\s*\*\s*/, ""),
        choice_image_path: imgSrc,
        is_correct: /^\s*\*/.test(text),
      });
    } else if (currentQuestion && imgSrc && !choiceMatch) {
      if (!currentQuestion.question_image_path) {
        currentQuestion.question_image_path = imgSrc;
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

// ==========================================================================
// อ่านไฟล์ .docx (ใช้ mammoth)
// รูปทุกรูปถูกเขียนลง questionDir ก่อน (ตอนนั้นยังไม่รู้ว่าเป็นรูปโจทย์หรือตัวเลือก)
// หลัง parse เสร็จ รูปของตัวเลือกจะถูกย้ายไป choiceDir
// path ที่คืนกลับมาเป็นแบบ "questions/xxx.ext" และ "choices/xxx.ext"
// ==========================================================================
export async function parseDocxExamFile(filePath: string, dirs: ImageOutputDirs) {
  ensureDirs(dirs);

  // เก็บ absolute path ของรูปทุกไฟล์ที่เขียนไว้ เพื่อใช้ลบทิ้งเมื่อเกิดข้อผิดพลาด
  const writtenImages = new Set<string>();

  try {
    const result = await mammoth.convertToHtml(
      { path: filePath },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const buffer = await image.readAsBase64String();
          const extensionByMimeType: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/gif": "gif",
            "image/webp": "webp",
          };
          const extension = extensionByMimeType[image.contentType];
          if (!extension) {
            throw new Error(`Unsupported embedded image type: ${image.contentType}`);
          }
          const filename = `question_${randomUUID()}.${extension}`;
          const fullPath = path.join(dirs.questionDir, filename);

          fs.writeFileSync(fullPath, Buffer.from(buffer, "base64"));
          writtenImages.add(fullPath);
          return { src: filename };
        }),
      }
    );

    const questions = parseExamHtml(result.value);
    const keepFiles = new Set<string>();

    for (const question of questions) {
      // รูปโจทย์: คงอยู่ใน questionDir
      if (question.question_image_path) {
        keepFiles.add(path.join(dirs.questionDir, question.question_image_path));
        question.question_image_path = `questions/${question.question_image_path}`;
      }

      // รูปตัวเลือก: ย้ายไป choiceDir และเปลี่ยนชื่อขึ้นต้นเป็น choice_
      for (const choice of question.choices) {
        if (!choice.choice_image_path) continue;

        const from = path.join(dirs.questionDir, choice.choice_image_path);
        const newName = choice.choice_image_path.replace(/^question_/, "choice_");
        const to = path.join(dirs.choiceDir, newName);

        fs.renameSync(from, to);
        writtenImages.delete(from);
        writtenImages.add(to);
        keepFiles.add(to);

        choice.choice_image_path = `choices/${newName}`;
      }
    }

    // ลบรูปที่เขียนไว้แต่ไม่ได้ถูกอ้างอิงโดยโจทย์หรือตัวเลือกใด ๆ
    for (const file of writtenImages) {
      if (keepFiles.has(file)) continue;
      try {
        fs.unlinkSync(file);
      } catch {
        // Orphan cleanup is best effort; parsing itself still succeeded.
      }
    }

    return { questions, warnings: result.messages };
  } catch (error) {
    for (const file of writtenImages) {
      try {
        fs.unlinkSync(file);
      } catch {
        // Best-effort cleanup; keep the original parsing error.
      }
    }
    throw error;
  }
}

// ==========================================================================
// อ่านไฟล์ .pdf (ใช้ pdf-parse) พร้อมดักจับข้อผิดพลาด (Error Handling)
// หมายเหตุ: ฟังก์ชันนี้ดึงเฉพาะข้อความ ไม่ได้แตกรูปจาก PDF
// ==========================================================================
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function parsePdfExamFile(filePath: string, dirs: ImageOutputDirs) {
  ensureDirs(dirs);

  let parser: PDFParse | null = null;

  try {
    const dataBuffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();

    if (!pdfData || !pdfData.text) {
      return { questions: [], warnings: ["Cannot extract text from this PDF file."] };
    }

    const formattedHtml = pdfData.text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => `<p>${escapeHtml(line)}</p>`)
      .join("");

    const questions = parseExamHtml(formattedHtml);
    return { questions, warnings: [] };
  } catch (error: unknown) {
    console.error("parsePdfExamFile Error:", error);
    const message = error instanceof Error
      ? error.message
      : "Failed to parse PDF file.";
    return { questions: [], warnings: [message] };
  } finally {
    await parser?.destroy();
  }
}