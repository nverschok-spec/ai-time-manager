import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { scheduleReminder } from '../lib/push'

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

      setLastReviewDate: (dateKey) => set({ lastReviewDate: dateKey }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),

      addTask: (task) => {
        const id = makeId()
        set((state) => ({
          tasks: [...state.tasks, { id, done: false, ...task }]
        }))

        const { pushEnabled, deviceId } = get()
        if (pushEnabled && !task.recurrence && task.date && task.startTime) {
          scheduleReminder({ deviceId, taskId: id, title: task.title, date: task.date, startTime: task.startTime })
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

      removeTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

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
          priority: suggestion.priority
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
        pushEnabled: state.pushEnabled
      })
    }
  )
)
