import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ColdType, Phase, Program } from '../../types/timer'
import { formatDuration } from '../../utils/protocols'

interface CustomBuilderProps {
  onSave: (program: Program) => void
  onCancel: () => void
  existingProgram?: Program
}

export function CustomBuilder({
  onSave,
  onCancel,
  existingProgram,
}: CustomBuilderProps) {
  const [name, setName] = useState(existingProgram?.name ?? '')
  const [description, setDescription] = useState(existingProgram?.description ?? '')
  const [rounds, setRounds] = useState(existingProgram?.rounds ?? 2)
  const [coldType, setColdType] = useState<ColdType>(
    existingProgram?.coldType ?? 'shower',
  )
  const [saunaDuration, setSaunaDuration] = useState(
    existingProgram?.phases[0]?.duration ?? 10 * 60,
  )
  const [coldDuration, setColdDuration] = useState(
    existingProgram?.phases[1]?.duration ?? 2 * 60,
  )
  const [restDuration, setRestDuration] = useState(
    existingProgram?.phases[2]?.duration ?? 5 * 60,
  )
  const [saunaTemp, setSaunaTemp] = useState(
    existingProgram?.phases[0]?.temperature?.value ?? 80,
  )
  const [coldTemp, setColdTemp] = useState(
    existingProgram?.phases[1]?.temperature?.value ?? 12,
  )
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      setError('Give this protocol a name.')
      return
    }

    const phases: Phase[] = [
      {
        type: 'sauna',
        duration: saunaDuration,
        temperature: { value: saunaTemp, unit: 'C' },
      },
      {
        type: 'cold',
        duration: coldDuration,
        temperature: { value: coldTemp, unit: 'C' },
      },
      { type: 'rest', duration: restDuration },
    ]

    onSave({
      id: existingProgram?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom protocol',
      rounds,
      coldType,
      phases,
      isPreset: false,
    })
  }

  const totalDuration = (saunaDuration + coldDuration + restDuration) * rounds - restDuration

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-xl dark:bg-stone-900"
    >
      <h2 className="font-display text-3xl text-stone-900 dark:text-white">
        {existingProgram ? 'Edit protocol' : 'Custom protocol'}
      </h2>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm text-stone-500">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Morning shower circuit"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 dark:border-stone-700 dark:bg-stone-800"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-stone-500">Notes</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 dark:border-stone-700 dark:bg-stone-800"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-stone-500">Rounds: {rounds}</span>
          <input
            type="range"
            min={1}
            max={6}
            value={rounds}
            onChange={(event) => setRounds(Number(event.target.value))}
            className="w-full"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setColdType('plunge')}
            className={`rounded-xl py-3 ${coldType === 'plunge' ? 'bg-cyan-700 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
          >
            Plunge
          </button>
          <button
            type="button"
            onClick={() => setColdType('shower')}
            className={`rounded-xl py-3 ${coldType === 'shower' ? 'bg-cyan-700 text-white' : 'bg-stone-200 dark:bg-stone-800'}`}
          >
            Shower
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm">Sauna {formatDuration(saunaDuration)}</span>
            <input
              type="range"
              min={20}
              max={1800}
              step={10}
              value={saunaDuration}
              onChange={(event) => setSaunaDuration(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm">Sauna {saunaTemp}°C</span>
            <input
              type="range"
              min={60}
              max={100}
              value={saunaTemp}
              onChange={(event) => setSaunaTemp(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm">
              Cold {formatDuration(coldDuration)}
            </span>
            <input
              type="range"
              min={10}
              max={600}
              step={10}
              value={coldDuration}
              onChange={(event) => setColdDuration(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm">Cold {coldTemp}°C</span>
            <input
              type="range"
              min={4}
              max={20}
              value={coldTemp}
              onChange={(event) => setColdTemp(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm">Rest {formatDuration(restDuration)}</span>
            <input
              type="range"
              min={0}
              max={900}
              step={10}
              value={restDuration}
              onChange={(event) => setRestDuration(Number(event.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-orange-100 to-cyan-100 p-4 dark:from-orange-950/40 dark:to-cyan-950/40">
          <p className="text-sm text-stone-500">Session length (ends on cold)</p>
          <p className="text-2xl font-semibold">{formatDuration(totalDuration)}</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-stone-200 py-3 dark:bg-stone-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 py-3 font-semibold text-white"
          >
            Save protocol
          </button>
        </div>
      </div>
    </motion.div>
  )
}
