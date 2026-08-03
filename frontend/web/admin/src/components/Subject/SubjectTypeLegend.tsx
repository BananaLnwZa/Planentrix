import { Subject, SubjectType } from "@/interfaces/subject-management.interface";

interface SubjectTypeLegendProps {
  subjectTypes: SubjectType[];
  subjects: Subject[];
}

const styles = [
  "bg-[#e9f6fa] text-[#397d94]",
  "bg-[#fff0ea] text-[#ad654f]",
  "bg-[#edf8f2] text-[#467d65]",
  "bg-[#f2effb] text-[#7465a7]",
  "bg-[#fff7df] text-[#94752f]",
  "bg-[#fceef4] text-[#a65f7d]",
  "bg-[#ecf2ff] text-[#5875ad]",
  "bg-[#eef3f4] text-[#62747b]",
];

export const getSubjectTypeStyle = (subjectTypeId: number) =>
  styles[(subjectTypeId - 1) % styles.length];

export default function SubjectTypeLegend({ subjectTypes, subjects }: SubjectTypeLegendProps) {
  return (
    <section className="rounded-[22px] border border-[#e1eaed] bg-white p-4 shadow-[0_9px_28px_rgba(55,88,102,0.05)] sm:p-5" aria-labelledby="subject-types-title">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 id="subject-types-title" className="mr-2 text-sm font-semibold text-[#425963]">ประเภทวิชา</h2>
        {subjectTypes.map((type) => {
          const count = subjects.filter((subject) => subject.subject_type_id === type.subject_type_id).length;
          return (
            <span key={type.subject_type_id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${getSubjectTypeStyle(type.subject_type_id)}`}>
              {type.subject_type_name}
              <span className="rounded-full bg-white/75 px-1.5 py-0.5 text-[10px]">{count.toLocaleString("th-TH")}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
