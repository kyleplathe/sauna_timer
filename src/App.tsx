import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CustomBuilder } from './components/Programs/CustomBuilder'
import { PresetSelector } from './components/Programs/PresetSelector'
import { ProtocolGuide } from './components/Education/ProtocolGuide'
import { SafetyTips } from './components/Education/SafetyTips'
import { SessionHistory } from './components/Session/SessionHistory'
import { SessionStats } from './components/Session/SessionStats'
import { ShareStatsCard } from './components/Session/ShareStatsCard'
import { Settings } from './components/Settings'
import { TimerDisplay } from './components/Timer/TimerDisplay'
import { useAudio } from './hooks/useAudio'
import { useSessionStorage } from './hooks/useSessionStorage'
import { useTimer } from './hooks/useTimer'
import type { Program } from './types/timer'
import {
  isLiveStatus,
  sessionFromProgress,
  type ActiveSessionCheckpoint,
  type ResumeDecision,
} from './utils/activeSession'
import {
  clearActiveSession,
  readBestResume,
  readLocalResume,
  saveActiveSession,
} from './utils/activeSessionStore'
import { downloadHealthData } from './utils/healthExport'
import { formatClock, phaseLabel, PRESET_PROGRAMS } from './utils/protocols'
import {
  cancelScheduledPhaseEndAlarm,
  schedulePhaseEndAlarm,
  unlockSessionAudio,
} from './utils/scheduledAlarm'
import type { EngineEvent } from './utils/timerEngine'

type View =
  | 'home'
  | 'timer'
  | 'custom'
  | 'history'
  | 'education'
  | 'safety'
  | 'settings'

const NAV: { id: View; label: string }[] = [
  { id: 'home', label: 'Programs' },
  { id: 'custom', label: 'Custom' },
  { id: 'history', label: 'History' },
  { id: 'education', label: 'Guide' },
  { id: 'safety', label: 'Safety' },
]

function resumeNotice(advanced: boolean, audioOn: boolean): string {
  const lead = advanced
    ? 'That phase ended while the app was closed. Picked up on the next one.'
    : 'Picked up your session where it left off.'
  return audioOn ? `${lead} Tap to turn alerts back on.` : lead
}

function App() {
  const bootResume = useState(() => readLocalResume())[0]
  const restored = bootResume?.kind === 'resume' ? bootResume : null
  const [view, setView] = useState<View>(restored ? 'timer' : 'home')
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(
    restored?.checkpoint.program ?? null,
  )
  const [editingProgram, setEditingProgram] = useState<Program | undefined>()
  const [resumeAlert, setResumeAlert] = useState(Boolean(restored))
  const [resumeAdvanced, setResumeAdvanced] = useState(restored?.advancedPhase ?? false)
  const [historyNote, setHistoryNote] = useState<string | null>(null)
  const sessionMeta = useRef(
    restored
      ? { id: restored.checkpoint.sessionId, startedAt: restored.checkpoint.startedAt }
      : { id: '', startedAt: 0 },
  )
  const userTookOver = useRef(false)
  const recoverySettled = useRef(bootResume?.kind === 'resume')

  const {
    sessions,
    customPrograms,
    settings,
    stats,
    saveSession,
    deleteSession,
    saveCustomProgram,
    deleteCustomProgram,
    updateSettings,
  } = useSessionStorage()

  const audio = useAudio(settings.audio)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const saveSessionRef = useRef(saveSession)
  saveSessionRef.current = saveSession
  const selectedProgramRef = useRef(selectedProgram)
  selectedProgramRef.current = selectedProgram
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const timerRef = useRef<ReturnType<typeof useTimer> | null>(null)
  const stopRef = useRef<() => void>(() => {})
  const transitionRef = useRef(10)

  // Keep the dry-run demo snappy so it clearly ends after one heat + cold.
  const transitionSeconds =
    selectedProgram?.id === 'practice'
      ? Math.min(5, settings.handsFreeTransitionDuration)
      : settings.handsFreeTransitionDuration
  transitionRef.current = transitionSeconds

  const flushActiveSession = useCallback(() => {
    const program = selectedProgramRef.current
    const meta = sessionMeta.current
    const api = timerRef.current
    if (!program || !meta.startedAt || !api) return
    const state = api.getState()
    if (!isLiveStatus(state.status)) return
    const now = Date.now()
    const checkpoint: ActiveSessionCheckpoint = {
      version: 1,
      sessionId: meta.id,
      startedAt: meta.startedAt,
      updatedAt: now,
      program,
      state,
      phaseEndsAt: api.getPhaseEndsAt(),
      handsFree: settingsRef.current.handsFreeModeEnabled,
      transitionSeconds: transitionRef.current,
    }
    saveActiveSession(checkpoint)
    saveSessionRef.current(sessionFromProgress(checkpoint, state, now, false))
  }, [])

  const commitSession = useCallback((completed: boolean) => {
    const program = selectedProgramRef.current
    const meta = sessionMeta.current
    const state = timerRef.current?.getState()
    if (program && meta.startedAt && state) {
      saveSessionRef.current(
        sessionFromProgress(
          {
            sessionId: meta.id,
            startedAt: meta.startedAt,
            program,
          },
          state,
          Date.now(),
          completed,
        ),
      )
    }
    sessionMeta.current = { id: '', startedAt: 0 }
    clearActiveSession()
  }, [])

  const finishRecovered = useCallback((decision: Extract<ResumeDecision, { kind: 'finished' }>) => {
    if (recoverySettled.current) return
    recoverySettled.current = true
    saveSessionRef.current(
      sessionFromProgress(decision.checkpoint, decision.state, Date.now(), true),
    )
    sessionMeta.current = { id: '', startedAt: 0 }
    clearActiveSession()
    setSelectedProgram(null)
    setResumeAlert(false)
    setHistoryNote('The timer finished this session while the app was closed. It is saved below.')
    setView('history')
  }, [])

  const applyResume = useCallback((decision: Extract<ResumeDecision, { kind: 'resume' }>) => {
    recoverySettled.current = true
    sessionMeta.current = {
      id: decision.checkpoint.sessionId,
      startedAt: decision.checkpoint.startedAt,
    }
    setSelectedProgram(decision.checkpoint.program)
    setResumeAdvanced(decision.advancedPhase)
    setResumeAlert(true)
    setView('timer')
    timerRef.current?.hydrate(decision.checkpoint.state, decision.checkpoint.phaseEndsAt)
  }, [])

  const handleEvent = useCallback((event: EngineEvent) => {
    const volume = settings.audio.volume
    if (event.type === 'phaseStart') {
      audioRef.current.playPhaseChangeSound(event.phase.type)
      if (settings.audio.enabled) {
        schedulePhaseEndAlarm(event.phase.duration * 1000, volume)
      }
    }
    if (event.type === 'warning') {
      audioRef.current.playWarningSound(event.secondsRemaining)
    }
    if (event.type === 'transitionStart') {
      // Immediate "move now" cue, then alarm again when the walk timer ends.
      audioRef.current.playTransitionCue(
        phaseLabel(
          event.nextPhase.type,
          selectedProgram?.coldType ?? 'shower',
        ),
      )
      if (settings.audio.enabled) {
        schedulePhaseEndAlarm(transitionSeconds * 1000, volume)
      }
    }
    if (event.type === 'phaseEnd') {
      cancelScheduledPhaseEndAlarm()
    }
    if (event.type === 'complete') {
      cancelScheduledPhaseEndAlarm()
      audioRef.current.playCompletionSound()
      commitSession(true)
      timerRef.current?.stop()
      setResumeAlert(false)
      setSelectedProgram(null)
      setView('history')
    }
  }, [
    commitSession,
    selectedProgram?.coldType,
    settings.audio.enabled,
    settings.audio.volume,
    transitionSeconds,
  ])

  const timer = useTimer({
    program: selectedProgram,
    handsFree: settings.handsFreeModeEnabled,
    transitionSeconds,
    onEvent: handleEvent,
    initialState: restored?.checkpoint.state,
    initialPhaseEndsAt: restored?.checkpoint.phaseEndsAt,
  })
  timerRef.current = timer

  const currentPhase =
    selectedProgram?.phases[timer.state.phaseIndex] ?? selectedProgram?.phases[0]

  const liveActive =
    view === 'timer' &&
    !!selectedProgram &&
    timer.state.status !== 'idle' &&
    timer.state.status !== 'complete'

  useEffect(() => {
    const baseTitle = 'Ember & Ice — Contrast Therapy Timer'
    if (!liveActive || !currentPhase) {
      document.title = baseTitle
      return
    }
    const label =
      timer.state.status === 'transition'
        ? 'Walk'
        : timer.state.status === 'paused'
          ? 'Paused'
          : phaseLabel(
              currentPhase.type,
              selectedProgram?.coldType ?? settings.preferredColdType,
            )
    document.title = `${formatClock(timer.state.remainingMs / 1000)} · ${label}`
  }, [
    currentPhase,
    liveActive,
    selectedProgram?.coldType,
    settings.preferredColdType,
    timer.state.remainingMs,
    timer.state.status,
  ])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }, [settings.darkMode])

  useEffect(() => {
    flushActiveSession()
  }, [
    flushActiveSession,
    selectedProgram,
    settings.handsFreeModeEnabled,
    timer.state.completedPhases,
    timer.state.pausedFrom,
    timer.state.phaseIndex,
    timer.state.round,
    timer.state.status,
    transitionSeconds,
  ])

  useEffect(() => {
    if (!isLiveStatus(timer.state.status)) return
    const id = window.setInterval(() => flushActiveSession(), 15_000)
    return () => window.clearInterval(id)
  }, [flushActiveSession, timer.state.status])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushActiveSession()
    }
    window.addEventListener('pagehide', flushActiveSession)
    window.addEventListener('freeze', flushActiveSession)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flushActiveSession)
      window.removeEventListener('freeze', flushActiveSession)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flushActiveSession])

  useEffect(() => {
    if (bootResume?.kind === 'finished') finishRecovered(bootResume)
  }, [bootResume, finishRecovered])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const decision = await readBestResume()
      if (cancelled || userTookOver.current) return
      if (bootResume?.kind === 'resume') {
        if (
          decision?.kind === 'resume' &&
          decision.checkpoint.updatedAt > bootResume.checkpoint.updatedAt
        ) {
          applyResume(decision)
        }
        return
      }
      if (bootResume?.kind === 'finished') return
      if (!decision || decision.kind === 'stale') {
        if (decision?.kind === 'stale' || bootResume?.kind === 'stale') clearActiveSession()
        return
      }
      if (decision.kind === 'finished') finishRecovered(decision)
      else applyResume(decision)
    })()
    return () => {
      cancelled = true
    }
  }, [applyResume, bootResume, finishRecovered])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const api = timerRef.current
      if (view !== 'timer' || !api) return
      if (event.key === ' ' && api.state.status === 'running') {
        event.preventDefault()
        api.pause()
      } else if (event.key === ' ' && api.state.status === 'paused') {
        event.preventDefault()
        api.resume()
      } else if (event.key === 'n' || event.key === 'N') {
        api.skip()
      } else if (event.key === 'Escape') {
        stopRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const availablePrograms = useMemo(() => {
    const presets = PRESET_PROGRAMS.filter((program) => {
      if (program.id === 'practice') return !settings.practiceDismissed
      return program.coldType === settings.preferredColdType
    })
    return [...presets, ...customPrograms]
  }, [customPrograms, settings.preferredColdType, settings.practiceDismissed])

  const handleStart = () => {
    userTookOver.current = true
    sessionMeta.current = {
      id: `session-${Date.now()}`,
      startedAt: Date.now(),
    }
    if (settings.audio.enabled) {
      // Gesture unlock for Web Audio countdown + deferred phase-end HTMLAudio.
      unlockSessionAudio()
    }
    timer.start()
    flushActiveSession()
  }

  const handleStop = () => {
    userTookOver.current = true
    cancelScheduledPhaseEndAlarm()
    commitSession(false)
    timer.stop()
    setResumeAlert(false)
    setSelectedProgram(null)
    setView('home')
  }
  stopRef.current = handleStop

  const handlePause = () => {
    cancelScheduledPhaseEndAlarm()
    timer.pause()
    flushActiveSession()
  }

  const handleResume = () => {
    const remainingMs = timer.state.remainingMs
    if (settings.audio.enabled) {
      unlockSessionAudio()
    }
    timer.resume()
    flushActiveSession()
    if (settings.audio.enabled && remainingMs > 0) {
      schedulePhaseEndAlarm(remainingMs, settings.audio.volume)
    }
  }

  const handleSkip = () => {
    cancelScheduledPhaseEndAlarm()
    timer.skip()
    flushActiveSession()
  }

  const handleContinue = () => {
    timer.continueNext()
    flushActiveSession()
  }

  const acknowledgeResume = () => {
    setResumeAlert(false)
    if (!settings.audio.enabled) return
    const state = timer.getState()
    unlockSessionAudio()
    if (
      (state.status === 'running' || state.status === 'transition') &&
      state.remainingMs > 0
    ) {
      schedulePhaseEndAlarm(state.remainingMs, settings.audio.volume)
    }
  }

  return (
    <div className="app-shell bg-[#f6efe6] text-stone-900 transition-colors dark:bg-[#0c0a09] dark:text-stone-100">
      {view !== 'timer' && (
        <header className="app-header sticky top-0 z-20 border-b border-stone-200/70 bg-[#f6efe6]/90 backdrop-blur dark:border-stone-800 dark:bg-[#0c0a09]/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <button onClick={() => setView('home')} className="text-left">
              <p className="text-xs tracking-[0.35em] text-orange-600 uppercase">
                Ember & Ice
              </p>
              <h1 className="font-display text-3xl">Sauna Timer</h1>
            </button>
            <div className="flex items-center gap-2">
              {import.meta.env.BASE_URL.includes('/sauna') ? (
                <a
                  href="/dev/"
                  className="rounded-full bg-stone-200 px-3 py-2 text-sm dark:bg-stone-800"
                >
                  Lab
                </a>
              ) : null}
              <button
                onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                className="rounded-full bg-stone-200 px-3 py-2 text-sm dark:bg-stone-800"
              >
                {settings.darkMode ? 'Light' : 'Dark'}
              </button>
              <button
                onClick={() => setView('settings')}
                className={`rounded-full px-4 py-2 text-sm ${view === 'settings' ? 'bg-orange-600 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
              >
                Settings
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-4">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`rounded-full px-4 py-2 text-sm whitespace-nowrap ${view === item.id ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-stone-200 dark:bg-stone-800'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>
      )}

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.main
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-6xl py-8"
          >
            <div className="px-4 text-center">
              <h2 className="font-display text-4xl">Choose a protocol</h2>
              <p className="mt-2 text-stone-500">
                Heat, then {settings.preferredColdType === 'shower' ? 'shower' : 'plunge'},
                then rest. Hands-free walk timers are{' '}
                {settings.handsFreeModeEnabled ? 'on' : 'off'}.
              </p>
            </div>
            <PresetSelector
              programs={availablePrograms}
              onSelect={(program) => {
                setSelectedProgram(program)
                setView('timer')
              }}
              onEdit={(program) => {
                setEditingProgram(program)
                setView('custom')
              }}
              onDelete={deleteCustomProgram}
              onDismissPractice={() =>
                updateSettings({ practiceDismissed: true })
              }
            />
          </motion.main>
        )}

        {view === 'timer' && selectedProgram && currentPhase && (
          <motion.div key="timer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TimerDisplay
              program={selectedProgram}
              currentPhase={currentPhase}
              remainingMs={timer.state.remainingMs}
              phaseDurationMs={timer.state.phaseDurationMs}
              currentRound={timer.state.round}
              status={timer.state.status}
              nextPhase={timer.nextPhase}
              temperatureUnit={settings.temperatureUnit}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onSkip={handleSkip}
              onContinue={handleContinue}
              resumeNotice={
                resumeAlert
                  ? resumeNotice(resumeAdvanced, settings.audio.enabled)
                  : null
              }
              onResumeNotice={acknowledgeResume}
            />
          </motion.div>
        )}

        {view === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8"
          >
            <CustomBuilder
              existingProgram={editingProgram}
              onSave={(program) => {
                saveCustomProgram(program)
                setEditingProgram(undefined)
                setView('home')
              }}
              onCancel={() => {
                setEditingProgram(undefined)
                setView('home')
              }}
            />
          </motion.div>
        )}

        {view === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-6xl py-8"
          >
            <SessionStats stats={stats} />
            {historyNote && (
              <p className="mx-4 mb-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
                {historyNote}
              </p>
            )}
            <ShareStatsCard stats={stats} />
            <SessionHistory
              sessions={sessions}
              onDelete={deleteSession}
              onExportHealth={() => downloadHealthData(sessions, 'csv')}
            />
          </motion.div>
        )}

        {view === 'education' && (
          <motion.div key="education" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProtocolGuide />
          </motion.div>
        )}

        {view === 'safety' && (
          <motion.div key="safety" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SafetyTips />
          </motion.div>
        )}

        {view === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Settings settings={settings} onUpdate={updateSettings} />
          </motion.div>
        )}
      </AnimatePresence>

      {!settings.disclaimerAccepted && view !== 'timer' && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 dark:bg-stone-900">
            <h3 className="font-display text-2xl">Not medical advice</h3>
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
              Contrast therapy is a wellness practice. Stop if you feel unwell,
              and talk to a clinician if you have heart disease, are pregnant, or
              have other medical conditions.
            </p>
            <button
              onClick={() => updateSettings({ disclaimerAccepted: true })}
              className="mt-5 w-full rounded-2xl bg-orange-600 py-3 font-semibold text-white"
            >
              I understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
