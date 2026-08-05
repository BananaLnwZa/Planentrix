import ScheduleGrid from "./ScheduleGrid";

export default function Schedule() {
  return (
    <section className="flex h-[420px] min-h-0 w-full max-w-[440px] flex-col md:h-auto md:flex-1">
      <h2 className="sr-only">ตารางเรียน</h2>
      <ScheduleGrid />
    </section>
  );
}
