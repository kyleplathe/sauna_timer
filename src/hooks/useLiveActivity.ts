import { useEffect, useRef } from 'react'
import { formatClock, phaseLabel } from '../utils/protocols'
import type { ColdType, PhaseType } from '../types/timer'
import {
  clearLiveTimerNotification,
  postLiveTimerNotification,
  requestLockScreenPermission,
} from '../utils/liveNotifications'
import { setIdleAudioMode } from '../utils/audioSession'
import { startSessionKeepalive } from '../utils/scheduledAlarm'

interface LiveActivityArgs {
  active: boolean
  phaseType: PhaseType | null
  coldType: ColdType
  remainingMs: number
  phaseDurationMs: number
  status: string
  programName: string
  /** When true, keep the screen on. Leave false so the phone can lock. */
  keepScreenAwake: boolean
  /** Prefer lock-screen notification + Now Playing while a session runs. */
  lockScreenLive: boolean
}

/** Stable key so we only replace the sticky lock-screen notification on phase/status changes. */
export function liveNotificationKey(
  phaseType: PhaseType | null,
  status: string,
  programName: string,
): string {
  return `${status}|${phaseType ?? 'none'}|${programName}`
}

function setMediaSession(
  title: string,
  artist: string,
  album: string,
  playbackState: MediaSessionPlaybackState,
  durationSec: number,
  positionSec: number,
): void {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
    })
    navigator.mediaSession.playbackState = playbackState
    if ('setPositionState' in navigator.mediaSession) {
      const duration = Math.max(durationSec, 0.001)
      const position = Math.min(Math.max(positionSec, 0), duration)
      navigator.mediaSession.setPositionState({
        duration,
        position,
        playbackRate: 1,
      })
    }
  } catch {
    // Media Session is best-effort on web.
  }
}

function clearMediaSession(): void {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'
    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState()
    }
  } catch {
    // ignore
  }
}

/**
 * Session background support:
 * - HTMLAudio keepalive so phase-end alarms can still fire while locked
 * - Optional sticky notification + Now Playing metadata
 * - Optional wake lock (off by default)
 *
 * Music stays in ambient/mix mode; short cues duck when the browser allows it.
 */
export function useLiveActivity({
  active,
  phaseType,
  coldType,
  remainingMs,
  phaseDurationMs,
  status,
  programName,
  keepScreenAwake,
  lockScreenLive,
}: LiveActivityArgs): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const stopAudioRef = useRef<(() => void) | null>(null)
  const lastNotifyKeyRef = useRef<string | null>(null)
  const baseTitleRef = useRef(
    typeof document !== 'undefined' ? document.title : 'Ember & Ice',
  )

  useEffect(() => {
    if (!active) {
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
      stopAudioRef.current?.()
      stopAudioRef.current = null
      setIdleAudioMode('auto')
      clearMediaSession()
      void clearLiveTimerNotification()
      document.title = baseTitleRef.current
      lastNotifyKeyRef.current = null
      return
    }

    let cancelled = false

    const boot = async () => {
      // Always keep HTMLAudio alive during a session so locked-phone alarms work.
      if (!cancelled && !stopAudioRef.current) {
        stopAudioRef.current = startSessionKeepalive()
      }
      if (lockScreenLive) {
        await requestLockScreenPermission()
      }
    }
    void boot()

    return () => {
      cancelled = true
    }
  }, [active, lockScreenLive])

  useEffect(() => {
    if (!active || !keepScreenAwake) {
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
      return
    }

    let cancelled = false

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          return
        }
        wakeLockRef.current = sentinel
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) wakeLockRef.current = null
        })
      } catch {
        // Permission / battery policies can deny wake lock.
      }
    }

    void requestWakeLock()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
    }
  }, [active, keepScreenAwake])

  useEffect(() => {
    if (!active || !phaseType) return

    const label =
      status === 'transition'
        ? 'Walk'
        : status === 'paused'
          ? 'Paused'
          : phaseLabel(phaseType, coldType)
    const clock = formatClock(remainingMs / 1000)
    const title = `${clock} · ${label}`
    const durationSec = Math.max(phaseDurationMs, remainingMs) / 1000
    const positionSec = Math.max(0, durationSec - remainingMs / 1000)
    const playbackState: MediaSessionPlaybackState =
      status === 'paused' ? 'paused' : 'playing'

    document.title = title
    setMediaSession(title, programName, 'Ember & Ice', playbackState, durationSec, positionSec)

    if (lockScreenLive) {
      const key = liveNotificationKey(phaseType, status, programName)
      if (lastNotifyKeyRef.current !== key) {
        lastNotifyKeyRef.current = key
        void postLiveTimerNotification({
          title: `${label} · ${programName}`,
          body: `${clock} left · alarm will sound when this phase ends`,
        })
      }
    }
  }, [
    active,
    phaseType,
    coldType,
    remainingMs,
    phaseDurationMs,
    status,
    programName,
    lockScreenLive,
  ])

  useEffect(() => {
    return () => {
      stopAudioRef.current?.()
      stopAudioRef.current = null
      setIdleAudioMode('auto')
      void clearLiveTimerNotification()
      clearMediaSession()
    }
  }, [])
}
