import { motion } from 'framer-motion'
import type { Session } from '../../types/timer'
import { formatDuration } from '../../utils/protocols'
import { AppleIcon } from '../Icons'

interface SessionHistoryProps {
  sessions: Session[]
  onDelete: (sessionId: string) => void
  onExportHealth: () => void
}

export function SessionHistory({
  sessions,
  onDelete,
  onExportHealth,
}: SessionHistoryProps) {
  const sorted = [...sessions].sort((a, b) => b.startTime - a.startTime)

  if (sessions.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-stone-500">
        <p className="font-display text-3xl text-stone-800 dark:text-stone-100">
          No sessions yet
        </p>
        <p className="mt-2">Finish a protocol and it will land here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl">History</h3>
        <button
          onClick={onExportHealth}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
        >
          <AppleIcon className="h-4 w-4" />
          Export for Health
        </button>
      </div>

      <div className="space-y-3">
        {sorted.slice(0, 30).map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900"
          >
            <div>
              <p className="font-semibold">
                {session.completed ? 'Complete' : 'Partial'} · {session.programName}
              </p>
              <p className="text-sm text-stone-500">
                {new Date(session.startTime).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                · {formatDuration(session.duration)}
              </p>
              {!session.completed && (
                <p className="text-sm text-amber-600">
                  {session.completedPhases}/{session.totalPhases} phases
                </p>
              )}
            </div>
            <button
              onClick={() => onDelete(session.id)}
              className="rounded-lg px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
