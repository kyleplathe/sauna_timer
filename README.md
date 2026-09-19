# Ember & Ice — Sauna Timer

A research-backed contrast therapy timer for sauna + cold shower or cold plunge.

Heat first. Cold second. End on cold. Hands-free walk timers so you do not have to tap a wet phone.

## Features

- Preset protocols: beginner, intermediate, advanced, quick recovery
- Cold **shower** and cold **plunge** variants (defaults to shower)
- Custom protocols with save/edit/delete
- Hands-free mode: alarm at phase end, short walk countdown, auto-start next phase
- Voice cues and countdown beeps
- Session history, streaks, and CSV export for Apple Health import tools
- Protocol guide and safety notes
- Installable PWA, dark mode, large type you can read from across the room

## Develop

```bash
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm test
npm run lint
npm run build
```

## Deploy to Cloudflare

Production URLs after a successful Workers Builds deploy:

- https://sauna-timer.kyleplathe.workers.dev
- https://dev.kyleplathe.com

`dev.kyleplathe.com` is attached as a **Worker route** on the existing proxied DNS record in zone `kyleplathe.com`. Keep the `dev` record **proxied** (orange cloud). Do not use a Worker Custom Domain for this hostname while that A/CNAME exists — Cloudflare error 100117.

### Workers Builds (GitHub App)

Already connected for this repo. Settings that must stay in the dashboard:

- Worker name: `sauna-timer`
- Production branch: `main`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

### Backup: GitHub Actions

If you would rather deploy from GitHub instead of Workers Builds, add repository secrets:

- `CLOUDFLARE_API_TOKEN` — token from [Create API token](https://dash.cloudflare.com/profile/api-tokens) using the **Edit Cloudflare Workers** template (include zone permission to attach routes)
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard overview

Then run **Actions → Deploy Worker → Run workflow**. Do not enable both Workers Builds auto-deploy and this Action, or every push will deploy twice.

## Hands-free flow

1. Enable **Auto-advance with walk timer** in Settings (on by default).
2. Finish a sauna phase.
3. A short alarm plays and a walk countdown starts (default 10 seconds, 5–30s).
4. The next phase starts on its own.

## Apple Health

This is a web app, so it cannot write to HealthKit directly. History → **Export for Health** downloads a CSV of mindful-session rows (start, end, duration, activity). Import with Shortcuts or a Health CSV importer.

## Safety

Stop immediately if you feel dizzy, nauseous, or short of breath. This is not medical advice.
