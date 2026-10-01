'use client'
import { useSyncExternalStore } from 'react'

// A shared "clock" that ticks once a minute. Lets many <Timestamp>s re-render without each running a timer,
// and avoids setState-in-effect. Server snapshot is 0 so the first client render matches the server HTML.
const clockListeners = new Set()
let clockTimer = null

function subscribeClock(cb) {
  clockListeners.add(cb)
  if (!clockTimer) clockTimer = setInterval(() => clockListeners.forEach((l) => l()), 60_000)
  return () => {
    clockListeners.delete(cb)
    if (clockListeners.size === 0 && clockTimer) { clearInterval(clockTimer); clockTimer = null }
  }
}

export function useMinuteClock() {
  return useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / 60_000), () => 0)
}

// Tiny persisted-boolean/number store backed by web storage, safe when storage is blocked.
export function createStorageStore(storage, key, { read, serverValue }) {
  const listeners = new Set()
  const notify = () => listeners.forEach((l) => l())
  return {
    use() {
      return useSyncExternalStore(
        (cb) => {
          listeners.add(cb)
          const onStorage = (e) => { if (e.key === key || e.key === null) cb() }
          window.addEventListener('storage', onStorage)
          return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage) }
        },
        () => { try { return read(storage().getItem(key)) } catch { return serverValue } },
        () => serverValue
      )
    },
    set(value) {
      try { storage().setItem(key, String(value)) } catch {}
      notify()
    },
  }
}
