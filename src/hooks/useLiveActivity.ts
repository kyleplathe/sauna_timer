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
  /** When true, keep the screen on (preferred for sauna + music). */
  keepScreenAwake: boolean
  /** Optional sticky notification while a session runs. */
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
 * Session support focused on sauna use:
 * - Keep screen awake (preferred) so timers/alarms stay reliable and Spotify keeps focus
 * - Only start HTMLAudio keepalive when the screen is allowed to sleep
 * - Never claim Media Session / Now Playing (that cuts off Spotify)
 * - Alerts stay ambient so music mixes instead of stopping
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
      setIdleAudioMode('ambient')
      clearMediaSession()
      void clearLiveTimerNotification()
      document.title = baseTitleRef.current
      lastNotifyKeyRef.current = null
      return
    }

    let cancelled = false

    const boot = async () => {
      // Keep Spotify in charge of Now Playing — clear any prior claim.
      clearMediaSession()
      setIdleAudioMode('ambient')

      // HTMLAudio keepalive steals music focus on many phones. Only use it when
      // the screen is allowed to sleep (background / locked path).
      if (!keepScreenAwake) {
        if (!cancelled && !stopAudioRef.current) {
          stopAudioRef.current = startSessionKeepalive()
        }
      } else {
        stopAudioRef.current?.()
        stopAudioRef.current = null
      }

      if (lockScreenLive) {
        await requestLockScreenPermission()
      }
    }
    void boot()

    return () => {
      cancelled = true
    }
  }, [active, lockScreenLive, keepScreenAwake])

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

    document.title = title
    // Do not touch Media Session — leaving it alone keeps Spotify on the lock screen.

    if (lockScreenLive) {
      const key = liveNotificationKey(phaseType, status, programName)
      if (lastNotifyKeyRef.current !== key) {
        lastNotifyKeyRef.current = key
        void postLiveTimerNotification({
          title: `${label} · ${programName}`,
          body: `${clock} left · phase-end alarm is armed`,
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
      setIdleAudioMode('ambient')
      void clearLiveTimerNotification()
      clearMediaSession()
    }
  }, [])
}
