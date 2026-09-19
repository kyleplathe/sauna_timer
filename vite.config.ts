import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const hubDir = path.join(rootDir, 'hub')
const homeDir = path.join(rootDir, 'home')

function staticDirServer(): Plugin {
  const mime: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.ico': 'image/x-icon',
  }

  function sendFile(res: {
    setHeader: (name: string, value: string) => void
    end: (body: Buffer) => void
  }, file: string) {
    res.setHeader(
      'Content-Type',
      mime[path.extname(file)] ?? 'application/octet-stream',
    )
    res.end(fs.readFileSync(file))
  }

  function safeFile(dir: string, relative: string) {
    const file = path.resolve(dir, relative)
    if (!file.startsWith(dir + path.sep) && file !== dir) return null
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null
    return file
  }

  return {
    name: 'kyleplathe-static-dev',
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

        if (url === '/dev' || url === '/dev/' || url.startsWith('/dev/')) {
          const relative =
            url === '/dev' || url === '/dev/'
              ? 'index.html'
              : url.replace(/^\/dev\//, '')
          const file = safeFile(hubDir, relative)
          if (!file) {
            next()
            return
          }
          sendFile(res, file)
          return
        }

        const homeRelative = url === '/' ? 'index.html' : url.replace(/^\//, '')
        const homeFile = safeFile(homeDir, homeRelative)
        if (homeFile) {
          sendFile(res, homeFile)
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staticDirServer()],
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
