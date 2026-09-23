import mammoth from "mammoth";
import fs from "fs";
import path from "path";

// แก้ไขปัญหา Type Definition ของ pdf-parse ใน TypeScript
const pdfParse = require("pdf-parse");

export interface ParsedChoice {
  choice_text: string;
  choice_image: string | null;
  is_correct: boolean;
}

export interface ParsedQuestion {
  question_text: string;
  question_image_path: string | null;
  choices: ParsedChoice[];
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function getImgSrc(html: string): string | null {
  const match = html.match(/<img[^>]*src="([^"]+)"/);
  return match ? match[1] : null;
}

// ==========================================================================
// ฟังก์ชันแยกโจทย์, ตัวเลือก, เฉลย (*), และรูปภาพจาก HTML
// ==========================================================================
export function parseExamHtml(html: string): ParsedQuestion[] {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(
    (m) => m[1]
  );

  const questions: ParsedQuestion[] = [];
  let currentQuestion: ParsedQuestion | null = null;

  const questionPattern = /^(\d+)\.\s*(.*)$/;
  // รองรับทั้ง ก-ฮ และ A-D
  const choicePattern = /^(\*?)([ก-ฮa-dA-D])\.\s*(.*)$/;

  for (const p of paragraphs) {
    const imgSrc = getImgSrc(p);
    const text = stripTags(p);

    const questionMatch = text.match(questionPattern);
    const choiceMatch = text.match(choicePattern);

    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        question_text: questionMatch[2].trim(),
        question_image_path: imgSrc,
        choices: [],
      };
    } else if (choiceMatch && currentQuestion) {
      const isCorrect = choiceMatch[1] === "*";
      currentQuestion.choices.push({
        choice_text: choiceMatch[3].trim(),
        choice_image: imgSrc,
        is_correct: isCorrect,
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
// ==========================================================================
export async function parseDocxExamFile(filePath: string, outputImageDir: string) {
  if (!fs.existsSync(outputImageDir)) {
    fs.mkdirSync(outputImageDir, { recursive: true });
  }

  let imageCounter = 0;

  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageCounter++;
        const buffer = await image.readAsBase64String();
        const extension = image.contentType.split("/")[1] || "png";
        const filename = `exam_img_${Date.now()}_${imageCounter}.${extension}`;

        fs.writeFileSync(
          path.join(outputImageDir, filename),
          Buffer.from(buffer, "base64")
        );

        return { src: filename };
      }),
    }
  );

  const questions = parseExamHtml(result.value);
  return { questions, warnings: result.messages };
}

// ==========================================================================
// อ่านไฟล์ .pdf (ใช้ pdf-parse) พร้อมดักจับข้อผิดพลาด (Error Handling)
// ==========================================================================
export async function parsePdfExamFile(filePath: string, outputImageDir: string) {
  if (!fs.existsSync(outputImageDir)) {
    fs.mkdirSync(outputImageDir, { recursive: true });
  }

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);

    if (!pdfData || !pdfData.text) {
      return { questions: [], warnings: ["Cannot extract text from this PDF file."] };
    }

    const formattedHtml = pdfData.text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => `<p>${line}</p>`)
      .join("");

    const questions = parseExamHtml(formattedHtml);
    return { questions, warnings: [] };
  } catch (error: any) {
    console.error("parsePdfExamFile Error:", error);
    return { questions: [], warnings: [error.message || "Failed to parse PDF file."] };
  }
}
