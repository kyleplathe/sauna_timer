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

### DNS (kyleplathe.com zone)

The 525 is this proxied A record pointing at IONOS:

```
kyleplathe.com.  1  IN  A  74.208.236.165  ; cf-proxied:true
```

Delete **only that A record**. Cloudflare cannot attach a Worker Custom Domain while it exists (error 100117), and orange-cloud proxy to that IP is the SSL handshake failure.

Keep everything else:

- NS (`kenia` / `tosana`)
- MX (`mx00.ionos.com` / `mx01.ionos.com`)
- TXT SPF (`include:_spf-us.ionos.com`)
- CNAME `autodiscover`, `_dmarc`, `_domainconnect`

Do not add `dev.kyleplathe.com`. After the A record is gone, merge/retry the Worker build. Cloudflare will recreate the apex record for the Worker and issue the certificate.

### Workers Builds (GitHub App)

Already connected for this repo. Settings that must stay in the dashboard:

- Worker name: `sauna-timer`
- Production branch: `main`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

After deploy, in the Worker → Settings → Domains & Routes, remove any leftover **Custom Domain** on `dev.kyleplathe.com` if Cloudflare still shows one.

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
