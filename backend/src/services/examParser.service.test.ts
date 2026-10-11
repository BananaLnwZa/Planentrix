import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseDocxExamFile, parseExamHtml } from "./examParser.service";

test("bundled Word template parses five questions, scores, answers and images", async () => {
  const template = path.resolve(
    __dirname,
    "../../../frontend/web/admin/public/examples/exam-import-template.docx",
  );
  const backendRoot = path.resolve(__dirname, "../..");
  const root = fs.mkdtempSync(path.join(backendRoot, ".exam-parser-test-"));
  const dirs = {
    questionDir: path.join(root, "questions"),
    choiceDir: path.join(root, "choices"),
  };
  try {
    const { questions } = await parseDocxExamFile(template, dirs);
    assert.equal(questions.length, 5);
    assert.deepEqual(questions.map((question) => question.score ?? 1), [1, 2, 1, 2, 1]);
    assert.ok(questions.every((question) => !/\(\d+(?:\.\d+)? คะแนน\)/.test(question.question_text)));
    assert.deepEqual(questions.map((question) => question.choices.length), [4, 4, 4, 4, 4]);
    assert.ok(questions.every((question) => question.choices.filter((choice) => choice.is_correct).length === 1));
    assert.ok(questions[3].question_image_path?.startsWith("questions/"));
    assert.equal(questions[4].choices.filter((choice) => choice.choice_image_path?.startsWith("choices/")).length, 4);
    assert.equal(fs.readdirSync(dirs.questionDir).length, 1);
    assert.equal(fs.readdirSync(dirs.choiceDir).length, 4);
  } finally {
    assert.ok(path.resolve(root).startsWith(`${backendRoot}${path.sep}`));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("HTML parser preserves image-only choices", () => {
  const questions = parseExamHtml('<p>1. รูปใดถูกต้อง</p><p>ก. <img src="first.png"/></p><p>*ข. <img src="second.png"/></p>');
  assert.equal(questions.length, 1);
  assert.equal(questions[0].choices.length, 2);
  assert.equal(questions[0].choices[1].choice_image_path, "second.png");
  assert.equal(questions[0].choices[1].is_correct, true);
});
