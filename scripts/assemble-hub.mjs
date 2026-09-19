import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const hub = join(root, 'hub')
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

cpSync(hub, join(dist, 'dev'), { recursive: true })

writeFileSync(
  join(dist, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=/dev/" />
    <link rel="canonical" href="/dev/" />
    <title>Redirecting to /dev</title>
    <script>location.replace('/dev/')</script>
  </head>
  <body>
    <p><a href="/dev/">Prototypes live at /dev</a></p>
  </body>
</html>
`,
)

console.log('Assembled hub at dist/dev/ and timer at dist/dev/sauna/')
