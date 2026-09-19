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

  return {
    name: 'kyleplathe-hub-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0]
        if (
          url.startsWith('/sauna') ||
          url.startsWith('/@') ||
          url.startsWith('/src') ||
          url.startsWith('/node_modules')
        ) {
          next()
          return
        }

        const relative = url === '/' ? 'index.html' : url.replace(/^\//, '')
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
  base: '/sauna/',
  build: {
    outDir: 'dist/sauna',
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
