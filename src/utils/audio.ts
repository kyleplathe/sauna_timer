import type { PhaseType } from '../types/timer'
import { prepareCueAudio, releaseCueAudio, setIdleAudioMode } from './audioSession'

let audioContext: AudioContext | null = null
let releaseCueTimer: ReturnType<typeof setTimeout> | null = null
/** When true, briefly use transient (may pause Spotify on iOS). Default off. */
let interruptMusicEnabled = false

export function setDuckMusicEnabled(enabled: boolean): void {
  // Setting name is historical ("duck"); on iOS transient often pauses music,
  // so this is now an explicit opt-in to interrupt/duck other audio.
  interruptMusicEnabled = enabled
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function scheduleCueRelease(holdMs: number): void {
  if (releaseCueTimer) clearTimeout(releaseCueTimer)
  releaseCueTimer = setTimeout(() => {
    releaseCueAudio()
    releaseCueTimer = null
  }, holdMs)
}

/** Play a short cue while keeping Spotify/Apple Music mixing (ambient). */
function withMixedCue(durationMs: number, play: () => void): void {
  setIdleAudioMode('ambient')
  prepareCueAudio(interruptMusicEnabled ? 'transient' : 'ambient')
  play()
  scheduleCueRelease(Math.max(250, durationMs + 120))
}

export function playBeep(
  frequency = 800,
  duration = 0.2,
  volume = 0.3,
): void {
  withMixedCue(duration * 1000, () => {
    const ctx = getAudioContext()
    void ctx.resume()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(Math.max(0.001, volume), ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  })
}

export function playChime(volume = 0.3): void {
  ;[523.25, 659.25, 783.99].forEach((freq, index) => {
    window.setTimeout(() => playBeep(freq, 0.3, volume), index * 100)
  })
}

export function playTransitionSound(volume = 0.3): void {
  playBeep(440, 0.15, volume)
  window.setTimeout(() => playBeep(554.37, 0.15, volume), 150)
}

export function playCompletionSound(volume = 0.3): void {
  const melody = [
    { freq: 523.25, duration: 0.2 },
    { freq: 659.25, duration: 0.2 },
    { freq: 783.99, duration: 0.2 },
    { freq: 1046.5, duration: 0.4 },
  ]
  let delay = 0
  melody.forEach((note) => {
    window.setTimeout(() => playBeep(note.freq, note.duration, volume), delay)
    delay += note.duration * 1000
  })
}

export function speak(text: string, volume = 1): void {
  if (!('speechSynthesis' in window)) return
  // Speech Synthesis often pauses music on iOS regardless of session type.
  // Still force ambient first so we do not make it worse.
  setIdleAudioMode('ambient')
  prepareCueAudio(interruptMusicEnabled ? 'transient' : 'ambient')
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.volume = volume
  utterance.rate = 1
  utterance.pitch = 1
  const holdMs = Math.min(12_000, Math.max(2_000, text.length * 80))
  utterance.onend = () => scheduleCueRelease(80)
  utterance.onerror = () => scheduleCueRelease(80)
  window.speechSynthesis.speak(utterance)
  scheduleCueRelease(holdMs)
}

export function getPhaseAnnouncement(
  phaseType: PhaseType,
  coldType: 'plunge' | 'shower',
): string {
  if (phaseType === 'sauna') return 'Time for sauna'
  if (phaseType === 'rest') return 'Time to rest'
  return coldType === 'plunge' ? 'Time for cold plunge' : 'Time for cold shower'
}

export function announcePhaseChange(
  phaseType: PhaseType,
  coldType: 'plunge' | 'shower',
  voiceEnabled: boolean,
  volume: number,
): void {
  playTransitionSound(volume)
  if (voiceEnabled) {
    window.setTimeout(() => {
      speak(getPhaseAnnouncement(phaseType, coldType), volume)
    }, 400)
  }
}

export function announceCompletion(voiceEnabled: boolean, volume: number): void {
  playCompletionSound(volume)
  if (voiceEnabled) {
    window.setTimeout(() => speak('Session complete. Great work.', volume), 800)
  }
}

export function announceWarning(
  seconds: number,
  voiceEnabled: boolean,
  volume: number,
): void {
  if (seconds === 30) {
    playChime(volume * 0.7)
    if (voiceEnabled) speak('30 seconds remaining', volume)
    return
  }
  if (seconds === 10) {
    playBeep(660, 0.15, volume * 0.6)
    if (voiceEnabled) speak('10 seconds', volume)
    return
  }
  if (seconds <= 5) {
    playBeep(600, 0.1, volume * 0.5)
  }
}

export function announceTransition(
  nextLabel: string,
  voiceEnabled: boolean,
  volume: number,
): void {
  playChime(volume)
  if (voiceEnabled) {
    speak(`Move to ${nextLabel}`, volume)
  }
}
