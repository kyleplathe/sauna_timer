import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const hub = join(root, 'hub')
const sauna = join(dist, 'sauna')

if (!statSync(sauna).isDirectory()) {
  throw new Error('Expected Vite to emit dist/sauna before assembling the hub')
}

mkdirSync(dist, { recursive: true })

for (const name of readdirSync(dist)) {
  if (name === 'sauna') continue
  rmSync(join(dist, name), { recursive: true, force: true })
}

cpSync(hub, dist, { recursive: true })
console.log('Assembled hub at dist/ and timer at dist/sauna/')
