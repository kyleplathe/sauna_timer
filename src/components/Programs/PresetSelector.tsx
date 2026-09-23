import { motion } from 'framer-motion'
import type { Program } from '../../types/timer'
import { formatDuration, getTotalDuration } from '../../utils/protocols'
import { CloseIcon } from '../Icons'

interface PresetSelectorProps {
  programs: Program[]
  onSelect: (program: Program) => void
  onEdit?: (program: Program) => void
  onDelete?: (programId: string) => void
  onDismissPractice?: () => void
}

function tone(program: Program): string {
  if (program.id.includes('beginner') || program.id === 'practice') {
    return 'from-emerald-500 to-teal-700'
  }
  if (program.id.includes('intermediate')) return 'from-orange-500 to-red-700'
  if (program.id.includes('advanced')) return 'from-violet-500 to-fuchsia-700'
  return 'from-sky-500 to-cyan-700'
}

export function PresetSelector({
  programs,
  onSelect,
  onEdit,
  onDelete,
  onDismissPractice,
}: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
      {programs.map((program, index) => (
        <motion.article
          key={program.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="relative overflow-hidden rounded-3xl shadow-lg"
        >
          {program.id === 'practice' && onDismissPractice && (
            <button
              type="button"
              aria-label="Dismiss dry run demo"
              onClick={(event) => {
                event.stopPropagation()
                onDismissPractice()
              }}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/25 p-2 text-white backdrop-blur-sm transition hover:bg-black/40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onSelect(program)}
            className={`w-full bg-gradient-to-br ${tone(program)} p-6 text-left text-white`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase opacity-80">
                  {program.id === 'practice'
                    ? 'Demo'
                    : program.coldType === 'shower'
                      ? 'Cold shower'
                      : 'Cold plunge'}
                  {program.isPreset ? '' : ' · Custom'}
                </p>
                <h3 className="font-display mt-1 text-3xl">{program.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Total</p>
                <p className="text-lg font-semibold">
                  {formatDuration(getTotalDuration(program))}
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-white/90">{program.description}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {program.rounds} {program.rounds === 1 ? 'round' : 'rounds'}
              </span>
              {program.phases.map((phase, phaseIndex) => (
                <span
                  key={`${program.id}-${phaseIndex}`}
                  className="rounded-full bg-white/15 px-3 py-1"
                >
                  {phase.type} {formatDuration(phase.duration)}
                </span>
              ))}
            </div>
          </button>
          {!program.isPreset && (onEdit || onDelete) && (
            <div className="flex bg-stone-900/80 text-sm text-white">
              {onEdit && (
                <button
                  className="flex-1 py-2"
                  onClick={() => onEdit(program)}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  className="flex-1 py-2 text-red-300"
                  onClick={() => onDelete(program.id)}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </motion.article>
      ))}
    </div>
  )
}
