import { toDateKey } from '../lib/date'

// Local-only, same as health (see store/health.js) — question banks and
// answer history never touch the server except the one-shot AI generation
// call (services/ai.js's generateTestQuestions).
export function createStudySlice(set, get) {
  return {
    study: {
      settings: { dailyGoalQuestions: 15, testQuestionCount: 20, testDurationMinutes: 60 },
      banks: {}, // topicSlug -> { topic, blocks: [string], questions: [...] }
      activeTopicSlug: null,
      attempts: [], // test-mode summaries: { id, topicSlug, mode, dateKey, correct, total, byBlock }
      answerLog: [], // every single answer, any mode: { questionId, topicSlug, block, correct, dateKey }
      mistakes: {} // questionId -> consecutive-correct streak (removed once it reaches 2)
    },

    setStudySettings: (patch) =>
      set((state) => ({ study: { ...state.study, settings: { ...state.study.settings, ...patch } } })),

    saveStudyBank: (slug, bank) =>
      set((state) => ({
        study: {
          ...state.study,
          banks: { ...state.study.banks, [slug]: bank },
          activeTopicSlug: state.study.activeTopicSlug || slug
        }
      })),

    deleteStudyBank: (slug) =>
      set((state) => {
        const banks = { ...state.study.banks }
        delete banks[slug]
        return {
          study: {
            ...state.study,
            banks,
            activeTopicSlug: state.study.activeTopicSlug === slug ? null : state.study.activeTopicSlug
          }
        }
      }),

    setActiveTopicSlug: (slug) => set((state) => ({ study: { ...state.study, activeTopicSlug: slug } })),

    // Shared by all 3 modes (Test/Training/Mistakes) — logs the answer and
    // advances the mistake queue: a wrong answer enters it at streak 0, a
    // right one nudges the streak up and retires the question once it hits
    // 2 in a row (the retirement doesn't have to happen in one sitting).
    recordStudyAnswer: ({ questionId, topicSlug, block, correct }) => {
      const dateKey = toDateKey(new Date())
      set((state) => {
        const answerLog = [...state.study.answerLog, { questionId, topicSlug, block, correct, dateKey }].slice(-500)
        const mistakes = { ...state.study.mistakes }
        if (correct) {
          if (mistakes[questionId] != null) {
            const streak = mistakes[questionId] + 1
            if (streak >= 2) delete mistakes[questionId]
            else mistakes[questionId] = streak
          }
        } else {
          mistakes[questionId] = 0
        }
        return { study: { ...state.study, answerLog, mistakes } }
      })
    },

    recordStudyAttempt: (attempt) =>
      set((state) => ({ study: { ...state.study, attempts: [...state.study.attempts, attempt].slice(-100) } })),

    // Scoped backup of just this module (settings/banks/attempts/answerLog/
    // mistakes) — separate from the whole-app export in useAppStore.js,
    // which already includes `study` wholesale; this one's for someone who
    // wants to back up or move only their study progress.
    exportStudyData: () => {
      const { settings, banks, activeTopicSlug, attempts, answerLog, mistakes } = get().study
      return JSON.stringify(
        { schemaVersion: 1, exportedAt: new Date().toISOString(), settings, banks, activeTopicSlug, attempts, answerLog, mistakes },
        null,
        2
      )
    },

    // Full replace, same semantics as the "Заменить текущие данные?"
    // confirmation shown before calling this — missing arrays/objects in an
    // older or hand-edited file fall back to empty rather than crashing.
    importStudyData: (json) => {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object' || typeof parsed.banks !== 'object') {
        throw new Error('Invalid study backup file: missing banks')
      }
      set((state) => ({
        study: {
          settings: { ...state.study.settings, ...(parsed.settings || {}) },
          banks: parsed.banks || {},
          activeTopicSlug: parsed.activeTopicSlug ?? null,
          attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
          answerLog: Array.isArray(parsed.answerLog) ? parsed.answerLog : [],
          mistakes: parsed.mistakes && typeof parsed.mistakes === 'object' ? parsed.mistakes : {}
        }
      }))
    }
  }
}
