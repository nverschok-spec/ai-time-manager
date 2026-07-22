const SIZE = 88
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ProgressCircle({ done, total, children }) {
  const ratio = total > 0 ? done / total : 0
  const offset = CIRCUMFERENCE * (1 - ratio)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="currentColor"
          strokeWidth={STROKE}
          fill="none"
          className="text-slate-800"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="currentColor"
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-brand-cta transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {children ?? (
          <span className="text-lg font-semibold text-slate-100">
            {done}/{total}
          </span>
        )}
      </div>
    </div>
  )
}
