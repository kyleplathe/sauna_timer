/**
 * Three copies of each record:
 * - localStorage for a synchronous read on the next launch
 * - IndexedDB because its transaction completes only after the write is durable
 * - Cache Storage because iOS home-screen web apps keep it when localStorage is jetsam'd
 *
 * A crash often kills the page before WebKit flushes localStorage. Reading all
 * three and keeping the richest copy is what brings history back.
 */

export interface Envelope<T> {
  updatedAt: number
  value: T
}

const DB_NAME = 'ember-ice'
const DB_VERSION = 1
const STORE = 'kv'
export const STATE_CACHE_NAME = 'ember-ice-state'

const revisions = new Map<string, number>()

function bump(key: string): number {
  const next = (revisions.get(key) ?? 0) + 1
  revisions.set(key, next)
  return next
}

function revision(key: string): number {
  return revisions.get(key) ?? 0
}

export function parseEnvelope<T>(raw: string): Envelope<T> | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>
    if (typeof record.updatedAt === 'number' && 'value' in record) {
      return { updatedAt: record.updatedAt, value: record.value as T }
    }
    // Bare values written before envelopes existed.
    return { updatedAt: 0, value: parsed as T }
  } catch {
    return null
  }
}

export function chooseNewest<T>(
  candidates: Array<Envelope<T> | null | undefined>,
): Envelope<T> | null {
  let best: Envelope<T> | null = null
  for (const candidate of candidates) {
    if (!candidate) continue
    if (!best || candidate.updatedAt >= best.updatedAt) best = candidate
  }
  return best
}

export function readLocalEnvelope<T>(key: string): Envelope<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return parseEnvelope<T>(raw)
  } catch {
    return null
  }
}

export function writeLocalEnvelope(key: string, envelope: Envelope<unknown>): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(envelope))
    // Read-back pushes WebKit to flush before a memory kill.
    localStorage.getItem(key)
    return true
  } catch {
    return false
  }
}

function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage can throw in private mode or when the origin is over quota.
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbPromise = null
        reject(request.error ?? new Error('IndexedDB open failed'))
      }
    })
  }
  return dbPromise
}

async function readIdb<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(key)
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

async function writeIdb(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function deleteIdb(key: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function stateRequest(key: string): Request {
  return new Request(`https://ember-ice.local/state/${encodeURIComponent(key)}`)
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    if (typeof caches === 'undefined') return null
    const cache = await caches.open(STATE_CACHE_NAME)
    const response = await cache.match(stateRequest(key))
    if (!response) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(STATE_CACHE_NAME)
  await cache.put(
    stateRequest(key),
    new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

async function deleteCache(key: string): Promise<void> {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(STATE_CACHE_NAME)
  await cache.delete(stateRequest(key))
}

let persistRequested = false

/** Ask iOS / the browser not to evict this origin. Installed home-screen apps are usually granted it. */
export function requestPersistentStorage(): void {
  if (persistRequested) return
  persistRequested = true
  try {
    const storage = navigator.storage
    if (!storage?.persist) return
    void storage.persist().catch(() => undefined)
  } catch {
    // navigator.storage is missing in some webviews.
  }
}

export async function readAllEnvelopes<T>(key: string): Promise<Array<Envelope<T> | null>> {
  const seen = revision(key)
  const [idb, cached] = await Promise.all([
    readIdb<Envelope<T>>(key),
    readCache<Envelope<T>>(key),
  ])
  if (revision(key) !== seen) return [readLocalEnvelope<T>(key)]
  return [readLocalEnvelope<T>(key), normalizeRemote(idb), normalizeRemote(cached)]
}

function normalizeRemote<T>(value: Envelope<T> | null): Envelope<T> | null {
  if (!value || typeof value !== 'object') return null
  if (typeof value.updatedAt !== 'number' || !('value' in value)) return null
  return value
}

export async function readDurable<T>(key: string): Promise<Envelope<T> | null> {
  const copies = await readAllEnvelopes<T>(key)
  return chooseNewest(copies)
}

export async function writeDurable<T>(
  key: string,
  value: T,
  updatedAt = Date.now(),
): Promise<void> {
  const rev = bump(key)
  const envelope: Envelope<T> = { updatedAt, value }
  writeLocalEnvelope(key, envelope)
  await Promise.allSettled([writeIdb(key, envelope), writeCache(key, envelope)])
  if (revision(key) !== rev && readLocalEnvelope(key) == null) {
    await Promise.allSettled([deleteIdb(key), deleteCache(key)])
  }
}

export async function clearDurable(key: string): Promise<void> {
  bump(key)
  removeLocal(key)
  await Promise.allSettled([deleteIdb(key), deleteCache(key)])
  if (readLocalEnvelope(key) != null) return
  await Promise.allSettled([deleteIdb(key), deleteCache(key)])
}
