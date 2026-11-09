import { toDateKey } from '../lib/date'
import { scheduleReminder, cancelReminder } from '../lib/push'
import {
  applyLeitner,
  nextControlTestDate,
  makeWord,
  STARTER_GRAMMAR_TOPICS,
  addDaysKey
} from '../lib/german'
import seedWords from '../data/german/words.json'
import i18n from '../i18n/config'

// Local-only like health/study. No API calls anywhere in here: words,
// reminders and the day plan work without ANTHROPIC_API_KEY. Reminders reuse
// the existing push-schedule pipeline (Redis + push-check), not the AI.

export const GERMAN_SEED_CHECK = {
  id: 'tertia-2026-10-28',
  date: '2026-10-28',
  label: 'TERTIA',
  // Grammatik and Wortschatz were scored together (Sprachbausteine).
  parts: [
    { key: 'sprachbausteine', score: 26, max: 50 },
    { key: 'schreiben', score: 9, max: 20 }
  ]
}

function defaultGerman() {
  return {
    settings: {
      dayMode: 'min', // 'min' | 'norm'
      wordMode: 'mixed', // 'de-ru' | 'ru-de' | 'mixed'
      newPerDay: 15,
      remindersEnabled: true,
      morningTime: '09:00',
      eveningTime: '20:00',
      goal: 'B2 — telc Deutsch-Test für den Beruf',
      goalMonths: '5–7'
    },
    words: [],
    newLog: {}, // dateKey -> how many new words were introduced that day
    doneDates: [], // days marked "Сделано"
    planChecks: {}, // dateKey -> [plan item keys]
    grammar: STARTER_GRAMMAR_TOPICS.map((title, i) => ({
      id: `g-${i}`,
      title,
      status: 'todo',
      notes: ''
    })),
    writings: [], // { id, date, topic, text, corrected, errors: { category: count } }
    checks: [GERMAN_SEED_CHECK]
  }
}

export function createGermanSlice(set, get) {
  const patch = (fn) => set((state) => ({ german: { ...state.german, ...fn(state.german) } }))

  return {
    german: defaultGerman(),

    setGermanSettings: (p) => {
      patch((g) => ({ settings: { ...g.settings, ...p } }))
      // Only re-sync pushes when a reminder setting actually changed (not on
      // every keystroke in the goal text field).
      if ('remindersEnabled' in p || 'morningTime' in p || 'eveningTime' in p) get().syncGermanReminders(true)
    },

    // ----- words -----
    loadGermanSeedWords: () =>
      patch((g) => {
        const have = new Set(g.words.map((w) => w.id))
        const add = seedWords
          .filter((w) => !have.has(w.id))
          .map((w) => ({ ...makeWord({ ...w }), id: w.id }))
        return { words: [...g.words, ...add] }
      }),

    addGermanWords: (words) => patch((g) => ({ words: [...g.words, ...words] })),

    deleteGermanWord: (id) => patch((g) => ({ words: g.words.filter((w) => w.id !== id) })),

    // Records a first-attempt answer: moves the Leitner box and counts a
    // new word against today's daily cap the first time it's seen.
    answerGermanWord: (id, correct) => {
      const today = toDateKey(new Date())
      patch((g) => {
        const target = g.words.find((w) => w.id === id)
        if (!target) return {}
        const wasNew = !target.reviewed_at
        return {
          words: g.words.map((w) => (w.id === id ? applyLeitner(w, correct, today) : w)),
          newLog: wasNew ? { ...g.newLog, [today]: (g.newLog[today] || 0) + 1 } : g.newLog
        }
      })
    },

    // ----- day plan -----
    toggleGermanPlanItem: (dateKey, key) =>
      patch((g) => {
        const cur = g.planChecks[dateKey] || []
        const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
        return { planChecks: { ...g.planChecks, [dateKey]: next } }
      }),

    checkGermanPlanItem: (dateKey, key) =>
      patch((g) => {
        const cur = g.planChecks[dateKey] || []
        if (cur.includes(key)) return {}
        return { planChecks: { ...g.planChecks, [dateKey]: [...cur, key] } }
      }),

    markGermanDayDone: () => {
      const today = toDateKey(new Date())
      patch((g) => (g.doneDates.includes(today) ? {} : { doneDates: [...g.doneDates, today].slice(-730) }))
      get().syncGermanReminders(true)
    },

    unmarkGermanDayDone: () => {
      const today = toDateKey(new Date())
      patch((g) => ({ doneDates: g.doneDates.filter((d) => d !== today) }))
      get().syncGermanReminders(true)
    },

    // ----- grammar -----
    updateGermanTopic: (id, p) =>
      patch((g) => ({ grammar: g.grammar.map((t) => (t.id === id ? { ...t, ...p } : t)) })),

    addGermanTopic: (title) =>
      patch((g) => ({
        grammar: [...g.grammar, { id: `g-${Date.now().toString(36)}`, title: title.trim(), status: 'todo', notes: '' }]
      })),

    deleteGermanTopic: (id) => patch((g) => ({ grammar: g.grammar.filter((t) => t.id !== id) })),

    // ----- writing -----
    saveGermanWriting: (entry) =>
      patch((g) => {
        const exists = g.writings.some((w) => w.id === entry.id)
        return {
          writings: exists ? g.writings.map((w) => (w.id === entry.id ? entry : w)) : [entry, ...g.writings]
        }
      }),

    deleteGermanWriting: (id) => patch((g) => ({ writings: g.writings.filter((w) => w.id !== id) })),

    // ----- control tests -----
    addGermanCheck: (check) => patch((g) => ({ checks: [...g.checks, check] })),
    deleteGermanCheck: (id) => patch((g) => ({ checks: g.checks.filter((c) => c.id !== id) })),

    // ----- reminders (no API: existing push pipeline only) -----
    // Morning: next occurrence of morningTime. Evening: next occurrence of
    // eveningTime, but today's is skipped if the day is already done —
    // and a pending one is cancelled outright on "Сделано".
    syncGermanReminders: (force = false) => {
      const { german, pushEnabled } = get()
      const s = german.settings
      if (!pushEnabled) return
      const today = toDateKey(new Date())
      if (!force && german.lastReminderSync === today) return

      if (!s.remindersEnabled) {
        cancelReminder('german-morning')
        cancelReminder('german-evening')
      } else {
        const now = Date.now()
        const doneToday = german.doneDates.includes(today)
        const nextDate = (time, skipToday) => {
          for (let i = skipToday ? 1 : 0; i < 3; i++) {
            const key = addDaysKey(today, i)
            if (new Date(`${key}T${time}:00`).getTime() > now) return key
          }
          return addDaysKey(today, 1)
        }
        const quietHours = get().quietHoursConfig()
        scheduleReminder({
          taskId: 'german-morning',
          title: i18n.t('german.reminder_morning'),
          date: nextDate(s.morningTime, false),
          startTime: s.morningTime,
          offsetMinutes: 0,
          quietHours
        })
        // Done today → the evening key is simply overwritten with tomorrow's
        // slot (same key, so the old pending one is replaced, no race).
        scheduleReminder({
          taskId: 'german-evening',
          title: i18n.t('german.reminder_evening'),
          date: nextDate(s.eveningTime, doneToday),
          startTime: s.eveningTime,
          offsetMinutes: 0,
          quietHours
        })
      }
      // 4-weekly control test: one nudge on the due date at the morning time.
      const due = nextControlTestDate(german.checks)
      if (s.remindersEnabled && due && due >= today) {
        scheduleReminder({
          taskId: 'german-control',
          title: i18n.t('german.reminder_control'),
          date: due,
          startTime: s.morningTime,
          offsetMinutes: 0,
          quietHours: get().quietHoursConfig()
        })
      }
      set((state) => ({ german: { ...state.german, lastReminderSync: today } }))
    }
  }
}

export { defaultGerman }
