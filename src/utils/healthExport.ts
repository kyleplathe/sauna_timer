import type { Session } from '../types/timer'

export interface HealthDataPoint {
  type: 'MindfulSession'
  startDate: string
  endDate: string
  value: number
  unit: 'min'
  metadata: {
    activity: string
    notes: string
  }
}

export function sessionToHealthData(session: Session): HealthDataPoint {
  const startDate = new Date(session.startTime).toISOString()
  const endDate = new Date(
    session.endTime ?? session.startTime + session.duration * 1000,
  ).toISOString()
  const durationMinutes = Math.max(1, Math.round(session.duration / 60))

  return {
    type: 'MindfulSession',
    startDate,
    endDate,
    value: durationMinutes,
    unit: 'min',
    metadata: {
      activity: 'Contrast Therapy (Sauna/Cold)',
      notes: `${session.programName} - ${session.completed ? 'Completed' : 'Partial'}`,
    },
  }
}

export function generateHealthDataCSV(sessions: Session[]): string {
  const header = 'Type,Start Date,End Date,Duration (min),Activity,Notes\n'
  const rows = sessions.map((session) => {
    const data = sessionToHealthData(session)
    return [
      data.type,
      data.startDate,
      data.endDate,
      String(data.value),
      data.metadata.activity,
      data.metadata.notes,
    ]
      .map((value) => `"${value.replaceAll('"', '""')}"`)
      .join(',')
  })
  return header + rows.join('\n')
}

export function generateHealthDataJSON(sessions: Session[]): string {
  return JSON.stringify(
    {
      data: sessions.map(sessionToHealthData),
      exportDate: new Date().toISOString(),
      source: 'Sauna Timer App',
      version: '1.0',
    },
    null,
    2,
  )
}

export function downloadHealthData(
  sessions: Session[],
  format: 'csv' | 'json' = 'csv',
): void {
  const filename = `sauna-sessions-${new Date().toISOString().split('T')[0]}.${format}`
  const content =
    format === 'csv' ? generateHealthDataCSV(sessions) : generateHealthDataJSON(sessions)
  const blob = new Blob([content], {
    type: format === 'csv' ? 'text/csv' : 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
