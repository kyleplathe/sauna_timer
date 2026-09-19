import { motion } from 'framer-motion'

export function ProtocolGuide() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-5 p-6"
    >
      <h2 className="font-display text-4xl">Protocol guide</h2>
      <section className="rounded-3xl bg-gradient-to-br from-orange-100 to-red-100 p-6 dark:from-orange-950/40 dark:to-red-950/30">
        <h3 className="text-xl font-semibold">Why this order</h3>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Heat first, cold second, finish on cold. Sauna opens blood vessels;
          cold constricts them. Ending on cold leaves you alert instead of
          overheated.
        </p>
      </section>
      <section className="rounded-3xl bg-gradient-to-br from-cyan-100 to-sky-100 p-6 dark:from-cyan-950/40 dark:to-sky-950/30">
        <h3 className="text-xl font-semibold">Evidence-based ranges</h3>
        <ul className="mt-3 space-y-2 text-stone-700 dark:text-stone-300">
          <li>Sauna: 10–20 min at 65–90°C (150–195°F)</li>
          <li>Cold plunge: 2–5 min at 10–15°C (50–59°F)</li>
          <li>Cold shower: 90 seconds–4 min — a bit longer than a plunge</li>
          <li>Rest: 3–10 min at room temperature between rounds</li>
          <li>Rounds: 2–4, two to four sessions per week</li>
        </ul>
      </section>
      <section className="rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 p-6 dark:from-emerald-950/40 dark:to-teal-950/30">
        <h3 className="text-xl font-semibold">Training notes</h3>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Cold soon after endurance work can help next-day readiness. After
          heavy strength training, wait several hours or use a rest day so cold
          does not blunt muscle-growth signaling.
        </p>
      </section>
      <section className="rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 p-6 dark:from-violet-950/40 dark:to-fuchsia-950/30">
        <h3 className="text-xl font-semibold">Shower vs plunge</h3>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          A plunge is a stronger full-body hit, so durations stay shorter. A
          shower is more available and still effective if you stay under the
          water a little longer. This app defaults to shower because that is
          what most bathrooms have.
        </p>
      </section>
    </motion.div>
  )
}
