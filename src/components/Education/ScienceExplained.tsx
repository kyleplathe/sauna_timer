import { motion } from 'framer-motion'
import { FlameIcon, SnowflakeIcon } from '../Icons'

type Source = {
  label: string
  detail: string
}

const SOURCES: Source[] = [
  {
    label: 'Laukkanen et al., JAMA Internal Medicine (2015)',
    detail:
      'Finnish cohort: more frequent sauna bathing linked with lower cardiovascular and all-cause mortality.',
  },
  {
    label: 'Laukkanen & Laukkanen, Mayo Clinic Proceedings (2018)',
    detail:
      'Review of sauna cardiovascular benefits, blood pressure, and endothelial function.',
  },
  {
    label: 'Šrámek et al., European Journal of Applied Physiology (2000)',
    detail:
      'Cold-water immersion sharply raises norepinephrine and other catecholamines.',
  },
  {
    label: 'van Marken Lichtenbelt et al., New England Journal of Medicine (2009)',
    detail:
      'Mild cold activates brown adipose tissue in healthy adults.',
  },
  {
    label: 'Tipton et al., Experimental Physiology (2017)',
    detail:
      'Overview of cold-water immersion physiology, risks, and proposed recovery effects.',
  },
]

export function ScienceExplained() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-5 p-6"
    >
      <div>
        <h2 className="font-display text-4xl">What heat & cold do</h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          A plain-language tour of what happens in your body — and why people
          chase the benefits — grounded in published physiology research.
        </p>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-orange-100 to-red-100 p-6 dark:from-orange-950/40 dark:to-red-950/30">
        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <FlameIcon className="h-6 w-6" />
          <h3 className="text-xl font-semibold">When you heat up</h3>
        </div>
        <ol className="mt-4 space-y-4 text-stone-700 dark:text-stone-300">
          <li>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Blood vessels open
            </p>
            <p className="mt-1">
              Skin and muscle vessels dilate so heat can escape. Heart rate and
              cardiac output rise — a load similar to light-to-moderate aerobic
              work, without moving your limbs.
            </p>
          </li>
          <li>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Cells launch a repair program
            </p>
            <p className="mt-1">
              Heat shock proteins help other proteins fold correctly under
              stress. Regular heat exposure is studied as a way to build that
              cellular resilience over time.
            </p>
          </li>
          <li>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Vessel linings get a workout
            </p>
            <p className="mt-1">
              Shear stress and nitric-oxide signaling improve endothelial
              function. Observational Finnish data associate frequent sauna use
              with healthier blood pressure and lower long-term heart risk —
              correlation, not a guarantee for every person.
            </p>
          </li>
        </ol>
        <p className="mt-4 rounded-2xl bg-white/50 px-4 py-3 text-sm text-stone-700 dark:bg-black/20 dark:text-stone-300">
          <span className="font-semibold">Why it feels good:</span> muscles
          loosen, perceived stress often drops, and after you cool down the
          parasympathetic system can rebound into a calm, recovered state.
        </p>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-cyan-100 to-sky-100 p-6 dark:from-cyan-950/40 dark:to-sky-950/30">
        <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
          <SnowflakeIcon className="h-6 w-6" />
          <h3 className="text-xl font-semibold">When you cool down</h3>
        </div>
        <ol className="mt-4 space-y-4 text-stone-700 dark:text-stone-300">
          <li>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Vessels clamp down
            </p>
            <p className="mt-1">
              Cold triggers vasoconstriction. Blood is pulled toward the core to
              protect vital organs. When you rewarm, vessels open again — a
              vascular “squeeze and release” that contrast protocols lean on.
            </p>
          </li>
          <li>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Alertness chemicals surge
            </p>
            <p className="mt-1">
              Immersion studies show large spikes in norepinephrine (and related
              catecholamines). That is a big part of the clear-headed, wired-
              awake feeling after a plunge or cold shower.
            </p>
          </li>
          <li>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              You make heat on purpose
            </p>
            <p className="mt-1">
              Shivering and non-shivering thermogenesis raise energy use. Mild
              cold can activate brown adipose tissue, which burns fuel to
              produce heat.
            </p>
          </li>
        </ol>
        <p className="mt-4 rounded-2xl bg-white/50 px-4 py-3 text-sm text-stone-700 dark:bg-black/20 dark:text-stone-300">
          <span className="font-semibold">Why it helps:</span> short cold bouts
          are studied for mood/alertness, perceived recovery, and metabolic
          signaling. Very long or extreme cold is not “more better” — dose and
          safety matter.
        </p>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-amber-100 to-orange-50 p-6 dark:from-amber-950/30 dark:to-orange-950/20">
        <h3 className="text-xl font-semibold">Why contrast (heat → cold)</h3>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Heat opens the pipes; cold closes them. Alternating creates repeated
          changes in blood flow and autonomic tone. Ending on cold leaves most
          people alert instead of overheated — which is why this timer finishes
          cold by default.
        </p>
        <ul className="mt-3 space-y-2 text-stone-700 dark:text-stone-300">
          <li>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              Circulation swing:
            </span>{' '}
            dilation then constriction, then recovery at room temperature.
          </li>
          <li>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              Nervous system reset:
            </span>{' '}
            heat can sedate; cold can activate — useful bookends in one session.
          </li>
          <li>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              Training caveat:
            </span>{' '}
            cold right after heavy lifting may blunt hypertrophy signals; many
            athletes save deep cold for rest days or well after strength work.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-900/50">
        <h3 className="text-xl font-semibold">Evidence snapshot</h3>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          These are real papers the summaries above draw from. They support
          mechanisms and associations — not a prescription for every body.
        </p>
        <ul className="mt-4 space-y-3">
          {SOURCES.map((source) => (
            <li key={source.label} className="text-sm">
              <p className="font-medium text-stone-900 dark:text-stone-100">
                {source.label}
              </p>
              <p className="mt-0.5 text-stone-600 dark:text-stone-400">
                {source.detail}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-stone-500">
          Wellness education only — not medical advice. Individual responses
          vary; talk with a clinician if you have cardiovascular or other
          health conditions.
        </p>
      </section>
    </motion.div>
  )
}
