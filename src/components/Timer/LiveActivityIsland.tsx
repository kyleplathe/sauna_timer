import { AnimatePresence, motion } from 'framer-motion'
import type { ColdType, PhaseType } from '../../types/timer'
import { formatClock, phaseLabel } from '../../utils/protocols'

interface LiveActivityIslandProps {
  visible: boolean
  phaseType: PhaseType
  coldType: ColdType
  remainingMs: number
  status: string
  currentRound: number
  totalRounds: number
}

function toneDot(phaseType: PhaseType, status: string): string {
  if (status === 'transition' || status === 'awaitingNext') {
    return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.85)]'
  }
  if (phaseType === 'sauna') {
    return 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.85)]'
  }
  if (phaseType === 'cold') {
    return 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.85)]'
  }
  return 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]'
}

export function LiveActivityIsland({
  visible,
  phaseType,
  coldType,
  remainingMs,
  status,
  currentRound,
  totalRounds,
}: LiveActivityIslandProps) {
  const label =
    status === 'transition'
      ? 'Walk'
      : status === 'paused'
        ? 'Paused'
        : status === 'awaitingNext'
          ? 'Ready'
          : phaseLabel(phaseType, coldType)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="pointer-events-none fixed top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] left-1/2 z-50 -translate-x-1/2"
          aria-live="polite"
        >
          <div className="flex min-w-[13rem] items-center gap-3 rounded-full border border-white/10 bg-black/90 px-4 py-2.5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${toneDot(phaseType, status)}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] tracking-[0.18em] uppercase text-white/65">
                {label} · R{currentRound}/{totalRounds}
              </p>
              <p className="tabular font-display text-lg leading-none">
                {status === 'awaitingNext'
                  ? '00:00'
                  : formatClock(remainingMs / 1000)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
