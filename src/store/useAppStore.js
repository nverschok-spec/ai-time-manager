import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { scheduleReminder } from '../lib/push'
import { nextAvailableColor } from '../lib/people'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      tasks: [],
      suggestions: [],
      lastReviewDate: null,
      deviceId: makeId(),
      pushEnabled: false,
      people: [],
      shoppingItems: [],

      setLastReviewDate: (dateKey) => set({ lastReviewDate: dateKey }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),

      addPerson: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({
          people: [
            ...state.people,
            { id: makeId(), name: trimmed, color: nextAvailableColor(state.people) }
          ]
        }))
      },

      removePerson: (id) =>
        set((state) => ({
          people: state.people.filter((p) => p.id !== id),
          tasks: state.tasks.map((t) => (t.assigneeId === id ? { ...t, assigneeId: undefined } : t))
        })),

      addShoppingItem: (text) => {
        const trimmed = text.trim()
        if (!trimmed) return
        set((state) => ({
          shoppingItems: [...state.shoppingItems, { id: makeId(), text: trimmed, done: false }]
        }))
      },

      toggleShoppingItem: (id) =>
        set((state) => ({
          shoppingItems: state.shoppingItems.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
        })),

      removeShoppingItem: (id) =>
        set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => i.id !== id) })),

      restoreShoppingItem: (item) =>
        set((state) => ({ shoppingItems: [...state.shoppingItems, item] })),

      clearCompletedShopping: () =>
        set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => !i.done) })),

      addTask: (task) => {
        const id = makeId()
        set((state) => ({
          tasks: [...state.tasks, { id, done: false, ...task }]
        }))

        const { pushEnabled, deviceId } = get()
        if (pushEnabled && !task.recurrence && task.date && task.startTime) {
          scheduleReminder({
            deviceId,
            taskId: id,
            title: task.title,
            date: task.date,
            startTime: task.startTime,
            offsetMinutes: task.reminderOffsetMinutes || 0
          })
        }
      },

      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        })),

      // For recurring tasks: completion is tracked per occurrence date, not on
      // the template itself, so one series can be done on Monday and not Tuesday.
      toggleTaskOccurrence: (id, dateKey) =>
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
        })),

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
        })),

      // Lets an already-created task opt into (or change) its reminder —
      // addTask only schedules once, at creation time.
      setTaskReminder: (id, offsetMinutes) => {
        get().updateTask(id, { reminderOffsetMinutes: offsetMinutes })
        const task = get().tasks.find((t) => t.id === id)
        const { pushEnabled, deviceId } = get()
        if (task && pushEnabled && !task.recurrence && task.date && task.startTime) {
          scheduleReminder({
            deviceId,
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
        const { pushEnabled, deviceId } = get()
        if (
          task &&
          pushEnabled &&
          !task.recurrence &&
          task.date &&
          task.startTime &&
          task.reminderOffsetMinutes != null
        ) {
          scheduleReminder({
            deviceId,
            taskId: id,
            title: task.title,
            date: task.date,
            startTime: task.startTime,
            offsetMinutes: task.reminderOffsetMinutes
          })
        }
      },

      removeTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      // Puts a just-deleted task back exactly as it was (same id/done/etc) —
      // pairs with the undo snackbar in CalendarView.
      restoreTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

      setSuggestions: (suggestions) => set({ suggestions }),

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
        const { tasks } = get()
        return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2)
      },

      importData: (json) => {
        const parsed = JSON.parse(json)
        if (!Array.isArray(parsed.tasks)) throw new Error('Invalid file: missing tasks array')
        set({ tasks: parsed.tasks })
      }
    }),
    {
      name: 'ai-time-manager-store',
      partialize: (state) => ({
        tasks: state.tasks,
        lastReviewDate: state.lastReviewDate,
        deviceId: state.deviceId,
        pushEnabled: state.pushEnabled,
        people: state.people,
        shoppingItems: state.shoppingItems
      })
    }
  )
)
