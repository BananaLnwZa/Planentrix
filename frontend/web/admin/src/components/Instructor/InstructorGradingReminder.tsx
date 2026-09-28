"use client";

import { ArrowRight, BellRing, FilePenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InstructorGradingSection,
  InstructorGradingWorkspaceResponse,
} from "@/interfaces/instructor-grading.interface";
import { instructorGradingService } from "@/services/instructor-grading.service";

interface PendingGradingSection extends InstructorGradingSection {
  hasDraft: boolean;
}

export default function InstructorGradingReminder() {
  const pathname = usePathname();
  const [workspace, setWorkspace] =
    useState<InstructorGradingWorkspaceResponse | null>(null);

  const loadReminder = useCallback(async () => {
    try {
      setWorkspace(await instructorGradingService.getWorkspace());
    } catch {
      // A reminder must not block the instructor workspace if the request fails.
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => void loadReminder(), 0);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadReminder();
    };
    const handleGradingUpdate = () => void loadReminder();
    const intervalId = window.setInterval(loadReminder, 60_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("instructor-grading-updated", handleGradingUpdate);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "instructor-grading-updated",
        handleGradingUpdate,
      );
    };
  }, [loadReminder]);

  const pendingSections = useMemo<PendingGradingSection[]>(() => {
    if (!workspace) return [];
    return workspace.sections
      .filter((section) => section.can_manage)
      .filter(
        (section) =>
          !workspace.grading_schemes.some(
            (scheme) =>
              scheme.section_id === section.section_id &&
              scheme.status === "published",
          ),
      )
      .map((section) => ({
        ...section,
        hasDraft: workspace.grading_schemes.some(
          (scheme) =>
            scheme.section_id === section.section_id && scheme.status === "draft",
        ),
      }));
  }, [workspace]);

  if (pathname === "/Instructor/Grading" || pendingSections.length === 0) {
    return null;
  }

  const preview = pendingSections.slice(0, 2);
  const remaining = pendingSections.length - preview.length;

  return (
    <aside
      className="mx-auto mt-4 w-full max-w-6xl overflow-hidden rounded-[24px] border border-[#f0d9a5] bg-[linear-gradient(135deg,#fffaf0_0%,#fff6e3_55%,#f8f1ff_100%)] shadow-[0_14px_38px_rgba(151,111,48,0.12)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#c4892c] shadow-[0_7px_20px_rgba(177,126,44,0.14)]">
          <BellRing size={23} strokeWidth={1.9} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#604f38]">
              มี {pendingSections.length} กลุ่มเรียนที่รอกำหนดเกณฑ์ตัดเกรด
            </p>
            <span className="rounded-full bg-[#f3dfb4] px-2.5 py-1 text-[11px] font-semibold text-[#94661f]">
              ต้องดำเนินการ
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#826f55]">
            {preview.map((section) => (
              <span key={section.section_id} className="inline-flex items-center gap-1.5">
                <FilePenLine size={13} aria-hidden="true" />
                {section.subject_id} กลุ่ม {section.section_number}
                {section.hasDraft ? " · Draft ยังไม่ Publish" : " · ยังไม่ได้สร้างเกณฑ์"}
              </span>
            ))}
            {remaining > 0 && <span>และอีก {remaining} กลุ่มเรียน</span>}
          </div>
        </div>

        <Link
          href="/Instructor/Grading"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#b98332] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(163,111,35,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a87329] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#eedcb9]"
        >
          ไปกำหนดเกณฑ์
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
