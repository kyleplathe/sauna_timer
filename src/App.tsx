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
import { useLiveActivity } from './hooks/useLiveActivity'
import { useSessionStorage } from './hooks/useSessionStorage'
import { useTimer } from './hooks/useTimer'
import type { Program, Session } from './types/timer'
import { downloadHealthData } from './utils/healthExport'
import { requestLockScreenPermission } from './utils/liveNotifications'
import { phaseLabel, PRESET_PROGRAMS } from './utils/protocols'
import {
  cancelScheduledPhaseEndAlarm,
  schedulePhaseEndAlarm,
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

function App() {
  const [view, setView] = useState<View>('home')
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [editingProgram, setEditingProgram] = useState<Program | undefined>()
  const sessionMeta = useRef({ id: '', startedAt: 0 })

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

  const audio = useAudio(
    settings.audio,
    selectedProgram?.coldType ?? settings.preferredColdType,
  )
  const audioRef = useRef(audio)
  audioRef.current = audio

  const persistSession = useCallback(
    (completed: boolean, completedPhases: number, totalPhaseCount: number) => {
      if (!selectedProgram || !sessionMeta.current.startedAt) return
      const session: Session = {
        id: sessionMeta.current.id,
        programId: selectedProgram.id,
        programName: selectedProgram.name,
        startTime: sessionMeta.current.startedAt,
        endTime: Date.now(),
        completedPhases,
        totalPhases: totalPhaseCount,
        duration: Math.max(
          1,
          Math.floor((Date.now() - sessionMeta.current.startedAt) / 1000),
        ),
        completed,
      }
      saveSession(session)
      sessionMeta.current = { id: '', startedAt: 0 }
    },
    [saveSession, selectedProgram],
  )
  const persistRef = useRef(persistSession)
  persistRef.current = persistSession
  const timerRef = useRef<ReturnType<typeof useTimer> | null>(null)

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
        schedulePhaseEndAlarm(
          settings.handsFreeTransitionDuration * 1000,
          volume,
        )
      }
    }
    if (event.type === 'phaseEnd') {
      cancelScheduledPhaseEndAlarm()
    }
    if (event.type === 'complete') {
      cancelScheduledPhaseEndAlarm()
      audioRef.current.playCompletionSound()
      persistRef.current(true, event.completedPhases, event.totalPhases)
      timerRef.current?.stop()
      setSelectedProgram(null)
      setView('history')
    }
  }, [
    selectedProgram?.coldType,
    settings.audio.enabled,
    settings.audio.volume,
    settings.handsFreeTransitionDuration,
  ])

  const timer = useTimer({
    program: selectedProgram,
    handsFree: settings.handsFreeModeEnabled,
    transitionSeconds: settings.handsFreeTransitionDuration,
    onEvent: handleEvent,
  })
  timerRef.current = timer

  const currentPhase =
    selectedProgram?.phases[timer.state.phaseIndex] ?? selectedProgram?.phases[0]

  const liveActive =
    view === 'timer' &&
    !!selectedProgram &&
    timer.state.status !== 'idle' &&
    timer.state.status !== 'complete'

  useLiveActivity({
    active: liveActive,
    phaseType: currentPhase?.type ?? null,
    coldType: selectedProgram?.coldType ?? settings.preferredColdType,
    remainingMs: timer.state.remainingMs,
    phaseDurationMs: timer.state.phaseDurationMs,
    status: timer.state.status,
    programName: selectedProgram?.name ?? 'Sauna Timer',
    keepScreenAwake: !!settings.keepScreenAwake,
    lockScreenLive: settings.lockScreenLive !== false,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }, [settings.darkMode])

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
        api.stop()
        setView('home')
        setSelectedProgram(null)
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
    sessionMeta.current = {
      id: `session-${Date.now()}`,
      startedAt: Date.now(),
    }
    if (settings.lockScreenLive !== false) {
      void requestLockScreenPermission()
    }
    timer.start()
  }

  const handleStop = () => {
    cancelScheduledPhaseEndAlarm()
    persistRef.current(
      false,
      timer.state.completedPhases,
      timer.totalPhaseCount,
    )
    timer.stop()
    setSelectedProgram(null)
    setView('home')
  }

  const handlePause = () => {
    cancelScheduledPhaseEndAlarm()
    timer.pause()
  }

  const handleResume = () => {
    const remainingMs = timer.state.remainingMs
    timer.resume()
    if (settings.audio.enabled && remainingMs > 0) {
      schedulePhaseEndAlarm(remainingMs, settings.audio.volume)
    }
  }

  const handleSkip = () => {
    cancelScheduledPhaseEndAlarm()
    timer.skip()
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
              onContinue={timer.continueNext}
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
