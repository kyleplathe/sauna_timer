import type { PhaseType } from '../../types/timer'

interface ProgressRingProps {
  progress: number
  phaseType: PhaseType
  isTransition?: boolean
  size?: number
  strokeWidth?: number
}

export function ProgressRing({
  progress,
  phaseType,
  isTransition = false,
  size = 320,
  strokeWidth = 10,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const clamped = Math.min(100, Math.max(0, progress))
  const offset = circumference - (clamped / 100) * circumference

  const color = isTransition
    ? '#fbbf24'
    : phaseType === 'sauna'
      ? '#f97316'
      : phaseType === 'cold'
        ? '#22d3ee'
        : '#86efac'

  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-black/10 dark:text-white/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 120ms linear, stroke 400ms ease' }}
      />
    </svg>
  )
}
