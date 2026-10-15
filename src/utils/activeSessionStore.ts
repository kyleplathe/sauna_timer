import {
  ACTIVE_SESSION_KEY,
  parseCheckpoint,
  restoreActiveSession,
  type ActiveSessionCheckpoint,
  type ResumeDecision,
} from './activeSession'
import { clearDurable, readDurable, readLocalEnvelope, writeDurable } from './durableStore'

export function readLocalResume(now = Date.now()): ResumeDecision | null {
  const envelope = readLocalEnvelope<unknown>(ACTIVE_SESSION_KEY)
  if (!envelope) return null
  const checkpoint = parseCheckpoint(envelope.value)
  if (!checkpoint) return null
  return restoreActiveSession(checkpoint, now)
}

export async function readBestResume(now = Date.now()): Promise<ResumeDecision | null> {
  const envelope = await readDurable<unknown>(ACTIVE_SESSION_KEY)
  if (!envelope) return null
  const checkpoint = parseCheckpoint(envelope.value)
  if (!checkpoint) return null
  return restoreActiveSession(checkpoint, now)
}

/** localStorage is updated before this yields, so a crash still keeps the checkpoint. */
export function saveActiveSession(checkpoint: ActiveSessionCheckpoint): void {
  void writeDurable(ACTIVE_SESSION_KEY, checkpoint, checkpoint.updatedAt)
}

export function clearActiveSession(): void {
  void clearDurable(ACTIVE_SESSION_KEY)
}
