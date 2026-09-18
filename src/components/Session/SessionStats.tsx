import { motion } from 'framer-motion'
import type { SessionStats as Stats } from '../../types/timer'
import { formatDuration } from '../../utils/protocols'

interface SessionStatsProps {
  stats: Stats
}

const cards = [
  { key: 'totalSessions', label: 'Sessions', icon: '01' },
  { key: 'totalDuration', label: 'Time in practice', icon: '02' },
  { key: 'currentStreak', label: 'Current streak', icon: '03' },
  { key: 'longestStreak', label: 'Longest streak', icon: '04' },
  { key: 'sessionsThisWeek', label: 'This week', icon: '05' },
  { key: 'sessionsThisMonth', label: 'This month', icon: '06' },
] as const

export function SessionStats({ stats }: SessionStatsProps) {
  const valueFor = (key: (typeof cards)[number]['key']): string => {
    if (key === 'totalDuration') return formatDuration(stats.totalDuration)
    if (key === 'currentStreak' || key === 'longestStreak') {
      return `${stats[key]} day${stats[key] === 1 ? '' : 's'}`
    }
    return String(stats[key])
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-950 p-5 text-white"
        >
          <p className="text-xs tracking-[0.2em] text-orange-300 uppercase">
            {card.icon}
          </p>
          <p className="mt-3 text-sm text-stone-300">{card.label}</p>
          <p className="font-display mt-1 text-2xl">{valueFor(card.key)}</p>
        </motion.div>
      ))}
    </div>
  )
}
