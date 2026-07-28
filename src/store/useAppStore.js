import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { scheduleReminder } from '../lib/push'
import { addMinutes, toDateKey } from '../lib/date'
import { nextOccurrenceOnOrAfter } from '../lib/occurrences'
import { getStoredToken, clearStoredToken, updateStoredPersonColor } from '../components/PinGate'

const ARCHIVE_AFTER_DAYS = 60

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
    (set, get) => {
      // Same fire-and-forget shape as apiFetch, but a network failure (offline,
      // not a 4xx/5xx — those wouldn't succeed on retry anyway) queues the
      // request instead of silently dropping it. The optimistic local state
      // is already correct; without this, going offline mid-edit meant the
      // next loadAll() would quietly overwrite it back to the stale server copy.
      function queuedFetch(url, options = {}) {
        return apiFetch(url, options).catch(() => {
          set((state) => ({
            pendingMutations: [...state.pendingMutations, { id: makeId(), url, options }]
          }))
        })
      }

      return {
        person: null,
        tasks: [],
        people: [],
        feedToken: null,
        shoppingItems: [],
        familyEvents: [],
        suggestions: [],
        rescheduleOps: [],
        scheduleAnswer: null,
        lastReviewDate: null,
        lastWeeklyReviewWeek: null,
        pushEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        focusSessions: [],
        pendingMutations: [],
        lastRecurringReminderSyncDate: null,
        lastBackupExportDate: null,
        dataLoaded: false,

        // Replays queued mutations in order; stops at the first failure
        // (still offline) rather than reordering writes for the same task.
        // Called on the 'online' event and alongside the existing loadAll
        // polling in App.jsx.
        flushPendingMutations: async () => {
          for (const mutation of get().pendingMutations) {
            try {
              await apiFetch(mutation.url, mutation.options)
              set((state) => ({
                pendingMutations: state.pendingMutations.filter((m) => m.id !== mutation.id)
              }))
            } catch {
              break
            }
          }
        },

        // Recurring tasks can't just reuse their (often long-past, e.g. a
        // birth year) anchor date for scheduleReminder — it always needs a
        // real future date, so this recomputes "next time this actually
        // happens" and reschedules for that. Runs once per day per app load
        // (force=true bypasses that, for immediate feedback right after
        // saving a recurring task's reminder setting).
        syncRecurringReminders: (force = false) => {
          const { tasks, pushEnabled, lastRecurringReminderSyncDate } = get()
          if (!pushEnabled) return
          const todayKey = toDateKey(new Date())
          if (!force && lastRecurringReminderSyncDate === todayKey) return

          for (const task of tasks) {
            if (!task.recurrence || task.reminderOffsetMinutes == null) continue
            const nextDate = nextOccurrenceOnOrAfter(task, todayKey)
            if (!nextDate) continue
            scheduleReminder({
              taskId: task.id,
              title: task.title,
              date: nextDate,
              startTime: task.startTime,
              offsetMinutes: task.reminderOffsetMinutes,
              quietHours: get().quietHoursConfig()
            })
          }
          if (!force) set({ lastRecurringReminderSyncDate: todayKey })
        },

        setPerson: (person) => set({ person }),
      setLastReviewDate: (dateKey) => set({ lastReviewDate: dateKey }),
      setLastWeeklyReviewWeek: (weekKey) => set({ lastWeeklyReviewWeek: weekKey }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      setQuietHours: (patch) => set(patch),
      setScheduleAnswer: (scheduleAnswer) => set({ scheduleAnswer }),

      quietHoursConfig: () => {
        const { quietHoursEnabled, quietHoursStart, quietHoursEnd } = get()
        return { enabled: quietHoursEnabled, start: quietHoursStart, end: quietHoursEnd }
      },

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
          const [tasksRes, peopleRes, shoppingRes, familyEventsRes] = await Promise.all([
            apiFetch('/api/tasks').then((r) => r.json()),
            apiFetch('/api/people').then((r) => r.json()),
            apiFetch('/api/shopping').then((r) => r.json()),
            apiFetch('/api/family-events').then((r) => r.json())
          ])
          set({
            tasks: tasksRes.tasks || [],
            people: peopleRes.people || [],
            feedToken: peopleRes.feedToken || null,
            shoppingItems: shoppingRes.items || [],
            familyEvents: familyEventsRes.events || [],
            dataLoaded: true
          })
        } catch {
          // offline / transient error — keep whatever's already in memory
        }
      },

      removePerson: (id) => {
        set((state) => ({ people: state.people.filter((p) => p.id !== id) }))
        queuedFetch('/api/people', { method: 'DELETE', body: JSON.stringify({ id }) })
      },

      // Only ever changes the CURRENT person's own color (server enforces
      // this too, from the auth token) — updates the people list, the
      // logged-in person object, and the localStorage auth blob so it
      // survives a reload without needing a fresh login.
      updatePersonColor: (color) => {
        const me = get().person
        if (!me) return
        set((state) => ({
          person: { ...state.person, color },
          people: state.people.map((p) => (p.id === me.id ? { ...p, color } : p))
        }))
        updateStoredPersonColor(color)
        queuedFetch('/api/people', { method: 'PUT', body: JSON.stringify({ color }) })
      },

      addShoppingItem: (text) => {
        const trimmed = text.trim()
        if (!trimmed) return
        const newItem = { id: makeId(), text: trimmed, done: false }
        set((state) => ({ shoppingItems: [...state.shoppingItems, newItem] }))
        queuedFetch('/api/shopping', { method: 'POST', body: JSON.stringify({ item: newItem }) })
      },

      toggleShoppingItem: (id) => {
        set((state) => ({
          shoppingItems: state.shoppingItems.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
        }))
        const item = get().shoppingItems.find((i) => i.id === id)
        if (item) {
          queuedFetch('/api/shopping', {
            method: 'PUT',
            body: JSON.stringify({ id, patch: { done: item.done } })
          })
        }
      },

      removeShoppingItem: (id) => {
        set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => i.id !== id) }))
        queuedFetch('/api/shopping', { method: 'DELETE', body: JSON.stringify({ id }) })
      },

      restoreShoppingItem: (item) => {
        set((state) => ({ shoppingItems: [...state.shoppingItems, item] }))
        queuedFetch('/api/shopping', { method: 'POST', body: JSON.stringify({ item }) })
      },

      clearCompletedShopping: () => {
        const done = get().shoppingItems.filter((i) => i.done)
        set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => !i.done) }))
        for (const item of done) {
          queuedFetch('/api/shopping', { method: 'DELETE', body: JSON.stringify({ id: item.id }) })
        }
      },

      // Household-wide, same sharing model as shopping — everyone sees the
      // same events, unlike tasks which stay private per person.
      addFamilyEvent: (event) => {
        const newEvent = { id: makeId(), ...event }
        set((state) => ({ familyEvents: [...state.familyEvents, newEvent] }))
        queuedFetch('/api/family-events', { method: 'POST', body: JSON.stringify({ event: newEvent }) })
      },

      removeFamilyEvent: (id) => {
        set((state) => ({ familyEvents: state.familyEvents.filter((e) => e.id !== id) }))
        queuedFetch('/api/family-events', { method: 'DELETE', body: JSON.stringify({ id }) })
      },

      restoreFamilyEvent: (event) => {
        set((state) => ({ familyEvents: [...state.familyEvents, event] }))
        queuedFetch('/api/family-events', { method: 'POST', body: JSON.stringify({ event }) })
      },

      addTask: (task) => {
        const id = makeId()
        const newTask = { id, done: false, ...task }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
        queuedFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ task: newTask }) })

        const { pushEnabled } = get()
        if (pushEnabled && task.date && task.startTime && task.reminderOffsetMinutes != null) {
          if (task.recurrence) {
            get().syncRecurringReminders(true)
          } else {
            scheduleReminder({
              taskId: id,
              title: task.title,
              date: task.date,
              startTime: task.startTime,
              offsetMinutes: task.reminderOffsetMinutes,
              quietHours: get().quietHoursConfig()
            })
          }
        }
      },

      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        }))
        const task = get().tasks.find((t) => t.id === id)
        if (task) {
          queuedFetch('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, patch: { done: task.done } }) })
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
          queuedFetch('/api/tasks', {
            method: 'PUT',
            body: JSON.stringify({ id, patch: { completedDates: task.completedDates } })
          })
        }
      },

      updateTask: (id, patch) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
        }))
        queuedFetch('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, patch }) })
      },

      toggleChecklistItem: (taskId, itemId) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return
        const checklist = (task.checklist || []).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
        get().updateTask(taskId, { checklist })
      },

      // Lets an already-created task opt into (or change) its reminder —
      // addTask only schedules once, at creation time.
      setTaskReminder: (id, offsetMinutes) => {
        get().updateTask(id, { reminderOffsetMinutes: offsetMinutes })
        const task = get().tasks.find((t) => t.id === id)
        const { pushEnabled } = get()
        if (task && pushEnabled && task.date && task.startTime) {
          if (task.recurrence) {
            get().syncRecurringReminders(true)
          } else {
            scheduleReminder({
              taskId: id,
              title: task.title,
              date: task.date,
              startTime: task.startTime,
              offsetMinutes,
              quietHours: get().quietHoursConfig()
            })
          }
        }
      },

      // Full edit (title/date/time/etc via the edit form) — re-schedules the
      // reminder too, since the title/date/time it was based on may have changed.
      editTask: (id, patch) => {
        get().updateTask(id, patch)
        const task = get().tasks.find((t) => t.id === id)
        const { pushEnabled } = get()
        if (task && pushEnabled && task.date && task.startTime && task.reminderOffsetMinutes != null) {
          if (task.recurrence) {
            get().syncRecurringReminders(true)
          } else {
            scheduleReminder({
              taskId: id,
              title: task.title,
              date: task.date,
              startTime: task.startTime,
              offsetMinutes: task.reminderOffsetMinutes,
              quietHours: get().quietHoursConfig()
            })
          }
        }
      },

      // One-tap "+1 hour", rolling over to the next day if needed — goes
      // through editTask so any push reminder follows the task to its new time.
      snoozeTask: (id, minutes = 60) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return
        const { date, startTime } = addMinutes(task.date, task.startTime, minutes)
        get().editTask(id, { date, startTime })
      },

      removeTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
        queuedFetch('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) })
      },

      // Quiet hygiene pass, called once per app load — recurring templates
      // are never touched (their "date" is just the series anchor, not a
      // one-off that's safe to forget), only long-done one-off tasks.
      archiveOldCompleted: () => {
        const cutoff = toDateKey(new Date(Date.now() - ARCHIVE_AFTER_DAYS * 86400000))
        const stale = get().tasks.filter((t) => t.done && !t.recurrence && t.date < cutoff)
        for (const t of stale) get().removeTask(t.id)
      },

      // Puts a just-deleted task back exactly as it was (same id/done/etc) —
      // pairs with the undo snackbar in CalendarView.
      restoreTask: (task) => {
        set((state) => ({ tasks: [...state.tasks, task] }))
        queuedFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ task }) })
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
          emoji: suggestion.emoji || undefined,
          reminderOffsetMinutes: 15
        })
        set((state) => ({ suggestions: state.suggestions.filter((_, i) => i !== index) }))
      },

      dismissSuggestion: (index) =>
        set((state) => ({ suggestions: state.suggestions.filter((_, i) => i !== index) })),

      exportData: () => {
        const { tasks, shoppingItems, familyEvents } = get()
        return JSON.stringify(
          { version: 3, exportedAt: new Date().toISOString(), tasks, shoppingItems, familyEvents },
          null,
          2
        )
      },

      // Shared by the Settings export button and the backup-reminder banner
      // — also stamps lastBackupExportDate so the nudge knows to go quiet
      // for a while.
      exportAndDownload: () => {
        const todayKey = toDateKey(new Date())
        const blob = new Blob([get().exportData()], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-time-manager-${todayKey}.json`
        a.click()
        URL.revokeObjectURL(url)
        set({ lastBackupExportDate: todayKey })
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
          shoppingItems: Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems : get().shoppingItems,
          familyEvents: Array.isArray(parsed.familyEvents) ? parsed.familyEvents : get().familyEvents
        })
        for (const task of parsed.tasks) {
          queuedFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ task }) })
        }
        for (const item of parsed.shoppingItems || []) {
          queuedFetch('/api/shopping', { method: 'POST', body: JSON.stringify({ item }) })
        }
        for (const event of parsed.familyEvents || []) {
          queuedFetch('/api/family-events', { method: 'POST', body: JSON.stringify({ event }) })
        }
      }
      }
    },
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
        quietHoursEnabled: state.quietHoursEnabled,
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
        focusSessions: state.focusSessions,
        pendingMutations: state.pendingMutations,
        lastBackupExportDate: state.lastBackupExportDate
      })
    }
  )
)
