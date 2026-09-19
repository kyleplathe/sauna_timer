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

Open the lab at [http://localhost:5173](http://localhost:5173) and the timer at [http://localhost:5173/sauna/](http://localhost:5173/sauna/).

```bash
npm test
npm run lint
npm run build
```

`npm run build` writes the lab to `dist/` and the timer to `dist/sauna/` (Vite `base` is `/sauna/`).

## Deploy to Cloudflare

Production URLs after a successful Workers Builds deploy:

- Lab home: https://dev.kyleplathe.com
- Sauna timer: https://dev.kyleplathe.com/sauna/
- Always-on fallback: https://sauna-timer.kyleplathe.workers.dev (and `/sauna/` after this Worker is rebuilt)

`dev.kyleplathe.com` must be a **Worker Custom Domain**. Cloudflare then owns DNS and TLS for that hostname. The Worker is the origin, so there is no handshake with IONOS or any other server.

### Fix Cloudflare error 525

`525 SSL handshake failed` means Cloudflare reached `dev` (orange-cloud proxy) and then tried HTTPS to the **old origin** behind that DNS record. That origin has no working certificate. The Worker never saw the request.

Do this in the Cloudflare dashboard, then retry the Worker build:

1. Open [DNS records for kyleplathe.com](https://dash.cloudflare.com/?to=/:account/kyleplathe.com/dns/records).
2. Delete **every** record whose name is `dev` (A, AAAA, and CNAME). Leave apex `kyleplathe.com` records alone unless you also want to repair the live site.
3. Workers & Pages → `sauna-timer` → **Retry** the latest build, or merge a commit that deploys with `custom_domain` for `dev.kyleplathe.com`.
4. Cloudflare will recreate `dev` as a Worker-managed record and issue the certificate.

Do not point `dev` at an IONOS IP, a Pages placeholder, or `workers.dev` as a CNAME. SSL/TLS mode can stay **Full (strict)**.

Apex `https://kyleplathe.com` is a separate 525: it still needs its own origin or its own Worker/Pages project. This repo only serves `dev.kyleplathe.com`.

### Workers Builds (GitHub App)

Already connected for this repo. Settings that must stay in the dashboard:

- Worker name: `sauna-timer`
- Production branch: `main`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

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
