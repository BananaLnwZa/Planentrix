const scheduleDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayHeaderColors = [
  "bg-[#FFD7E5]",
  "bg-[#FFE0C9]",
  "bg-[#FFF0B8]",
  "bg-[#DDF0C7]",
  "bg-[#D6EBFA]",
  "bg-[#DDDDF8]",
  "bg-[#F5D8EE]",
];

const timeSlots = [
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
  "12 AM",
  "1 AM",
  "2 AM",
  "3 AM",
  "4 AM",
  "5 AM",
];

export default function ScheduleGrid() {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-[15px] pb-0.5 [scrollbar-gutter:stable]">
      <div
        className="w-full min-w-0 text-[#52636D]"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <div className="sticky top-0 z-10 grid grid-cols-[58px_repeat(7,minmax(0,1fr))] overflow-hidden rounded-xl border border-[#D8BBC7] bg-white shadow-[0_3px_6px_rgba(104,79,89,0.17)]">
          <div className="flex h-11 items-center justify-center border-r border-[#E2C7D1] bg-[#BFE4F5] text-[15px] text-[#426477]">
            Time
          </div>
          {scheduleDays.map((day, index) => (
            <div
              key={day}
              className={`flex h-11 items-center justify-center text-[15px] font-medium text-[#596D78] [text-shadow:1px_1px_0_rgba(255,255,255,0.85)] ${dayHeaderColors[index]} ${index < scheduleDays.length - 1 ? "border-r border-white/70" : ""}`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-[#DECBD2] bg-white shadow-[0_3px_6px_rgba(104,79,89,0.14)]">
          {timeSlots.map((time, rowIndex) => (
            <div
              key={time}
              className={`grid h-8 grid-cols-[58px_repeat(7,minmax(0,1fr))] ${rowIndex < timeSlots.length - 1 ? "border-b border-[#EEE1E6]" : ""}`}
            >
              <div className={`flex items-center justify-center border-r border-[#E5D4DA] text-[11px] text-[#687983] ${rowIndex % 2 === 0 ? "bg-[#FFF1D5]" : "bg-[#FFF7E8]"}`}>
                {time}
              </div>
              {scheduleDays.map((day, columnIndex) => (
                <div
                  key={`${day}-${time}`}
                  aria-hidden="true"
                  className={`transition-colors duration-150 hover:bg-[#FFF3F8] ${columnIndex < scheduleDays.length - 1 ? "border-r border-[#EEE4E8]" : ""} ${rowIndex % 2 === 0 ? "bg-[#FFFEFC]" : "bg-white"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
