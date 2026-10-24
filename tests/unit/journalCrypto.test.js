// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { encryptEntry, decryptEntry, getDeviceKey, _setStoreForTests } from '../../src/lib/journalCrypto'

// In-memory stand-in for this device's IndexedDB
function memoryStore() {
  const m = new Map()
  return { get: async (k) => m.get(k), set: async (k, v) => { m.set(k, v) } }
}

const ALICE = '11111111-1111-1111-1111-111111111111'
const BOB = '22222222-2222-2222-2222-222222222222'
const entry = { title: 'Evening', content: 'Pray for my mother, who is ill.', mood: '🙏' }

beforeEach(() => _setStoreForTests(memoryStore()))

describe('journal encryption (device-only key)', () => {
  it('round-trips on the same device', async () => {
    const sealed = await encryptEntry(ALICE, entry)
    expect(await decryptEntry(ALICE, sealed)).toEqual(entry)
  })

  it('stores nothing readable', async () => {
    const sealed = await encryptEntry(ALICE, entry)
    const stored = JSON.stringify(sealed)
    expect(stored).not.toContain('mother')
    expect(stored).not.toContain('Evening')
    expect(Object.keys(sealed).sort()).toEqual(['ciphertext', 'iv', 'key_id'])
  })

  it('uses a fresh IV every time', async () => {
    const a = await encryptEntry(ALICE, entry)
    const b = await encryptEntry(ALICE, entry)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('makes the key non-extractable', async () => {
    const { key } = await getDeviceKey(ALICE, { create: true })
    expect(key.extractable).toBe(false)
    await expect(globalThis.crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it("can't be read on another device", async () => {
    const sealed = await encryptEntry(ALICE, entry)
    _setStoreForTests(memoryStore()) // a different device: no key yet
    await getDeviceKey(ALICE, { create: true })
    expect(await decryptEntry(ALICE, sealed)).toBeNull()
  })

  it("can't be moved to another account's row", async () => {
    const sealed = await encryptEntry(ALICE, entry)
    // Even if Bob somehow had the same key id, the user id is bound in
    const bobKey = await getDeviceKey(BOB, { create: true })
    expect(await decryptEntry(BOB, { ...sealed, key_id: bobKey.id })).toBeNull()
  })

  it('detects tampering', async () => {
    const sealed = await encryptEntry(ALICE, entry)
    const bytes = Uint8Array.from(atob(sealed.ciphertext), (c) => c.charCodeAt(0))
    bytes[0] ^= 1
    const tampered = { ...sealed, ciphertext: btoa(String.fromCharCode(...bytes)) }
    expect(await decryptEntry(ALICE, tampered)).toBeNull()
  })
})
