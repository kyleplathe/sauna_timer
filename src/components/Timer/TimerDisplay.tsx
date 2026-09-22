import { motion } from 'framer-motion'
import type { Phase, Program } from '../../types/timer'
import {
  formatClock,
  formatTemperature,
  phaseLabel,
} from '../../utils/protocols'
import { PauseIcon, PlayIcon, SkipIcon, StopIcon } from '../Icons'
import { PhaseIndicator } from './PhaseIndicator'
import { ProgressRing } from './ProgressRing'

interface TimerDisplayProps {
  program: Program
  currentPhase: Phase
  remainingMs: number
  phaseDurationMs: number
  currentRound: number
  status: string
  nextPhase: Phase | null
  temperatureUnit: 'C' | 'F'
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onSkip: () => void
  onContinue: () => void
}

export function TimerDisplay({
  program,
  currentPhase,
  remainingMs,
  phaseDurationMs,
  currentRound,
  status,
  nextPhase,
  temperatureUnit,
  onStart,
  onPause,
  onResume,
  onStop,
  onSkip,
  onContinue,
}: TimerDisplayProps) {
  const isTransition = status === 'transition'
  const isIdle = status === 'idle'
  const isPaused = status === 'paused'
  const awaiting = status === 'awaitingNext'
  const seconds = remainingMs / 1000
  const ringProgress =
    phaseDurationMs > 0
      ? ((phaseDurationMs - remainingMs) / phaseDurationMs) * 100
      : 0

  const atmosphere =
    isTransition || awaiting
      ? 'from-amber-100 via-stone-100 to-orange-50 dark:from-stone-950 dark:via-amber-950/40 dark:to-stone-950'
      : currentPhase.type === 'sauna'
        ? 'from-orange-100 via-red-50 to-stone-100 dark:from-[#1c100a] dark:via-red-950/40 dark:to-stone-950'
        : currentPhase.type === 'cold'
          ? 'from-cyan-50 via-sky-50 to-stone-100 dark:from-[#07141a] dark:via-cyan-950/40 dark:to-stone-950'
          : 'from-emerald-50 via-stone-50 to-stone-100 dark:from-[#0c1410] dark:via-emerald-950/30 dark:to-stone-950'

  if (isIdle) {
    return (
      <div className={`timer-screen-idle flex flex-col items-center justify-center bg-gradient-to-br ${atmosphere}`}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <p className="mb-3 text-sm tracking-[0.25em] text-stone-500 uppercase">
            {program.coldType === 'shower' ? 'Shower protocol' : 'Plunge protocol'}
          </p>
          <h2 className="font-display text-5xl text-stone-900 dark:text-stone-50">
            {program.name}
          </h2>
          <p className="mt-4 text-lg text-stone-600 dark:text-stone-300">
            {program.description}
          </p>
          <button
            onClick={onStart}
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-10 py-4 text-lg font-semibold text-white shadow-xl"
          >
            <PlayIcon className="h-6 w-6" />
            Start session
          </button>
        </motion.div>
      </div>
    )
  }

  const nextLabel = nextPhase
    ? phaseLabel(nextPhase.type, program.coldType)
    : 'Finish'

  return (
    <motion.div
      className={`timer-screen flex flex-col items-center justify-between bg-gradient-to-br ${atmosphere}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-md text-center">
        <p className="text-sm tracking-[0.2em] text-stone-500 uppercase dark:text-stone-400">
          {program.name}
        </p>
      </div>

      <div className="flex flex-col items-center gap-8">
        <PhaseIndicator
          phaseType={currentPhase.type}
          coldType={program.coldType}
          currentRound={currentRound}
          totalRounds={program.rounds}
          isTransition={isTransition}
        />

        <div className="relative">
          <ProgressRing
            progress={ringProgress}
            phaseType={currentPhase.type}
            isTransition={isTransition || awaiting}
            size={300}
            strokeWidth={12}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="timer-glow tabular font-display text-7xl text-stone-900 dark:text-white">
                {awaiting ? '00:00' : formatClock(seconds)}
              </div>
              {currentPhase.temperature && !isTransition && !awaiting && (
                <p className="mt-2 text-stone-500 dark:text-stone-300">
                  Target {formatTemperature(currentPhase.temperature, temperatureUnit)}
                </p>
              )}
            </div>
          </div>
        </div>

        {isTransition && (
          <p className="max-w-xs text-center text-lg text-stone-700 dark:text-stone-200">
            Move to {nextLabel}. Next phase starts automatically.
          </p>
        )}

        {awaiting && (
          <p className="text-center text-lg text-stone-700 dark:text-stone-200">
            Ready for {nextLabel}?
          </p>
        )}

        {nextPhase && !isTransition && !awaiting && (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Next: {phaseLabel(nextPhase.type, program.coldType)} ·{' '}
            {formatClock(nextPhase.duration)}
          </p>
        )}
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        {awaiting ? (
          <button
            onClick={onContinue}
            className="rounded-2xl bg-stone-900 py-4 font-semibold text-white dark:bg-white dark:text-stone-900"
          >
            Start {nextLabel}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {isPaused ? (
              <button
                onClick={onResume}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-semibold text-white"
              >
                <PlayIcon className="h-5 w-5" /> Resume
              </button>
            ) : (
              <button
                onClick={onPause}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 font-semibold text-stone-900"
              >
                <PauseIcon className="h-5 w-5" /> Pause
              </button>
            )}
            <button
              onClick={onSkip}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 py-4 font-semibold text-white"
            >
              <SkipIcon className="h-5 w-5" /> Skip
            </button>
          </div>
        )}
        <button
          onClick={onStop}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-200 py-3 font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-100"
        >
          <StopIcon className="h-5 w-5" /> End session
        </button>
      </div>
    </motion.div>
  )
}
