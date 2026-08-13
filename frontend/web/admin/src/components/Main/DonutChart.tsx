interface DonutSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface DonutChartProps {
  segments: readonly DonutSegment[];
  centerValue: string;
  centerLabel: string;
}

function createConicGradient(segments: readonly DonutSegment[]) {
  if (segments.length === 0 || segments.every((segment) => segment.percent <= 0)) {
    return "conic-gradient(#e8eff2 0% 100%)";
  }

  let start = 0;

  const stops = segments.map((segment) => {
    const end = start + segment.percent;
    const stop = `${segment.color} ${start}% ${end}%`;
    start = end;
    return stop;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

export default function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div
        role="img"
        aria-label={segments
          .map((segment) => `${segment.label} ${segment.percent}%`)
          .join(", ")}
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{ background: createConicGradient(segments) }}
      >
        <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <strong className="text-2xl font-normal text-[#2f444c]">
            {centerValue}
          </strong>
          <span className="mt-0.5 text-[11px] text-[#829097]">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-3">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-2 text-[#607179]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              {segment.label}
            </span>
            <span className="font-medium text-[#344850]">
              {segment.value.toLocaleString("th-TH")}
              <span className="ml-1 text-xs font-normal text-[#8a979c]">
                ({segment.percent.toLocaleString("th-TH", {
                  maximumFractionDigits: 1,
                })}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
