"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BellRing } from "lucide-react";
import type { TermWorkflow } from "@/interfaces/term.interface";

const copy: Record<string, { title: string; detail: string; action?: string; route?: string }> = {
  midterm_post: { title: "เริ่มแบบทดสอบปลายภาค", detail: "ทำแบบทดสอบปลายภาคครั้งแรกให้ครบทุกวิชาที่มีข้อสอบ เพื่อเริ่มนัด checkpoint รอบใหม่", action: "ไปทำแบบทดสอบ", route: "/Test" },
  midterm_3w: { title: "เตรียมสอบกลางภาค · 3 สัปดาห์", detail: "สัปดาห์หน้าจะมีแบบทดสอบและคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบกลางภาค" },
  midterm_2w: { title: "เตรียมสอบกลางภาค · 2 สัปดาห์", detail: "ทำแบบทดสอบและตรวจคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบ", action: "ไปทำแบบทดสอบ", route: "/Test" },
  midterm_1w: { title: "เตรียมสอบกลางภาค · 1 สัปดาห์", detail: "ทำแบบทดสอบเพื่อวัดผลเท่านั้น รอบนี้ไม่มีคำแนะนำจัดตาราง", action: "ไปทำแบบทดสอบ", route: "/Test" },
  final_3w: { title: "เตรียมสอบปลายภาค · 3 สัปดาห์", detail: "สัปดาห์หน้าจะมีแบบทดสอบและคำแนะนำจัดตารางรอบสุดท้าย กรุณากรอกภาระงานและคะแนนเก็บของทุกรายวิชาให้ครบ", action: "ตรวจภาระงาน", route: "/Score&Homework" },
  final_2w: { title: "เตรียมสอบปลายภาค · 2 สัปดาห์", detail: "ทำแบบทดสอบรับคำแนะนำรอบสุดท้าย และกรอกภาระงาน/คะแนนเก็บทุกวิชาให้ครบ", action: "ไปทำแบบทดสอบ", route: "/Test" },
  final_1w: { title: "เตรียมสอบปลายภาค · 1 สัปดาห์", detail: "ทำแบบทดสอบเพื่อวัดผลเท่านั้น ปิดการเพิ่ม/แก้ไขภาระงานและคะแนนแล้ว", action: "ไปทำแบบทดสอบ", route: "/Test" },
};

export default function ExamFlowNotice({ workflow }: { workflow: TermWorkflow }) {
  const router = useRouter();
  const assessmentPending = workflow.assessment_pending !== false;
  if (workflow.phase === "midterm_post" && !workflow.initial_final_test_pending) return null;
  if ((workflow.phase === "midterm_2w" || workflow.phase === "midterm_1w" || workflow.phase === "final_1w") && !assessmentPending) return null;
  const notice = workflow.phase === "final_2w" && !assessmentPending
    ? { ...copy.final_2w, detail: "ทำแบบทดสอบครบแล้ว กรุณากรอกภาระงานและคะแนนเก็บทุกวิชาให้ครบ", action: "ไปหน้าภาระงาน", route: "/Score&Homework" }
    : copy[workflow.phase];
  if (!notice) return null;
  const compact = workflow.phase === "final_2w" || workflow.phase === "midterm_1w" || workflow.phase === "final_1w";
  return <section className={`w-full shrink-0 rounded-xl border border-[#CFE4ED] bg-[#F2FAFD] text-[#587889] ${compact ? "grid grid-cols-[28px_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 px-2.5 py-1.5" : "flex items-center gap-3 px-3 py-2.5"}`}>
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-white text-[#6CAFD0] ${compact ? "row-span-2 h-7 w-7" : "h-8 w-8"}`}><BellRing className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /></span>
    <div className={compact ? "contents" : "min-w-0 flex-1"}>
      <h2 className={`${compact ? "col-span-2 col-start-2 row-start-1 text-[11px] leading-4 md:whitespace-nowrap" : "text-xs"} font-semibold`}>{notice.title}</h2>
      <p className={`${compact ? "col-start-2 row-start-2 min-w-0 text-[10px] leading-[13px]" : "mt-0.5 text-[10px] leading-4"} text-[#7895A2]`}>{notice.detail}</p>
    </div>
    {notice.action && notice.route && <button type="button" onClick={() => router.push(notice.route!)} className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#8BC9E5] font-semibold text-white hover:bg-[#70B9D9] ${compact ? "col-start-3 row-start-2 px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[10px]"}`}>{notice.action}<ArrowRight className="h-3 w-3" /></button>}
  </section>;
}
