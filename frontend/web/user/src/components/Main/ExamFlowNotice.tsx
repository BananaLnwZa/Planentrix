"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BellRing } from "lucide-react";
import type { TermWorkflow } from "@/interfaces/term.interface";

const copy: Record<string, { title: string; detail: string; action?: string; route?: string }> = {
  midterm_3w: { title: "เตรียมสอบกลางภาค · 3 สัปดาห์", detail: "สัปดาห์หน้าจะมีแบบทดสอบและคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบกลางภาค" },
  midterm_2w: { title: "เตรียมสอบกลางภาค · 2 สัปดาห์", detail: "ทำแบบทดสอบและตรวจคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบ", action: "ไปทำแบบทดสอบ", route: "/Test" },
  midterm_1w: { title: "เตรียมสอบกลางภาค · 1 สัปดาห์", detail: "ทำแบบทดสอบเพื่อวัดผลเท่านั้น รอบนี้ไม่มีคำแนะนำจัดตาราง", action: "ไปทำแบบทดสอบ", route: "/Test" },
  final_3w: { title: "เตรียมสอบปลายภาค · 3 สัปดาห์", detail: "สัปดาห์หน้าจะมีแบบทดสอบและคำแนะนำจัดตารางรอบสุดท้าย กรุณากรอกภาระงานและคะแนนเก็บของทุกรายวิชาให้ครบ", action: "ตรวจภาระงาน", route: "/Score&Homework" },
  final_2w: { title: "เตรียมสอบปลายภาค · 2 สัปดาห์", detail: "ทำแบบทดสอบและตรวจคำแนะนำจัดตารางรอบสุดท้ายก่อนสอบ", action: "ไปทำแบบทดสอบ", route: "/Test" },
  final_1w: { title: "เตรียมสอบปลายภาค · 1 สัปดาห์", detail: "ทำแบบทดสอบเพื่อวัดผลเท่านั้น ปิดการเพิ่ม/แก้ไขภาระงานและคะแนนแล้ว", action: "ไปทำแบบทดสอบ", route: "/Test" },
};

export default function ExamFlowNotice({ workflow }: { workflow: TermWorkflow }) {
  const router = useRouter();
  const notice = workflow.initial_final_test_pending && workflow.phase === "final_3w"
    ? { title: "เริ่มเตรียมสอบปลายภาค", detail: "ทำแบบทดสอบปลายภาคครั้งแรกให้ครบทุกวิชา และกรอกภาระงาน/คะแนนเก็บให้ครบ; สัปดาห์หน้าจะมีรอบสุดท้ายก่อนสอบ", action: "ไปทำแบบทดสอบ", route: "/Test" }
    : copy[workflow.phase];
  if (!notice) return null;
  return <section className="flex w-full shrink-0 items-center gap-3 rounded-xl border border-[#CFE4ED] bg-[#F2FAFD] px-3 py-2.5 text-[#587889]">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6CAFD0]"><BellRing className="h-4 w-4" /></span>
    <div className="min-w-0 flex-1">
      <h2 className="text-xs font-semibold">{notice.title}</h2>
      <p className="mt-0.5 text-[10px] leading-4 text-[#7895A2]">{notice.detail}</p>
    </div>
    {notice.action && notice.route && <button type="button" onClick={() => router.push(notice.route!)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#8BC9E5] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#70B9D9]">{notice.action}<ArrowRight className="h-3 w-3" /></button>}
  </section>;
}
