# Ember & Ice — Sauna Timer

A research-backed contrast therapy timer for sauna + cold shower or cold plunge.

Heat first. Cold second. End on cold. Hands-free walk timers so you do not have to tap a wet phone.

## Features

- Preset protocols: beginner, intermediate, advanced, quick recovery
- Dismissable **Dry run** demo card (restore anytime from Settings)
- Cold **shower** and cold **plunge** variants (defaults to shower)
- Custom protocols with save/edit/delete
- Hands-free mode: alarm at phase end, short walk countdown, auto-start next phase
- Voice cues and countdown beeps that **duck** background music when the browser allows (instead of stopping it)
- Live activity pill (Dynamic Island–style) plus screen wake lock and Now Playing metadata while a session runs
- Square social share card of your stats (save as photo or share via the system sheet)
- Session history, streaks, and CSV export for Apple Health import tools
- Protocol guide and safety notes
- Installable PWA, dark mode, large type you can read from across the room

## Develop

```bash
npm ci
npm run dev
```

Open the homepage at [http://localhost:5173](http://localhost:5173), the lab at [http://localhost:5173/dev/](http://localhost:5173/dev/), and the timer at [http://localhost:5173/dev/sauna/](http://localhost:5173/dev/sauna/).

```bash
npm test
npm run lint
npm run build
```

`npm run build` writes the splash to `dist/`, the lab to `dist/dev/`, and the timer to `dist/dev/sauna/`.

## Deploy to Cloudflare

- Home: https://kyleplathe.com
- Lab: https://kyleplathe.com/dev/
- Timer: https://kyleplathe.com/dev/sauna/
- Fallback: https://sauna-timer.kyleplathe.workers.dev

The Worker is the site origin (`custom_domain` on `kyleplathe.com`) so `/` can go live without the old host’s broken TLS. Prototypes stay under `/dev`. The splash is a stand-in until the blog is written.

If deploy fails with **100117**, delete the leftover apex **A / AAAA / CNAME** for `kyleplathe.com` (the record still pointing at the old origin), then retry the Worker build. Keep the zone on Cloudflare nameservers. Do not recreate `dev.kyleplathe.com`.

### Workers Builds (GitHub App)

Already connected for this repo. Settings that must stay in the dashboard:

- Worker name: `sauna-timer`
- Production branch: `main`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

If the live site falls behind `main`, open the Worker in Cloudflare → **Deployments** and confirm the latest Git deploy succeeded. Reconnect the GitHub App or click **Retry deployment** if builds stopped.

After deploy, in the Worker → Settings → Domains & Routes, remove any leftover **Custom Domain** on `dev.kyleplathe.com` if Cloudflare still shows one.

### Backup: GitHub Actions

`Deploy Worker` runs on every push to `main` (and via **Run workflow**). Add repository secrets:

- `CLOUDFLARE_API_TOKEN` — token from [Create API token](https://dash.cloudflare.com/profile/api-tokens) using the **Edit Cloudflare Workers** template (include zone permission to attach routes)
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard overview

Do not enable both Workers Builds auto-deploy and this Action, or every push will deploy twice. Prefer one path: either Workers Builds **or** this Action.

## Hands-free flow

1. Enable **Auto-advance with walk timer** in Settings (on by default).
2. Finish a sauna phase.
3. A short alarm plays and a walk countdown starts (default 10 seconds, 5–30s).
4. The next phase starts on its own.

## Apple Health

This is a web app, so it cannot write to HealthKit directly. History → **Export for Health** downloads a CSV of mindful-session rows (start, end, duration, activity). Import with Shortcuts or a Health CSV importer.

## Safety

Stop immediately if you feel dizzy, nauseous, or short of breath. This is not medical advice.
