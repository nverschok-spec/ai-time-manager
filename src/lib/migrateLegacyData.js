// One-time move of pre-sync localStorage data (tasks/shopping items that
// accumulated before the server-backed store existed) onto this person's
// server-side lists. Runs once per browser, then deletes the legacy key —
// safe to call on every app start after that.
import { getStoredToken } from '../components/PinGate'

const LEGACY_KEY = 'ai-time-manager-store'
const MIGRATED_FLAG = 'ai-time-manager-migrated'

function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function migrateLegacyDataIfNeeded() {
  if (localStorage.getItem(MIGRATED_FLAG)) return

  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const state = parsed.state || {}
      const legacyTasks = Array.isArray(state.tasks) ? state.tasks : []
      const legacyShopping = Array.isArray(state.shoppingItems) ? state.shoppingItems : []

      for (const task of legacyTasks) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ task })
        }).catch(() => {})
      }
      for (const item of legacyShopping) {
        await fetch('/api/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ item })
        }).catch(() => {})
      }
    }
  } catch {
    // corrupt legacy data — nothing usable to migrate, don't block login over it
  } finally {
    localStorage.setItem(MIGRATED_FLAG, '1')
    localStorage.removeItem(LEGACY_KEY)
  }
}
