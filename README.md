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

This repo is ready for a Workers static-asset deploy at **https://dev.kyleplathe.com** (plus a `*.workers.dev` URL). Cloudflare has to authorize GitHub itself — that OAuth step cannot be completed from this agent.

### Preferred: Workers Builds (GitHub App)

1. Merge this change to `main`.
2. In the Cloudflare dashboard, open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Import a repository**.
3. Authorize the **Cloudflare Workers & Pages** GitHub App for `kyleplathe/sauna_timer`.
4. Import `kyleplathe/sauna_timer`. The Worker **name must be** `sauna-timer` (it has to match `wrangler.jsonc`).
5. Production branch: `main`.
6. **Build command:** `npm run build`
7. **Deploy command:** `npx wrangler deploy`
8. Save and deploy.

The first successful deploy attaches the custom domain from `wrangler.jsonc`. If `dev` already has a DNS record, delete that A/CNAME in the zone first so Cloudflare can create the Worker Custom Domain.

You can also start from Cloudflare’s import button:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kyleplathe/sauna_timer)

### Backup: GitHub Actions

If you would rather deploy from GitHub instead of Workers Builds, add repository secrets:

- `CLOUDFLARE_API_TOKEN` — token from [Create API token](https://dash.cloudflare.com/profile/api-tokens) using the **Edit Cloudflare Workers** template (include zone permission to attach custom domains)
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
