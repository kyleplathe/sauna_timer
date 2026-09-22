# kyleplathe.com

Personal site / blog for [kyleplathe.com](https://kyleplathe.com).

Prototypes (lab + sauna timer) live in a **separate** Worker from [`kyleplathe/sauna_timer`](https://github.com/kyleplathe/sauna_timer) under `/dev`.

## Deploy order (important)

1. Push this repo and deploy Worker `kyle-plathe` so it claims the apex `kyleplathe.com` custom domain.
2. Then merge/deploy the sauna_timer PR that drops apex and only keeps `kyleplathe.com/dev*`.

If you reverse the order, the apex goes blank until this Worker is attached.

## Setup

```bash
npm i
npx wrangler login   # or set CLOUDFLARE_API_TOKEN
npm run deploy
```

In Cloudflare → Workers → `kyle-plathe` → Domains & Routes, confirm **Custom Domain** `kyleplathe.com`.

Optional: connect Workers Builds to this repo (`main`, deploy command `npx wrangler deploy`).

## Local

```bash
npm run dev
```

## Writing later

Replace `index.html` with your blog stack (Astro, Eleventy, etc.) as long as the Worker still owns the apex.
