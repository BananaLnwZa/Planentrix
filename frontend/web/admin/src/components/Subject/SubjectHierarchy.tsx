import { BookOpen } from "lucide-react";
import { Subject } from "@/interfaces/subject-management.interface";
import SubjectCard from "./SubjectCard";

interface SubjectHierarchyProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onStatusChange: (subject: Subject) => void;
}

export default function SubjectHierarchy({
  subjects,
  onEdit,
  onStatusChange,
}: SubjectHierarchyProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cfdde2] bg-white/70 px-6 text-center">
        <span className="rounded-full bg-[#eaf5f8] p-4 text-[#6394a5]"><BookOpen size={29} /></span>
        <h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบวิชาหลัก</h2>
        <p className="mt-1 text-sm text-[#87979e]">ลองเปลี่ยนคำค้นหา ประเภทวิชา หรือเพิ่มวิชาใหม่</p>
      </div>
    );
  }

  return (
    <section aria-label="รายการวิชาหลัก">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-[#3c515b]">คลังวิชาหลัก</h2>
          <p className="mt-0.5 text-xs text-[#87979e]">แสดงเฉพาะข้อมูลจากตาราง subjects ส่วนสาขา ชั้นปี และเทอมจัดการในโครงสร้างหลักสูตร</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#eaf5f8] px-3 py-1.5 text-xs text-[#4d8092]">{subjects.length} วิชา</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.subject_id}
            subject={subject}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </section>
  );
}
