import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { scheduleReminder } from '../lib/push'
import { getStoredToken, clearStoredToken } from '../components/PinGate'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Fire-and-forget by design: the local state is already updated optimistically
// before this is called, so a network hiccup just means the next loadAll()
// (on focus/interval) reconciles from the server rather than blocking the UI.
//
// A 401 means the stored token is stale (old token format from before this
// sync rewrite, expired, or the person was removed) — there's no local state
// worth keeping in that case, so drop straight back to the PIN screen instead
// of silently showing an empty, non-functional app.
function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers }
  }).then((res) => {
    if (res.status === 401) {
      clearStoredToken()
      window.location.reload()
    }
    return res
  })
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      person: null,
      tasks: [],
      people: [],
      shoppingItems: [],
      suggestions: [],
      rescheduleOps: [],
      lastReviewDate: null,
      lastWeeklyReviewWeek: null,
      pushEnabled: false,
      focusSessions: [],
      dataLoaded: false,

      setPerson: (person) => set({ person }),
      setLastReviewDate: (dateKey) => set({ lastReviewDate: dateKey }),
      setLastWeeklyReviewWeek: (weekKey) => set({ lastWeeklyReviewWeek: weekKey }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),

      // Local-only, capped at the most recent 200 runs — a Pomodoro session
      // belongs to whichever device it ran on, not something that needs to
      // match across a person's devices the way tasks/shopping do.
      addFocusSession: (session) =>
        set((state) => ({ focusSessions: [...state.focusSessions, session].slice(-200) })),

      // Pulls this person's tasks, the household roster, and the shared
      // shopping list from the server. Called on login, on tab focus, and
      // on an interval — safe to call as often as needed.
      loadAll: async () => {
        try {
          const [tasksRes, peopleRes, shoppingRes] = await Promise.all([
            apiFetch('/api/tasks').then((r) => r.json()),
            apiFetch('/api/people').then((r) => r.json()),
            apiFetch('/api/shopping').then((r) => r.json())
          ])
          set({
            tasks: tasksRes.tasks || [],
            people: peopleRes.people || [],
            shoppingItems: shoppingRes.items || [],
            dataLoaded: true
          })
        } catch {
          // offline / transient error — keep whatever's already in memory
        }
      },

      removePerson: (id) => {
        set((state) => ({ people: state.people.filter((p) => p.id !== id) }))
        apiFetch('/api/people', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {})
      },

      addShoppingItem: (text) => {
        const trimmed = text.trim()
        if (!trimmed) return
        const newItem = { id: makeId(), text: trimmed, done: false }
        set((state) => ({ shoppingItems: [...state.shoppingItems, newItem] }))
        apiFetch('/api/shopping', { method: 'POST', body: JSON.stringify({ item: newItem }) }).catch(() => {})
      },

      toggleShoppingItem: (id) => {
        set((state) => ({
          shoppingItems: state.shoppingItems.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
        }))
        const item = get().shoppingItems.find((i) => i.id === id)
        if (item) {
          apiFetch('/api/shopping', {
            method: 'PUT',
            body: JSON.stringify({ id, patch: { done: item.done } })
          }).catch(() => {})
        }
      },

      removeShoppingItem: (id) => {
        set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => i.id !== id) }))
        apiFetch('/api/shopping', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {})
      },

      restoreShoppingItem: (item) => {
        set((state) => ({ shoppingItems: [...state.shoppingItems, item] }))
        apiFetch('/api/shopping', { method: 'POST', body: JSON.stringify({ item }) }).catch(() => {})
      },

      clearCompletedShopping: () => {
        const done = get().shoppingItems.filter((i) => i.done)
        set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => !i.done) }))
        for (const item of done) {
          apiFetch('/api/shopping', { method: 'DELETE', body: JSON.stringify({ id: item.id }) }).catch(() => {})
        }
      },

      addTask: (task) => {
        const id = makeId()
        const newTask = { id, done: false, ...task }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
        apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ task: newTask }) }).catch(() => {})

        const { pushEnabled } = get()
        if (pushEnabled && !task.recurrence && task.date && task.startTime) {
          scheduleReminder({
            taskId: id,
            title: task.title,
            date: task.date,
            startTime: task.startTime,
            offsetMinutes: task.reminderOffsetMinutes || 0
          })
        }
      },

      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        }))
        const task = get().tasks.find((t) => t.id === id)
        if (task) {
          apiFetch('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, patch: { done: task.done } }) }).catch(
            () => {}
          )
        }
      },

      // For recurring tasks: completion is tracked per occurrence date, not on
      // the template itself, so one series can be done on Monday and not Tuesday.
      toggleTaskOccurrence: (id, dateKey) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t
            const completedDates = t.completedDates || []
            const isDone = completedDates.includes(dateKey)
            return {
              ...t,
              completedDates: isDone
                ? completedDates.filter((d) => d !== dateKey)
                : [...completedDates, dateKey]
            }
          })
        }))
        const task = get().tasks.find((t) => t.id === id)
        if (task) {
          apiFetch('/api/tasks', {
            method: 'PUT',
            body: JSON.stringify({ id, patch: { completedDates: task.completedDates } })
          }).catch(() => {})
        }
      },

      updateTask: (id, patch) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
        }))
        apiFetch('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, patch }) }).catch(() => {})
      },

      // Lets an already-created task opt into (or change) its reminder —
      // addTask only schedules once, at creation time.
      setTaskReminder: (id, offsetMinutes) => {
        get().updateTask(id, { reminderOffsetMinutes: offsetMinutes })
        const task = get().tasks.find((t) => t.id === id)
        const { pushEnabled } = get()
        if (task && pushEnabled && !task.recurrence && task.date && task.startTime) {
          scheduleReminder({
            taskId: id,
            title: task.title,
            date: task.date,
            startTime: task.startTime,
            offsetMinutes
          })
        }
      },

      // Full edit (title/date/time/etc via the edit form) — re-schedules the
      // reminder too, since the title/date/time it was based on may have changed.
      editTask: (id, patch) => {
        get().updateTask(id, patch)
        const task = get().tasks.find((t) => t.id === id)
        const { pushEnabled } = get()
        if (
          task &&
          pushEnabled &&
          !task.recurrence &&
          task.date &&
          task.startTime &&
          task.reminderOffsetMinutes != null
        ) {
          scheduleReminder({
            taskId: id,
            title: task.title,
            date: task.date,
            startTime: task.startTime,
            offsetMinutes: task.reminderOffsetMinutes
          })
        }
      },

      removeTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
        apiFetch('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {})
      },

      // Puts a just-deleted task back exactly as it was (same id/done/etc) —
      // pairs with the undo snackbar in CalendarView.
      restoreTask: (task) => {
        set((state) => ({ tasks: [...state.tasks, task] }))
        apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ task }) }).catch(() => {})
      },

      setSuggestions: (suggestions) => set({ suggestions }),

      setRescheduleOps: (rescheduleOps) => set({ rescheduleOps }),

      acceptRescheduleOp: (index) => {
        const op = get().rescheduleOps[index]
        if (!op) return
        get().editTask(op.id, { date: op.newDate, startTime: op.newStartTime })
        set((state) => ({ rescheduleOps: state.rescheduleOps.filter((_, i) => i !== index) }))
      },

      acceptAllRescheduleOps: () => {
        for (const op of get().rescheduleOps) {
          get().editTask(op.id, { date: op.newDate, startTime: op.newStartTime })
        }
        set({ rescheduleOps: [] })
      },

      dismissRescheduleOp: (index) =>
        set((state) => ({ rescheduleOps: state.rescheduleOps.filter((_, i) => i !== index) })),

      updateSuggestion: (index, patch) =>
        set((state) => ({
          suggestions: state.suggestions.map((s, i) => (i === index ? { ...s, ...patch } : s))
        })),

      acceptSuggestion: (index) => {
        const suggestion = get().suggestions[index]
        if (!suggestion) return
        get().addTask({
          title: suggestion.title,
          date: suggestion.date,
          startTime: suggestion.start_time,
          durationMinutes: suggestion.duration_minutes,
          priority: suggestion.priority,
          reminderOffsetMinutes: 15
        })
        set((state) => ({ suggestions: state.suggestions.filter((_, i) => i !== index) }))
      },

      dismissSuggestion: (index) =>
        set((state) => ({ suggestions: state.suggestions.filter((_, i) => i !== index) })),

      exportData: () => {
        const { tasks, shoppingItems } = get()
        return JSON.stringify(
          { version: 2, exportedAt: new Date().toISOString(), tasks, shoppingItems },
          null,
          2
        )
      },

      // Deliberately not async: JSON.parse must throw synchronously so the
      // caller's try/catch (SettingsPanel's file-read handler) can catch it.
      // The server pushes below are fire-and-forget, same as every other
      // mutation in this store.
      importData: (json) => {
        const parsed = JSON.parse(json)
        if (!Array.isArray(parsed.tasks)) throw new Error('Invalid file: missing tasks array')
        set({
          tasks: parsed.tasks,
          shoppingItems: Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems : get().shoppingItems
        })
        for (const task of parsed.tasks) {
          apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ task }) }).catch(() => {})
        }
        for (const item of parsed.shoppingItems || []) {
          apiFetch('/api/shopping', { method: 'POST', body: JSON.stringify({ item }) }).catch(() => {})
        }
      }
    }),
    {
      // Deliberately a NEW key, distinct from the old 'ai-time-manager-store'
      // (which held tasks/people/shopping pre-sync) — migrateLegacyData.js
      // reads that old key raw. If this store reused the same name, the
      // first `set()` call here would overwrite it with the new (smaller)
      // shape before migration ever got to read the legacy tasks out of it.
      name: 'ai-time-manager-prefs',
      // Only per-device UI state persists locally now — tasks/people/shopping
      // live on the server (see loadAll) so they can't drift out of sync
      // with what other household members see.
      partialize: (state) => ({
        lastReviewDate: state.lastReviewDate,
        lastWeeklyReviewWeek: state.lastWeeklyReviewWeek,
        pushEnabled: state.pushEnabled,
        focusSessions: state.focusSessions
      })
    }
  )
)
