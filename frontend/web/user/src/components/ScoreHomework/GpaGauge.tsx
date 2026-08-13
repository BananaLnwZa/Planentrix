export default function GpaGauge({
  currentGpa,
  targetGpa,
}: {
  currentGpa: number;
  targetGpa: number;
}) {
  const safeCurrentGpa = Math.min(4, Math.max(0, currentGpa));
  const safeTargetGpa = Math.min(4, Math.max(0, targetGpa));
  const progress =
    safeTargetGpa > 0
      ? Math.min(100, (safeCurrentGpa / safeTargetGpa) * 100)
      : safeCurrentGpa > 0
        ? 100
        : 0;

  return (
    <section
      aria-label={`GPA ปัจจุบัน ${safeCurrentGpa.toFixed(2)} จากเป้าหมาย ${safeTargetGpa.toFixed(2)}`}
      className="rounded-[22px] border border-[#D5E5EC] bg-white px-4 pb-3 pt-4 text-center shadow-[0_7px_16px_rgba(55,93,112,0.13)]"
    >
      <div className="flex items-center justify-between px-1">
        <div className="text-left">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5F7F91]">
            Progress
          </p>
          <h1 className="text-xl font-semibold text-[#31566C]">GPA ปัจจุบัน</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium text-[#5F7887]">เป้าหมาย</p>
          <p className="text-lg font-semibold text-[#4EA9DA]">{safeTargetGpa.toFixed(2)}</p>
        </div>
      </div>
      <svg
        viewBox="0 0 240 132"
        className="mx-auto mt-1 h-auto w-full max-w-[260px]"
        role="img"
        aria-hidden="true"
      >
        <path
          d="M 30 112 A 90 90 0 0 1 210 112"
          pathLength="100"
          fill="none"
          stroke="#FDE9D9"
          strokeWidth="28"
        />
        <path
          d="M 30 112 A 90 90 0 0 1 210 112"
          pathLength="100"
          fill="none"
          stroke="#9ED5F1"
          strokeWidth="28"
          strokeDasharray={`${progress} ${100 - progress}`}
        />
        <text
          x="120"
          y="101"
          textAnchor="middle"
          fill="#31566C"
          fontSize="20"
          fontWeight="600"
        >
          {safeCurrentGpa.toFixed(2)}
        </text>
        <text x="120" y="126" textAnchor="middle" fill="#5F7887" fontSize="10" fontWeight="500">
          จากเป้าหมาย {safeTargetGpa.toFixed(2)}
        </text>
      </svg>
    </section>
  );
}
