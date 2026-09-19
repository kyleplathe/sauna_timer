import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const hub = join(root, 'hub')
const home = join(root, 'home')
const sauna = join(dist, 'dev', 'sauna')

if (!statSync(sauna).isDirectory()) {
  throw new Error(
    'Expected Vite to emit dist/dev/sauna before assembling the hub',
  )
}

mkdirSync(join(dist, 'dev'), { recursive: true })

for (const name of readdirSync(dist)) {
  if (name === 'dev') continue
  rmSync(join(dist, name), { recursive: true, force: true })
}

for (const name of readdirSync(join(dist, 'dev'))) {
  if (name === 'sauna') continue
  rmSync(join(dist, 'dev', name), { recursive: true, force: true })
}

cpSync(home, dist, { recursive: true })
cpSync(hub, join(dist, 'dev'), { recursive: true })

console.log('Assembled home at dist/, hub at dist/dev/, timer at dist/dev/sauna/')
