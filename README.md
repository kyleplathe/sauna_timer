# Ember & Ice — Sauna Timer

A research-backed contrast therapy timer for sauna + cold shower or cold plunge.

Heat first. Cold second. End on cold. Hands-free walk timers so you do not have to tap a wet phone.

## Features

- Preset protocols: beginner, intermediate, advanced, quick recovery
- Dismissable **Dry run** demo card (restore anytime from Settings)
- Cold **shower** and cold **plunge** variants (defaults to shower)
- Custom protocols with save/edit/delete
- Hands-free mode: alarm at phase end, short walk countdown, auto-start next phase
- Voice / beep cues that **mix over** background music by default (optional “pause music for louder alerts”)
- Rising tone countdown on the last 5 seconds of each phase
- **Keep screen awake** during sessions (recommended) so phase-end alarms stay reliable without stealing Spotify
- Optional sticky lock-screen notification (web apps cannot do a real Live Activity)
- Square social share card of your stats (save as photo or share via the system sheet)
- Session history, streaks, and CSV export for Apple Health import tools
- Protocol guide, science explainers (heat/cold physiology + sources), and safety notes
- Installable PWA, dark mode, large type you can read from across the room

## Develop

```bash
npm ci
npm run dev
```

Open the lab at [http://localhost:5173/dev/](http://localhost:5173/dev/) and the timer at [http://localhost:5173/dev/sauna/](http://localhost:5173/dev/sauna/). Root redirects to `/dev/`.

```bash
npm test
npm run lint
npm run build
```

`npm run build` writes the lab to `dist/dev/` and the timer to `dist/dev/sauna/`. The personal blog at the apex of kyleplathe.com is **not** part of this Worker.

## Deploy to Cloudflare

- Lab: https://kyleplathe.com/dev/
- Timer: https://kyleplathe.com/dev/sauna/
- Worker fallback: https://sauna-timer.kyleplathe.workers.dev
- Personal blog (separate repo): https://kyleplathe.com → [`kyleplathe/kyle_plathe`](https://github.com/kyleplathe/kyle_plathe)

This Worker only claims `kyleplathe.com/dev` and `kyleplathe.com/dev/*`. Point the apex `kyleplathe.com` at the blog Worker (`kyle-plathe`).

### Split deploy order

1. Deploy the blog Worker so it owns the apex custom domain.
2. Merge this repo’s change that drops apex from `sauna-timer` (keeps `/dev` only).
3. In Cloudflare → Workers → `sauna-timer` → Domains & Routes, remove any leftover **Custom Domain** on apex `kyleplathe.com` if it still shows one.

If deploy fails with **100117**, clean leftover apex **A / AAAA / CNAME** records that still fight the blog origin. Keep the zone on Cloudflare nameservers. Do not recreate `dev.kyleplathe.com`.

### Workers Builds (GitHub App)

Already connected for this repo. Settings that must stay in the dashboard:

- Worker name: `sauna-timer`
- Production branch: `main`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

If the live site falls behind `main`, open the Worker in Cloudflare → **Deployments** and confirm the latest Git deploy succeeded. Reconnect the GitHub App or click **Retry deployment** if builds stopped.

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

## Sauna session tips

1. Install the timer to your home screen.
2. Leave **Keep screen awake** on (default) — most reliable for alarms + music.
3. Leave **Voice guidance** off if you want Spotify/Apple Music uninterrupted (voice often pauses music on iPhone).
4. Leave **Pause music for louder alerts** off so beeps mix over your music.
5. Start music, start a session, and let the phase-end alarm (and last-5-second tones) tell you when to move.

Lock-screen Live Activities are not available to web apps; always-on screen is the practical path.

## Apple Health

This is a web app, so it cannot write to HealthKit directly. History → **Export for Health** downloads a CSV of mindful-session rows (start, end, duration, activity). Import with Shortcuts or a Health CSV importer.

## Safety

Stop immediately if you feel dizzy, nauseous, or short of breath. This is not medical advice.
