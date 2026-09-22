import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AppSettings } from '../types/timer'
import { requestLockScreenPermission } from '../utils/liveNotifications'

interface SettingsProps {
  settings: AppSettings
  onUpdate: (settings: Partial<AppSettings>) => void
}

export function Settings({ settings, onUpdate }: SettingsProps) {
  const [notifyStatus, setNotifyStatus] = useState<NotificationPermission | 'unsupported'>(
    () =>
      typeof Notification === 'undefined'
        ? 'unsupported'
        : Notification.permission,
  )

  const allowNotifications = async () => {
    const result = await requestLockScreenPermission()
    setNotifyStatus(result)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-6 p-6"
    >
      <h2 className="font-display text-4xl">Settings</h2>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm dark:bg-stone-900">
        <h3 className="text-xl font-semibold">Audio</h3>
        <Toggle
          label="Alerts"
          checked={settings.audio.enabled}
          onChange={(enabled) =>
            onUpdate({ audio: { ...settings.audio, enabled } })
          }
        />
        <Toggle
          label="Voice guidance"
          checked={settings.audio.voiceGuidance}
          disabled={!settings.audio.enabled}
          onChange={(voiceGuidance) =>
            onUpdate({ audio: { ...settings.audio, voiceGuidance } })
          }
        />
        <Toggle
          label="Countdown warnings"
          checked={settings.audio.warnings}
          disabled={!settings.audio.enabled}
          onChange={(warnings) =>
            onUpdate({ audio: { ...settings.audio, warnings } })
          }
        />
        <Toggle
          label="Duck music during cues"
          checked={settings.audio.duckMusic !== false}
          disabled={!settings.audio.enabled}
          onChange={(duckMusic) =>
            onUpdate({ audio: { ...settings.audio, duckMusic } })
          }
        />
        <p className="text-sm text-stone-500">
          Lowers (does not stop) background music while beeps and voice cues play,
          when the browser supports it.
        </p>
        <label className="block">
          <span className="mb-2 block text-sm text-stone-500">
            Volume {Math.round(settings.audio.volume * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.audio.volume}
            disabled={!settings.audio.enabled}
            onChange={(event) =>
              onUpdate({
                audio: { ...settings.audio, volume: Number(event.target.value) },
              })
            }
            className="w-full"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm dark:bg-stone-900">
        <h3 className="text-xl font-semibold">Hands-free</h3>
        <p className="text-sm text-stone-500">
          When a phase ends, a short alarm plays and a walk timer starts. When
          it hits zero, the next phase begins — no tapping with wet hands.
        </p>
        <Toggle
          label="Auto-advance with walk timer"
          checked={settings.handsFreeModeEnabled}
          onChange={(handsFreeModeEnabled) => onUpdate({ handsFreeModeEnabled })}
        />
        <label className="block">
          <span className="mb-2 block text-sm text-stone-500">
            Walk time {settings.handsFreeTransitionDuration}s
          </span>
          <input
            type="range"
            min={5}
            max={30}
            step={5}
            value={settings.handsFreeTransitionDuration}
            disabled={!settings.handsFreeModeEnabled}
            onChange={(event) =>
              onUpdate({
                handsFreeTransitionDuration: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm dark:bg-stone-900">
        <h3 className="text-xl font-semibold">Lock screen</h3>
        <p className="text-sm text-stone-500">
          Web apps cannot draw a real Dynamic Island. During a session we keep a
          quiet background audio heartbeat so phase-end alarms can still sound
          while the phone is locked, duck music briefly for cues (instead of
          stopping Spotify/Apple Music), and optionally show a sticky
          notification / Now Playing countdown.
        </p>
        <Toggle
          label="Live lock-screen timer"
          checked={settings.lockScreenLive !== false}
          onChange={(lockScreenLive) => onUpdate({ lockScreenLive })}
        />
        <Toggle
          label="Keep screen awake"
          checked={!!settings.keepScreenAwake}
          onChange={(keepScreenAwake) => onUpdate({ keepScreenAwake })}
        />
        <p className="text-sm text-stone-500">
          Leave screen-awake off if you want the phone to lock and show the live
          timer on the lock screen.
        </p>
        {notifyStatus !== 'unsupported' && (
          <button
            type="button"
            onClick={() => void allowNotifications()}
            disabled={notifyStatus === 'granted'}
            className="w-full rounded-xl bg-stone-900 py-3 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
          >
            {notifyStatus === 'granted'
              ? 'Notifications allowed'
              : notifyStatus === 'denied'
                ? 'Notifications blocked — enable in system Settings'
                : 'Allow lock-screen notifications'}
          </button>
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm dark:bg-stone-900">
        <h3 className="text-xl font-semibold">Preferences</h3>
        <Toggle
          label="Dark mode"
          checked={settings.darkMode}
          onChange={(darkMode) => onUpdate({ darkMode })}
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onUpdate({ preferredColdType: 'plunge' })}
            className={`rounded-xl py-3 ${settings.preferredColdType === 'plunge' ? 'bg-cyan-700 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
          >
            Plunge
          </button>
          <button
            onClick={() => onUpdate({ preferredColdType: 'shower' })}
            className={`rounded-xl py-3 ${settings.preferredColdType === 'shower' ? 'bg-cyan-700 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
          >
            Shower
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onUpdate({ temperatureUnit: 'C' })}
            className={`rounded-xl py-3 ${settings.temperatureUnit === 'C' ? 'bg-orange-600 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
          >
            °C
          </button>
          <button
            onClick={() => onUpdate({ temperatureUnit: 'F' })}
            className={`rounded-xl py-3 ${settings.temperatureUnit === 'F' ? 'bg-orange-600 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
          >
            °F
          </button>
        </div>
        {settings.practiceDismissed && (
          <button
            type="button"
            onClick={() => onUpdate({ practiceDismissed: false })}
            className="w-full rounded-xl bg-emerald-700 py-3 text-white"
          >
            Restore Dry run demo card
          </button>
        )}
      </section>
    </motion.div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-orange-600"
      />
    </label>
  )
}
