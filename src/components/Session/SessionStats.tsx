import { motion } from 'framer-motion'
import type { SessionStats as Stats } from '../../types/timer'
import { formatDuration } from '../../utils/protocols'
import { formatAvgTempC } from '../../utils/sessionMetrics'

interface SessionStatsProps {
  stats: Stats
  temperatureUnit?: 'C' | 'F'
}

export function SessionStats({
  stats,
  temperatureUnit = 'C',
}: SessionStatsProps) {
  const cards: { label: string; icon: string; value: string }[] = [
    {
      label: 'Sessions',
      icon: '01',
      value: String(stats.totalSessions),
    },
    {
      label: 'Time in practice',
      icon: '02',
      value: formatDuration(stats.totalDuration),
    },
    {
      label: 'Current streak',
      icon: '03',
      value: `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`,
    },
    {
      label: 'Longest streak',
      icon: '04',
      value: `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`,
    },
    {
      label: 'Avg session',
      icon: '05',
      value:
        stats.averageDuration > 0 ? formatDuration(stats.averageDuration) : '—',
    },
    {
      label: 'Avg heat',
      icon: '06',
      value: formatAvgTempC(stats.averageHeatC, temperatureUnit),
    },
    {
      label: 'Time in heat',
      icon: '07',
      value:
        stats.totalHeatSeconds > 0
          ? formatDuration(stats.totalHeatSeconds)
          : '—',
    },
    {
      label: 'Time in cold',
      icon: '08',
      value:
        stats.totalColdSeconds > 0
          ? formatDuration(stats.totalColdSeconds)
          : '—',
    },
    {
      label: 'This week',
      icon: '09',
      value: String(stats.sessionsThisWeek),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-950 p-5 text-white"
        >
          <p className="text-xs tracking-[0.2em] text-orange-300 uppercase">
            {card.icon}
          </p>
          <p className="mt-3 text-sm text-stone-300">{card.label}</p>
          <p className="font-display mt-1 text-2xl">{card.value}</p>
        </motion.div>
      ))}
    </div>
  )
}
