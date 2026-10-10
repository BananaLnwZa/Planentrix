"use client";

import {
  AlertCircle,
  Download,
  Eye,
  FileCheck2,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const EXAM_TEMPLATE_PATH = "/examples/exam-import-template.docx";

export default function InstructorExamTemplateGuide() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPreviewOpen) return;

    const container = previewContainerRef.current;
    if (!container) return;

    let cancelled = false;

    const renderPreview = async () => {
      setIsPreviewLoading(true);
      setPreviewError("");
      container.innerHTML = "";

      try {
        const response = await fetch(EXAM_TEMPLATE_PATH, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Template request failed with status ${response.status}`);
        }

        const documentData = await response.arrayBuffer();
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;

        await renderAsync(documentData, container, undefined, {
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          inWrapper: true,
          renderEndnotes: true,
          renderFooters: true,
          renderFootnotes: true,
          renderHeaders: true,
          useBase64URL: true,
        });
      } catch (error) {
        console.error("Unable to render exam template preview", error);
        if (!cancelled) {
          setPreviewError("ไม่สามารถแสดงตัวอย่างไฟล์ได้ กรุณาดาวน์โหลดไฟล์เพื่อเปิดดู");
        }
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    };

    void renderPreview();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [isPreviewOpen]);

  return (
    <>
      <section className="rounded-[26px] border border-[#d7e7ec] bg-[linear-gradient(135deg,#ffffff_0%,#f3fafc_100%)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#dff1f6] text-[#4b879c]">
              <FileCheck2 aria-hidden="true" size={23} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5e91a3]">
                Exam file format
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[#304b56]">
                ตัวอย่างรูปแบบไฟล์ข้อสอบ
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#758890]">
                เปิดดูไฟล์ตัวอย่างจริงก่อนนำเข้าข้อสอบ หรือดาวน์โหลดไปแก้ไขเป็นไฟล์ของรายวิชา
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#a9ccd8] bg-white px-5 text-sm font-medium text-[#427c91] transition hover:-translate-y-0.5 hover:bg-[#edf8fb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5]"
            >
              <Eye aria-hidden="true" size={17} />
              ดูตัวอย่าง
            </button>
            <a
              href={EXAM_TEMPLATE_PATH}
              download="ตัวอย่างรูปแบบไฟล์ข้อสอบ.docx"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#5794aa] px-5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#477f93] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe7ef]"
            >
              <Download aria-hidden="true" size={17} />
              ดาวน์โหลดไฟล์
            </a>
          </div>
        </div>
      </section>

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#243b45]/45 p-3 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-template-preview-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPreviewOpen(false);
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/75 bg-white shadow-[0_28px_80px_rgba(28,54,65,0.25)]">
            <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5e91a3]">
                  File preview
                </p>
                <h3
                  id="exam-template-preview-title"
                  className="mt-1 text-xl font-semibold text-[#304b56]"
                >
                  ตัวอย่างไฟล์ข้อสอบ
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#758890]">
                  ตัวอย่างนี้อ่านจากไฟล์เดียวกับปุ่มดาวน์โหลด
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                aria-label="ปิดตัวอย่างไฟล์"
                className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5]"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-auto border-y border-[#d5e1e5] bg-[#dfe7eb] p-3 sm:p-6">
              {isPreviewLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#dfe7eb]/90">
                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#58717c] shadow-sm">
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={19} />
                    กำลังเปิดไฟล์ตัวอย่าง...
                  </div>
                </div>
              )}

              {previewError && (
                <div className="mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-[#efcfc8] bg-white p-5 text-sm leading-6 text-[#9a5145] shadow-sm">
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
                  <span>{previewError}</span>
                </div>
              )}

              <div
                ref={previewContainerRef}
                className="mx-auto w-fit min-w-full [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="h-11 rounded-full px-5 text-sm font-medium text-[#687b84] transition hover:bg-[#eef4f6]"
              >
                ปิด
              </button>
              <a
                href={EXAM_TEMPLATE_PATH}
                download="ตัวอย่างรูปแบบไฟล์ข้อสอบ.docx"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#5794aa] px-5 text-sm font-medium text-white transition hover:bg-[#477f93] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe7ef]"
              >
                <Download aria-hidden="true" size={17} />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
