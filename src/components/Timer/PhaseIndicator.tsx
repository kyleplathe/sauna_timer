import { motion } from 'framer-motion'
import type { ColdType, PhaseType } from '../../types/timer'
import { phaseLabel } from '../../utils/protocols'
import { FlameIcon, LeafIcon, ShowerIcon, SnowflakeIcon } from '../Icons'

interface PhaseIndicatorProps {
  phaseType: PhaseType
  coldType: ColdType
  currentRound: number
  totalRounds: number
  isTransition?: boolean
}

export function PhaseIndicator({
  phaseType,
  coldType,
  currentRound,
  totalRounds,
  isTransition = false,
}: PhaseIndicatorProps) {
  const Icon = isTransition
    ? LeafIcon
    : phaseType === 'sauna'
      ? FlameIcon
      : phaseType === 'rest'
        ? LeafIcon
        : coldType === 'shower'
          ? ShowerIcon
          : SnowflakeIcon

  const label = isTransition ? 'Walk' : phaseLabel(phaseType, coldType)
  const tone = isTransition
    ? 'from-amber-300 to-yellow-500'
    : phaseType === 'sauna'
      ? 'from-orange-400 to-red-600'
      : phaseType === 'cold'
        ? 'from-cyan-400 to-blue-600'
        : 'from-emerald-400 to-teal-600'

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        key={label}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-3 rounded-full bg-gradient-to-r ${tone} px-5 py-2.5 text-white shadow-lg`}
      >
        <Icon className="h-6 w-6" />
        <span className="font-display text-2xl tracking-tight">{label}</span>
      </motion.div>
      {!isTransition && (
        <p className="text-sm tracking-widest text-stone-600 uppercase dark:text-stone-400">
          Round {currentRound} of {totalRounds}
        </p>
      )}
    </div>
  )
}
