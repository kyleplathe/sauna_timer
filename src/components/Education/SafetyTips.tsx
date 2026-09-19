import { motion } from 'framer-motion'

export function SafetyTips() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-5 p-6"
    >
      <h2 className="font-display text-4xl">Safety</h2>
      <section className="rounded-3xl border-2 border-red-300 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/40">
        <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">
          Step out immediately if you feel
        </h3>
        <ul className="mt-3 space-y-1 text-stone-800 dark:text-stone-200">
          <li>Dizziness, nausea, or confusion</li>
          <li>Chest pain or trouble breathing</li>
          <li>Extreme numbness or uncontrolled shivering</li>
        </ul>
      </section>
      <section className="rounded-3xl bg-sky-50 p-6 dark:bg-sky-950/30">
        <h3 className="text-xl font-semibold">Everyday rules</h3>
        <ul className="mt-3 space-y-2 text-stone-700 dark:text-stone-300">
          <li>Hydrate before, during rest, and after.</li>
          <li>No alcohol. It raises the risk of fainting.</li>
          <li>Start shorter and cooler than the advanced presets.</li>
          <li>Have someone nearby when you can.</li>
        </ul>
      </section>
      <section className="rounded-3xl bg-amber-50 p-6 dark:bg-amber-950/30">
        <h3 className="text-xl font-semibold">Talk to a clinician first if you have</h3>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Heart disease, uncontrolled blood pressure, arrhythmia, pregnancy,
          Raynaud’s, recent surgery, diabetes complications, kidney disease, or
          a seizure disorder.
        </p>
      </section>
      <p className="text-sm text-stone-500">
        This app is general wellness information, not medical advice. Use
        contrast therapy at your own risk and stop whenever something feels
        wrong.
      </p>
    </motion.div>
  )
}
