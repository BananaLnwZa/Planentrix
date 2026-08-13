import { BookOpen } from "lucide-react";

export function CurrentTermRequiredNotebookLayout({
  leftDetail,
  rightDetail,
}: {
  leftDetail: string;
  rightDetail?: string;
}) {
  return (
    <div className="grid h-full min-h-[430px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-[88px] md:px-3 md:py-1 lg:gap-24">
      <div className="flex items-center justify-center">
        <CurrentTermRequiredState detail={leftDetail} />
      </div>
      {rightDetail && (
        <div className="flex items-center justify-center">
          <CurrentTermRequiredState detail={rightDetail} />
        </div>
      )}
    </div>
  );
}

export default function CurrentTermRequiredState({
  detail,
}: {
  detail: string;
}) {
  return (
    <section className="flex h-[250px] w-full max-w-[360px] shrink-0 flex-col items-center justify-center rounded-[26px] border border-[#CFE7F4] bg-[#F3FAFE] px-6 py-8 text-center">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#66B3DE] shadow-sm">
        <BookOpen aria-hidden="true" className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-[#31566C]">
        ยังไม่มีเทอมปัจจุบัน
      </h1>
      <p className="mt-2 max-w-[290px] text-sm font-medium leading-6 text-[#566F7D]">
        {detail}
      </p>
    </section>
  );
}
