"use client";

import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  History,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GradeCode,
  InstructorGradingScheme,
  InstructorGradingSection,
  InstructorGradingWorkspaceResponse,
} from "@/interfaces/instructor-grading.interface";
import { instructorGradingService } from "@/services/instructor-grading.service";
import { formatDisplayDateTime } from "@/utils/dateTime";

const GRADE_CODES: GradeCode[] = ["A", "B+", "B", "C+", "C", "D+", "D", "F"];
const DEFAULT_MINIMUMS: Record<GradeCode, string> = {
  A: "80",
  "B+": "75",
  B: "70",
  "C+": "65",
  C: "60",
  "D+": "55",
  D: "50",
  F: "0",
};

const statusStyle: Record<InstructorGradingScheme["status"], string> = {
  draft: "bg-[#fff5df] text-[#a66f1f]",
  published: "bg-[#e6f6ee] text-[#3b8261]",
  archived: "bg-[#eef2f4] text-[#718088]",
};

const statusLabel: Record<InstructorGradingScheme["status"], string> = {
  draft: "ฉบับร่าง",
  published: "เผยแพร่แล้ว",
  archived: "เวอร์ชันเก่า",
};

const preferredScheme = (schemes: InstructorGradingScheme[]) =>
  schemes.find((scheme) => scheme.status === "draft") ??
  schemes.find((scheme) => scheme.status === "published") ??
  schemes[0];

const minimumsFromScheme = (
  scheme: InstructorGradingScheme | undefined,
): Record<GradeCode, string> => {
  const values = { ...DEFAULT_MINIMUMS };
  for (const boundary of scheme?.boundaries ?? []) {
    values[boundary.grade_code] = String(boundary.minimum_percentage);
  }
  return values;
};

export default function InstructorGradingClient() {
  const [workspace, setWorkspace] =
    useState<InstructorGradingWorkspaceResponse | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [minimums, setMinimums] =
    useState<Record<GradeCode, string>>(DEFAULT_MINIMUMS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"create" | "save" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const loadWorkspace = useCallback(
    async (preferredSectionId?: number, preferredSchemeId?: number) => {
      const response = await instructorGradingService.getWorkspace();
      setWorkspace(response);
      const nextSectionId =
        preferredSectionId ?? selectedSectionId ?? response.sections[0]?.section_id ?? null;
      setSelectedSectionId(nextSectionId);
      if (nextSectionId !== null) {
        const schemes = response.grading_schemes.filter(
          (scheme) => scheme.section_id === nextSectionId,
        );
        const nextScheme =
          schemes.find(
            (scheme) => scheme.grading_scheme_id === preferredSchemeId,
          ) ?? preferredScheme(schemes);
        setSelectedSchemeId(nextScheme?.grading_scheme_id ?? null);
        setMinimums(minimumsFromScheme(nextScheme));
      }
    },
    [selectedSectionId],
  );

  useEffect(() => {
    let active = true;
    instructorGradingService
      .getWorkspace()
      .then((response) => {
        if (!active) return;
        setWorkspace(response);
        const firstSection = response.sections[0];
        setSelectedSectionId(firstSection?.section_id ?? null);
        if (firstSection) {
          const schemes = response.grading_schemes.filter(
            (scheme) => scheme.section_id === firstSection.section_id,
          );
          const firstScheme = preferredScheme(schemes);
          setSelectedSchemeId(firstScheme?.grading_scheme_id ?? null);
          setMinimums(minimumsFromScheme(firstScheme));
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดเกณฑ์ตัดเกรดได้",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(() => workspace?.sections ?? [], [workspace]);
  const schemes = useMemo(
    () => workspace?.grading_schemes ?? [],
    [workspace],
  );
  const selectedSection = sections.find(
    (section) => section.section_id === selectedSectionId,
  );
  const sectionSchemes = useMemo(
    () =>
      schemes
        .filter((scheme) => scheme.section_id === selectedSectionId)
        .sort((left, right) => right.version - left.version),
    [schemes, selectedSectionId],
  );
  const selectedScheme = sectionSchemes.find(
    (scheme) => scheme.grading_scheme_id === selectedSchemeId,
  );
  const draftScheme = sectionSchemes.find((scheme) => scheme.status === "draft");
  const filteredSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    if (!query) return sections;
    return sections.filter((section) =>
      `${section.subject_id} ${section.subject_name} ${section.section_number}`
        .toLocaleLowerCase("th")
        .includes(query),
    );
  }, [search, sections]);

  const selectSection = (section: InstructorGradingSection) => {
    setSelectedSectionId(section.section_id);
    const nextSchemes = schemes
      .filter((scheme) => scheme.section_id === section.section_id)
      .sort((left, right) => right.version - left.version);
    const nextScheme = preferredScheme(nextSchemes);
    setSelectedSchemeId(nextScheme?.grading_scheme_id ?? null);
    setMinimums(minimumsFromScheme(nextScheme));
    setError("");
    setNotice("");
  };

  const boundariesPayload = () =>
    GRADE_CODES.map((gradeCode) => ({
      grade_code: gradeCode,
      minimum_percentage: Number(minimums[gradeCode]),
    }));

  const handleCreateDraft = async () => {
    if (!selectedSection) return;
    setBusyAction("create");
    setError("");
    setNotice("");
    try {
      const response = await instructorGradingService.createDraft(
        selectedSection.section_id,
      );
      await loadWorkspace(selectedSection.section_id, response.grading_scheme_id);
      window.dispatchEvent(new Event("instructor-grading-updated"));
      setNotice(response.message);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "สร้างฉบับร่างไม่สำเร็จ",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const saveDraft = async (showNotice = true) => {
    if (!selectedScheme || selectedScheme.status !== "draft") return false;
    const response = await instructorGradingService.updateDraft(
      selectedScheme.grading_scheme_id,
      { boundaries: boundariesPayload() },
    );
    await loadWorkspace(selectedSectionId ?? undefined, selectedScheme.grading_scheme_id);
    if (showNotice) {
      window.dispatchEvent(new Event("instructor-grading-updated"));
      setNotice(response.message);
    }
    return true;
  };

  const handleSave = async () => {
    setBusyAction("save");
    setError("");
    setNotice("");
    try {
      await saveDraft();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    if (!selectedScheme || selectedScheme.status !== "draft") return;
    setConfirmPublishOpen(false);
    setBusyAction("publish");
    setError("");
    setNotice("");
    try {
      await saveDraft(false);
      const response = await instructorGradingService.publish(
        selectedScheme.grading_scheme_id,
      );
      await loadWorkspace(selectedSectionId ?? undefined, selectedScheme.grading_scheme_id);
      window.dispatchEvent(new Event("instructor-grading-updated"));
      setNotice(response.message);
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : "Publish ไม่สำเร็จ",
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-[28px] border border-white/85 bg-white/80 text-[#66808b] shadow-sm">
        <LoaderCircle className="animate-spin text-[#5794aa]" size={32} />
        <p className="text-sm">กำลังโหลดเกณฑ์ตัดเกรด...</p>
      </div>
    );
  }

  if (!workspace && error) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-[28px] border border-[#efd8d2] bg-white/85 px-6 text-center">
        <span className="rounded-full bg-[#fff0ec] p-4 text-[#bd654f]"><AlertCircle size={27} /></span>
        <p className="mt-4 font-medium text-[#405862]">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-[#82939a]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-[0_18px_55px_rgba(74,111,132,0.1)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eeeafa] text-[#7567a9]"><Award size={25} strokeWidth={1.8} /></div>
            <p className="mt-5 text-sm font-medium text-[#6f65a0]">Grading Schemes</p>
            <h2 className="mt-1 text-2xl text-[#304b56]">เกณฑ์ตัดเกรด</h2>
            <p className="mt-2 text-sm leading-6 text-[#7a8b92]">สร้างฉบับร่าง กำหนดช่วงคะแนน A–F และเก็บประวัติทุก Version</p>
          </div>
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">ค้นหารายวิชา</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8298a1]" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารายวิชาหรือกลุ่มเรียน" className="h-12 w-full rounded-2xl border border-[#d5e3e7] bg-white pl-11 pr-4 text-sm text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" />
          </label>
        </div>
      </section>

      {sections.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfe0e6] bg-white/70 px-6 text-center">
          <BookOpen className="text-[#75a2b2]" size={32} />
          <p className="mt-3 font-medium text-[#405862]">ยังไม่มีกลุ่มเรียนที่ได้รับมอบหมาย</p>
          <p className="mt-1 text-sm text-[#82939a]">เกณฑ์ตัดเกรดจะสร้างได้หลังเจ้าหน้าที่มอบหมายรายวิชาให้อาจารย์</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-white/85 bg-white/80 p-3 shadow-sm">
            <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#78909a]">กลุ่มเรียนของฉัน</p>
            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {filteredSections.map((section) => {
                const active = section.section_id === selectedSectionId;
                const relatedSchemes = schemes.filter((scheme) => scheme.section_id === section.section_id);
                const published = relatedSchemes.find((scheme) => scheme.status === "published");
                const draft = relatedSchemes.find((scheme) => scheme.status === "draft");
                return (
                  <button key={section.section_id} type="button" onClick={() => selectSection(section)} className={`w-full rounded-[20px] border p-4 text-left transition ${active ? "border-[#b7dbe7] bg-[#ebf8fb] shadow-sm" : "border-transparent bg-[#f8fbfc] hover:border-[#dbe9ee] hover:bg-white"}`}>
                    <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-[#54879a]">{section.subject_id} · กลุ่ม {section.section_number}</span>{draft && <span className="size-2 rounded-full bg-[#e3a94a]" title="มีฉบับร่าง" />}</div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-[#3c535d]">{section.subject_name}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#82949c]"><span>ปี {section.academic_year} · เทอม {section.semester_no}</span><span>{published ? `ใช้ V${published.version}` : "ยังไม่ Publish"}</span></div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 rounded-[28px] border border-white/85 bg-white/85 p-5 shadow-[0_16px_48px_rgba(68,103,117,0.09)] sm:p-7">
            {selectedSection && (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#6f8f9b]">{selectedSection.subject_id} · กลุ่ม {selectedSection.section_number}</p>
                    <h3 className="mt-1 text-xl font-semibold text-[#304b56]">{selectedSection.subject_name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#edf6f8] px-3 py-1.5 text-[#547b89]">ปี {selectedSection.academic_year} · เทอม {selectedSection.semester_no}</span><span className={`rounded-full px-3 py-1.5 ${selectedSection.can_manage ? "bg-[#eeeafa] text-[#6c609d]" : "bg-[#f1f3f4] text-[#7a858a]"}`}>{selectedSection.can_manage ? "อาจารย์เจ้าของวิชา" : "ผู้สอนร่วม · ดูได้เท่านั้น"}</span></div>
                  </div>
                  {selectedSection.can_manage && !draftScheme && (
                    <button type="button" onClick={handleCreateDraft} disabled={busyAction !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#7468a8] px-4 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#665b99] disabled:cursor-not-allowed disabled:opacity-55">
                      {busyAction === "create" ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
                      {sectionSchemes.length ? "สร้าง Version ใหม่" : "สร้างเกณฑ์ฉบับร่าง"}
                    </button>
                  )}
                </div>

                {notice && <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-[#eaf7f0] px-4 py-3 text-sm text-[#3d7d61]"><CheckCircle2 size={18} />{notice}</p>}
                {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-2xl bg-[#fff0ed] px-4 py-3 text-sm text-[#b45c4a]"><AlertCircle size={18} />{error}</p>}

                {sectionSchemes.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#70858e]"><History size={16} />ประวัติ Version</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sectionSchemes.map((scheme) => (
                        <button key={scheme.grading_scheme_id} type="button" onClick={() => { setSelectedSchemeId(scheme.grading_scheme_id); setMinimums(minimumsFromScheme(scheme)); }} className={`rounded-2xl border px-3.5 py-2 text-xs font-medium transition ${scheme.grading_scheme_id === selectedSchemeId ? "border-[#91bdcc] bg-[#eaf7fa] text-[#477d90] shadow-sm" : "border-[#dce7ea] bg-white text-[#72838a] hover:border-[#bfd6de]"}`}>V{scheme.version}<span className={`ml-2 rounded-full px-2 py-0.5 ${statusStyle[scheme.status]}`}>{statusLabel[scheme.status]}</span></button>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedScheme ? (
                  <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cddfe5] bg-[#f8fbfc] px-6 text-center">
                    <Award className="text-[#739cab]" size={32} />
                    <p className="mt-3 font-medium text-[#405862]">ยังไม่มีเกณฑ์ตัดเกรด</p>
                    <p className="mt-1 max-w-md text-sm leading-6 text-[#82939a]">อาจารย์เจ้าของวิชาสามารถสร้างฉบับร่างแรกได้ ระบบจะใส่ค่าเริ่มต้น A 80, B+ 75 ไปจนถึง F 0</p>
                  </div>
                ) : (
                  <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e0eaed] bg-[#fbfdfe]">
                    <div className="flex flex-col gap-3 border-b border-[#e5edef] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div><div className="flex items-center gap-2"><h4 className="font-semibold text-[#39515b]">เกณฑ์ Version {selectedScheme.version}</h4><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyle[selectedScheme.status]}`}>{statusLabel[selectedScheme.status]}</span></div><p className="mt-1 text-xs text-[#89989e]">คะแนนขั้นต่ำของแต่ละเกรด · เต็ม 100 คะแนน</p></div>
                      {selectedScheme.status !== "draft" && <span className="inline-flex items-center gap-1.5 text-xs text-[#7b8b91]"><LockKeyhole size={15} />เวอร์ชันนี้ล็อกแล้ว</span>}
                    </div>

                    <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                      {GRADE_CODES.map((gradeCode, index) => {
                        const editable = selectedSection.can_manage && selectedScheme.status === "draft";
                        const previousMinimum = index === 0 ? 100.01 : Number(minimums[GRADE_CODES[index - 1]]);
                        const maximum = index === 0 ? 100 : Number.isFinite(previousMinimum) ? Math.max(0, previousMinimum - 0.01) : null;
                        return (
                          <label key={gradeCode} className={`rounded-[20px] border p-4 ${editable ? "border-[#d4e4e9] bg-white" : "border-[#e3e8ea] bg-[#f3f5f6]"}`}>
                            <span className="flex items-center justify-between"><strong className="flex size-10 items-center justify-center rounded-xl bg-[#eeeafa] text-lg text-[#6e62a0]">{gradeCode}</strong><span className="text-[11px] text-[#8b999f]">ถึง {maximum === null ? "–" : maximum.toFixed(2)}</span></span>
                            <span className="mt-3 block text-xs text-[#758890]">คะแนนขั้นต่ำ</span>
                            <div className="mt-1.5 flex items-center rounded-xl border border-[#d7e3e7] bg-white px-3 focus-within:border-[#7cb7cb] focus-within:ring-4 focus-within:ring-[#e2f3f8]">
                              <input type="number" min={0} max={100} step="0.01" value={minimums[gradeCode]} disabled={!editable || gradeCode === "F"} onChange={(event) => setMinimums((current) => ({ ...current, [gradeCode]: event.target.value }))} className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-[#405862] outline-none disabled:text-[#78878d]" />
                              <span className="text-xs text-[#8b999f]">%</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {selectedSection.can_manage && selectedScheme.status === "draft" && (
                      <div className="flex flex-col gap-3 border-t border-[#e3ecef] bg-white px-5 py-4 sm:flex-row sm:justify-end">
                        <button type="button" onClick={handleSave} disabled={busyAction !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#bfd8e1] bg-white px-5 text-sm font-medium text-[#4c7f91] transition hover:bg-[#f0f8fa] disabled:opacity-55">{busyAction === "save" ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}บันทึกฉบับร่าง</button>
                        <button type="button" onClick={() => setConfirmPublishOpen(true)} disabled={busyAction !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#5f9279] px-5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4f8169] disabled:opacity-55">{busyAction === "publish" ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}Publish Version {selectedScheme.version}</button>
                      </div>
                    )}
                    {selectedScheme.status === "published" && selectedScheme.published_at && (
                      <div className="flex items-center gap-2 border-t border-[#e3ecef] bg-[#f5fbf8] px-5 py-3 text-xs text-[#5f7e6f]"><Clock3 size={15} />เผยแพร่เมื่อ {formatDisplayDateTime(selectedScheme.published_at)}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {confirmPublishOpen && selectedScheme?.status === "draft" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#29414b]/45 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="publish-grading-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busyAction === null) {
              setConfirmPublishOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 text-center shadow-[0_28px_80px_rgba(31,61,72,0.25)] sm:p-7">
            <span className="mx-auto flex size-16 items-center justify-center rounded-[22px] bg-[#e8f5ee] text-[#55856e]"><Send size={28} /></span>
            <h3 id="publish-grading-title" className="mt-5 text-xl font-semibold text-[#334c56]">Publish เกณฑ์ Version {selectedScheme.version}?</h3>
            <p className="mt-2 text-sm leading-6 text-[#71838b]">ระบบจะบันทึกค่าล่าสุดและเผยแพร่ให้เป็นเกณฑ์ที่ใช้งานอยู่ หลังจากนั้นจะไม่สามารถแก้ไข Version นี้ได้</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmPublishOpen(false)} disabled={busyAction !== null} className="rounded-2xl bg-[#edf3f5] px-4 py-3 text-sm font-medium text-[#60757e] transition hover:bg-[#e2ecef] disabled:opacity-50">ยกเลิก</button>
              <button type="button" onClick={handlePublish} disabled={busyAction !== null} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#5f9279] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#4f8169] disabled:opacity-55">{busyAction === "publish" ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}{busyAction === "publish" ? "กำลัง Publish..." : "ยืนยัน Publish"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
