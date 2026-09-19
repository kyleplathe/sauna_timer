import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const hubDir = path.join(rootDir, 'hub')

function hubDevServer(): Plugin {
  const mime: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.ico': 'image/x-icon',
  }

  const sitePlaceholder = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kyle Plathe</title>
    <style>
      body { font-family: Outfit, ui-sans-serif, system-ui, sans-serif; margin: 0; background: #070708; color: #f4f1ea; }
      main { max-width: 40rem; margin: 20vh auto; padding: 0 1.5rem; }
      a { color: #c4f542; }
    </style>
  </head>
  <body>
    <main>
      <p>kyleplathe.com</p>
      <h1>Personal site</h1>
      <p>This URL is reserved for the blog. Prototypes live at <a href="/dev/">/dev</a>.</p>
    </main>
  </body>
</html>`

  return {
    name: 'kyleplathe-hub-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0]
        if (
          url.startsWith('/dev/sauna') ||
          url.startsWith('/@') ||
          url.startsWith('/src') ||
          url.startsWith('/node_modules')
        ) {
          next()
          return
        }

        if (url === '/' || url === '/index.html') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(sitePlaceholder)
          return
        }

        if (url !== '/dev' && url !== '/dev/' && !url.startsWith('/dev/')) {
          next()
          return
        }

        const relative =
          url === '/dev' || url === '/dev/'
            ? 'index.html'
            : url.replace(/^\/dev\//, '')
        const file = path.resolve(hubDir, relative)
        if (!file.startsWith(hubDir + path.sep) && file !== hubDir) {
          next()
          return
        }
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
          next()
          return
        }

        res.setHeader(
          'Content-Type',
          mime[path.extname(file)] ?? 'application/octet-stream',
        )
        res.end(fs.readFileSync(file))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), hubDevServer()],
  base: '/dev/sauna/',
  build: {
    outDir: 'dist/dev/sauna',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
