import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PDFParse } from "pdf-parse";

export interface ParsedChoice {
  choice_text: string;
  choice_image_path: string | null;
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
        choice_image_path: imgSrc,
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

  const writtenImages: string[] = [];
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

          fs.writeFileSync(
            path.join(outputImageDir, filename),
            Buffer.from(buffer, "base64")
          );
          writtenImages.push(filename);
          return { src: filename };
        }),
      }
    );

    const questions = parseExamHtml(result.value);
    const referencedImages = new Set(
      questions.flatMap((question) => [
        question.question_image_path,
        ...question.choices.map((choice) => choice.choice_image_path),
      ]).filter((imagePath): imagePath is string => Boolean(imagePath)),
    );
    for (const filename of writtenImages) {
      if (referencedImages.has(filename)) continue;
      try {
        fs.unlinkSync(path.join(outputImageDir, filename));
      } catch {
        // Orphan cleanup is best effort; parsing itself still succeeded.
      }
    }
    return { questions, warnings: result.messages };
  } catch (error) {
    for (const filename of writtenImages) {
      try {
        fs.unlinkSync(path.join(outputImageDir, filename));
      } catch {
        // Best-effort cleanup; keep the original parsing error.
      }
    }
    throw error;
  }
}

// ==========================================================================
// อ่านไฟล์ .pdf (ใช้ pdf-parse) พร้อมดักจับข้อผิดพลาด (Error Handling)
// ==========================================================================
export async function parsePdfExamFile(filePath: string, outputImageDir: string) {
  if (!fs.existsSync(outputImageDir)) {
    fs.mkdirSync(outputImageDir, { recursive: true });
  }

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
      .map((line: string) => `<p>${line}</p>`)
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
