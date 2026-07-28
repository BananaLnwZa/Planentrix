import ScheduleGrid from "./ScheduleGrid";

export default function Schedule() {
  return (
    <section className="flex h-[420px] min-h-0 w-full max-w-[440px] flex-col rounded-[22px] bg-[#FFF9F2] p-2.5 shadow-[0_7px_12px_rgba(119,91,101,0.18)] md:h-auto md:flex-1">
      <h2 className="sr-only">ตารางเรียน</h2>
      <ScheduleGrid />
    </section>
  );
}
