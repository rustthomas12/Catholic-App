// Prayer journal encryption — device-only keys.
//
// Each user gets an AES-256-GCM key created on this device. It is
// non-extractable (not even our own code can read the key bytes out) and is
// stored only in this device's IndexedDB. Entries are encrypted before they
// leave the device, so the server, our team and anyone with database access
// see only ciphertext. The flip side: entries written here can't be read on
// another device, and they're gone if this device's storage is erased.
//
// Sign-out deliberately does NOT remove the key — signing back in on the
// same device must still open the journal.

const DB_NAME = 'infold-journal'
const STORE = 'keys'

// ── Storage (IndexedDB; swappable for tests) ───────────────
function idbStore() {
  const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const run = async (mode, fn) => {
    const db = await open()
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req?.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }
  return {
    get: (k) => run('readonly', (s) => s.get(k)),
    set: (k, v) => run('readwrite', (s) => s.put(v, k)),
  }
}

let store = typeof indexedDB !== 'undefined' ? idbStore() : null
export function _setStoreForTests(s) { store = s; cache.clear() }

const cache = new Map() // userId → { id, key }

const subtle = () => globalThis.crypto.subtle

/**
 * This device's journal key for the user, or null if there isn't one yet.
 * create: make one if missing.
 */
export async function getDeviceKey(userId, { create = false } = {}) {
  if (cache.has(userId)) return cache.get(userId)
  if (!store) throw new Error('This device can’t store an encryption key')
  let rec = await store.get(userId)
  if (!rec && create) {
    const key = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    rec = { id: globalThis.crypto.randomUUID(), key, createdAt: new Date().toISOString() }
    await store.set(userId, rec)
    // Ask the browser not to evict this origin's storage (best effort)
    try { await navigator.storage?.persist?.() } catch { /* ignore */ }
  }
  if (rec) cache.set(userId, rec)
  return rec ?? null
}

const b64 = {
  enc: (buf) => {
    const bytes = new Uint8Array(buf)
    let s = ''
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    return btoa(s)
  },
  dec: (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0)),
}

// The user id is bound in as additional data, so a ciphertext can't be
// moved to another account's row and still decrypt.
const aad = (userId) => new TextEncoder().encode(`infold-journal:v1:${userId}`)

/** Encrypt { title, content, mood } → { ciphertext, iv, key_id } */
export async function encryptEntry(userId, entry) {
  const { id, key } = await getDeviceKey(userId, { create: true })
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify({
    title: entry.title?.trim() || null,
    content: entry.content.trim(),
    mood: entry.mood || null,
  }))
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad(userId) }, key, plain)
  return { ciphertext: b64.enc(ct), iv: b64.enc(iv), key_id: id }
}

/**
 * Decrypt a row → { title, content, mood }, or null when this device can't
 * read it (written on another device, or its key is gone).
 */
export async function decryptEntry(userId, row) {
  const dk = await getDeviceKey(userId)
  if (!dk || dk.id !== row.key_id) return null
  try {
    const pt = await subtle().decrypt(
      { name: 'AES-GCM', iv: b64.dec(row.iv), additionalData: aad(userId) },
      dk.key,
      b64.dec(row.ciphertext),
    )
    return JSON.parse(new TextDecoder().decode(pt))
  } catch {
    return null
  }
}
