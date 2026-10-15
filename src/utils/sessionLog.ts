import type { Session } from '../types/timer'

/** Sessions plus delete tombstones so a stale replica cannot bring one back. */
export interface SessionLog {
  sessions: Session[]
  deletedIds: string[]
}

const MAX_TOMBSTONES = 300

export function emptySessionLog(): SessionLog {
  return { sessions: [], deletedIds: [] }
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<Session>
  return (
    typeof session.id === 'string' &&
    session.id.length > 0 &&
    typeof session.programId === 'string' &&
    typeof session.programName === 'string' &&
    typeof session.startTime === 'number' &&
    typeof session.completedPhases === 'number' &&
    typeof session.totalPhases === 'number' &&
    typeof session.duration === 'number' &&
    typeof session.completed === 'boolean'
  )
}

export function normalizeSessionLog(value: unknown): SessionLog {
  if (Array.isArray(value)) {
    return { sessions: value.filter(isSession), deletedIds: [] }
  }
  if (!value || typeof value !== 'object') return emptySessionLog()
  const record = value as Partial<SessionLog>
  const deletedIds = Array.isArray(record.deletedIds)
    ? record.deletedIds.filter((id): id is string => typeof id === 'string')
    : []
  const sessions = Array.isArray(record.sessions)
    ? record.sessions.filter(isSession)
    : []
  return {
    sessions,
    deletedIds: deletedIds.slice(-MAX_TOMBSTONES),
  }
}

function preferSession(current: Session, incoming: Session): Session {
  if (current.completed !== incoming.completed) {
    return incoming.completed ? incoming : current
  }
  if (current.completedPhases !== incoming.completedPhases) {
    return incoming.completedPhases > current.completedPhases ? incoming : current
  }
  const currentEnd = current.endTime ?? current.startTime
  const incomingEnd = incoming.endTime ?? incoming.startTime
  if (currentEnd !== incomingEnd) return incomingEnd > currentEnd ? incoming : current
  return incoming.duration >= current.duration ? incoming : current
}

/**
 * Union every copy. A replica that only has the newest session must not
 * erase older ones, which is what happens if iOS drops localStorage and the
 * next save writes a short list back over the only remaining copy.
 */
export function mergeSessionLogs(logs: SessionLog[]): SessionLog {
  const deleted = new Set<string>()
  for (const log of logs) {
    for (const id of log.deletedIds) deleted.add(id)
  }

  const byId = new Map<string, Session>()
  for (const log of logs) {
    for (const session of log.sessions) {
      if (deleted.has(session.id)) continue
      const existing = byId.get(session.id)
      byId.set(session.id, existing ? preferSession(existing, session) : session)
    }
  }

  return {
    sessions: [...byId.values()].sort((a, b) => a.startTime - b.startTime),
    deletedIds: [...deleted].slice(-MAX_TOMBSTONES),
  }
}

export function upsertSession(log: SessionLog, session: Session): SessionLog {
  if (log.deletedIds.includes(session.id)) return log
  const sessions = log.sessions.some((item) => item.id === session.id)
    ? log.sessions.map((item) => (item.id === session.id ? session : item))
    : [...log.sessions, session]
  return { sessions, deletedIds: log.deletedIds }
}

export function removeSession(log: SessionLog, sessionId: string): SessionLog {
  return {
    sessions: log.sessions.filter((session) => session.id !== sessionId),
    deletedIds: [...new Set([...log.deletedIds, sessionId])].slice(-MAX_TOMBSTONES),
  }
}
