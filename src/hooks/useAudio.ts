import { useCallback } from 'react'
import type { AudioSettings, PhaseType } from '../types/timer'
import {
  announceCompletion,
  announcePhaseChange,
  announceTransition,
  announceWarning,
} from '../utils/audio'

export function useAudio(audioSettings: AudioSettings) {
  const playPhaseChangeSound = useCallback(
    (_phaseType: PhaseType) => {
      if (!audioSettings.enabled) return
      announcePhaseChange(audioSettings.volume)
    },
    [audioSettings.enabled, audioSettings.volume],
  )

  const playWarningSound = useCallback(
    (secondsRemaining: number) => {
      if (!audioSettings.enabled || !audioSettings.warnings) return
      announceWarning(secondsRemaining, audioSettings.volume)
    },
    [audioSettings.enabled, audioSettings.warnings, audioSettings.volume],
  )

  const playCompletionSound = useCallback(() => {
    if (!audioSettings.enabled) return
    announceCompletion(audioSettings.volume)
  }, [audioSettings.enabled, audioSettings.volume])

  const playTransitionCue = useCallback(
    (_nextLabel: string) => {
      if (!audioSettings.enabled) return
      announceTransition(audioSettings.volume)
    },
    [audioSettings.enabled, audioSettings.volume],
  )

  return {
    playPhaseChangeSound,
    playWarningSound,
    playCompletionSound,
    playTransitionCue,
  }
}
