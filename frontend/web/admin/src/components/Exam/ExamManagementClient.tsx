"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, RefreshCw, X } from "lucide-react";
import { ExamPayload, ExamSubjectOption, ExamSummary } from "@/interfaces/exam-management.interface";
import { examManagementService } from "@/services/exam-management.service";
import ExamDetailModal from "./ExamDetailModal";
import ExamFormModal from "./ExamFormModal";
import ExamHierarchy from "./ExamHierarchy";
import ExamSummaryCards from "./ExamSummaryCards";
import ExamToolbar from "./ExamToolbar";

const sortExams = (exams: ExamSummary[]) => [...exams].sort((first, second) => first.academic_year - second.academic_year || first.term - second.term || first.exam_repository_id - second.exam_repository_id);

export default function ExamManagementClient() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [subjects, setSubjects] = useState<ExamSubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamSummary | null>(null);
  const [detailExamId, setDetailExamId] = useState<number | null>(null);

  const loadExams = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try { const response = await examManagementService.getExams(); setExams(sortExams(response.exams)); setSubjects(response.subjects); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดชุดข้อสอบได้"); }
    finally { if (showLoading) setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    examManagementService.getExams().then((response) => { if (active) { setExams(sortExams(response.exams)); setSubjects(response.subjects); } }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดชุดข้อสอบได้"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredExams = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return exams.filter((exam) => {
      const matchesSearch = !query || exam.exam_name.toLocaleLowerCase().includes(query) || exam.subject_id.toLocaleLowerCase().includes(query) || exam.subject_name.toLocaleLowerCase().includes(query);
      const matchesSubject = selectedSubject === "all" || exam.subject_id === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [exams, search, selectedSubject]);

  const saveExam = async (payload: ExamPayload) => {
    const response = editingExam ? await examManagementService.updateExam(editingExam.exam_repository_id, payload) : await examManagementService.createExam(payload);
    setExams((current) => sortExams(editingExam ? current.map((exam) => exam.exam_repository_id === response.exam.exam_repository_id ? response.exam : exam) : [...current, response.exam]));
    setNotice(`${editingExam ? "บันทึก" : "เพิ่ม"}ชุดข้อสอบ “${response.exam.exam_name}” แล้ว`);
    setFormOpen(false); setEditingExam(null);
  };

  return (
    <>
      <div className="mt-7"><ExamSummaryCards exams={exams} /></div>
      <div className="mt-5"><ExamToolbar search={search} selectedSubject={selectedSubject} subjects={subjects} resultCount={filteredExams.length} onSearchChange={setSearch} onSubjectChange={setSelectedSubject} onAdd={() => { setEditingExam(null); setFormOpen(true); }} /></div>
      {notice && <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#cce9dc] bg-[#f0fbf6] px-4 py-3 text-sm text-[#39785f]" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="ปิด"><X size={17} /></button></div>}
      <div className="mt-6">
        {loading ? <div className="flex min-h-80 items-center justify-center gap-3 rounded-[24px] border border-[#e1eaed] bg-white text-[#66808b]"><LoaderCircle className="animate-spin text-[#559ab3]" />กำลังโหลดชุดข้อสอบ...</div> : error ? <div className="flex min-h-80 flex-col items-center justify-center rounded-[24px] border border-[#e1eaed] bg-white text-center"><AlertCircle className="text-[#cb6b53]" size={28} /><p className="mt-3 text-[#526a74]">{error}</p><button type="button" onClick={() => void loadExams()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4d94ad] px-4 py-2.5 text-sm text-white"><RefreshCw size={16} />ลองอีกครั้ง</button></div> : <ExamHierarchy exams={filteredExams} onView={(exam) => setDetailExamId(exam.exam_repository_id)} onEdit={(exam) => { setEditingExam(exam); setFormOpen(true); }} />}
      </div>
      {formOpen && <ExamFormModal key={editingExam?.exam_repository_id ?? "new-exam"} exam={editingExam} subjects={subjects} onClose={() => { setFormOpen(false); setEditingExam(null); }} onSave={saveExam} />}
      {detailExamId !== null && <ExamDetailModal examId={detailExamId} onClose={() => setDetailExamId(null)} onChanged={() => loadExams(false)} />}
    </>
  );
}
