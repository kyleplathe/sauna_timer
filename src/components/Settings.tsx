import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AppSettings } from '../types/timer'
import { requestLockScreenPermission } from '../utils/liveNotifications'

interface SettingsProps {
  settings: AppSettings
  onUpdate: (settings: Partial<AppSettings>) => void
}

function readNotifyStatus(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function Settings({ settings, onUpdate }: SettingsProps) {
  const [notifyStatus, setNotifyStatus] = useState<NotificationPermission | 'unsupported'>(
    readNotifyStatus,
  )

  useEffect(() => {
    const onFocus = () => setNotifyStatus(readNotifyStatus())
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

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
        <p className="text-sm text-stone-500">
          Voice often pauses Spotify/Apple Music on iPhone. Leave it off and use
          beeps if you want music uninterrupted.
        </p>
        <Toggle
          label="Countdown warnings"
          checked={settings.audio.warnings}
          disabled={!settings.audio.enabled}
          onChange={(warnings) =>
            onUpdate({ audio: { ...settings.audio, warnings } })
          }
        />
        <p className="text-sm text-stone-500">
          Beeps at 30s and 10s, then a rising tone each second for the last 5.
        </p>
        <Toggle
          label="Pause music for louder alerts"
          checked={!!settings.audio.duckMusic}
          disabled={!settings.audio.enabled}
          onChange={(duckMusic) =>
            onUpdate({ audio: { ...settings.audio, duckMusic } })
          }
        />
        <p className="text-sm text-stone-500">
          Off (recommended): alerts mix over your music. On: may pause Spotify
          briefly so beeps are clearer.
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
        <h3 className="text-xl font-semibold">Screen & lock</h3>
        <p className="text-sm text-stone-500">
          Keep the screen awake during a session so phase-end alarms stay
          reliable and Spotify/Apple Music keep playing. Lock-screen Live
          Activities are not available to web apps.
        </p>
        <Toggle
          label="Keep screen awake"
          checked={!!settings.keepScreenAwake}
          onChange={(keepScreenAwake) => onUpdate({ keepScreenAwake })}
        />
        <p className="text-sm text-stone-500">
          Recommended on for sauna use. Alerts mix over your music; turn off
          voice guidance if music still pauses.
        </p>
        <Toggle
          label="Sticky lock-screen notification"
          checked={!!settings.lockScreenLive}
          onChange={(lockScreenLive) => onUpdate({ lockScreenLive })}
        />
        {notifyStatus !== 'unsupported' && (
          <button
            type="button"
            onClick={() => void allowNotifications()}
            disabled={notifyStatus === 'granted' || !settings.lockScreenLive}
            className="w-full rounded-xl bg-stone-900 py-3 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
          >
            {notifyStatus === 'granted'
              ? 'Notifications allowed'
              : notifyStatus === 'denied'
                ? 'Notifications blocked — enable in system Settings'
                : 'Allow notifications'}
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
