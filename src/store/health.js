import { toDateKey } from '../lib/date'

// Health data is local-only by design (see CLAUDE.md privacy rules) — no
// server calls here, unlike tasks/shopping. Merged into useAppStore's
// create() via spread; `get`/`set` are the same ones the main store passes.
export function createHealthSlice(set, get) {
  return {
    health: {
      profile: {
        heightCm: 182,
        startWeightKg: null,
        goal1Kg: 90,
        goal2Kg: 85,
        startDate: null
      },
      dailyLog: {},
      weeklyLog: {},
      // weekday matches JS Date#getDay() (0 = Sunday .. 6 = Saturday).
      beerPlan: { weekday: 6, limit: 2 },
      // Per-pinok on/off, keyed by lib/pinki.js's PINKI_DEFS[].key — absent
      // key means enabled (so new pinki added later default to on).
      pinki: {},
      reviewHistory: []
    },

    setHealthProfile: (patch) =>
      set((state) => ({ health: { ...state.health, profile: { ...state.health.profile, ...patch } } })),

    setHealthDay: (dateKey, patch) =>
      set((state) => ({
        health: {
          ...state.health,
          dailyLog: { ...state.health.dailyLog, [dateKey]: { ...state.health.dailyLog[dateKey], ...patch } }
        }
      })),

    toggleHealthCheck: (dateKey, key) => {
      const entry = get().health.dailyLog[dateKey]
      get().setHealthDay(dateKey, { [key]: !entry?.[key] })
    },

    setHealthBeerCount: (dateKey, count) => get().setHealthDay(dateKey, { beer: Math.max(0, count) }),

    setBeerPlan: (patch) => set((state) => ({ health: { ...state.health, beerPlan: { ...state.health.beerPlan, ...patch } } })),

    // First-ever weigh-in also stamps the profile's starting point, so the
    // "how far have I come" math has a baseline without a separate setup step.
    addHealthWeight: (weekKey, weightKg) =>
      set((state) => {
        const existing = state.health.weeklyLog[weekKey] || {}
        const weights = [...(existing.weights || []), weightKg]
        const profile = state.health.profile
        const isFirstEntry = profile.startWeightKg == null
        return {
          health: {
            ...state.health,
            profile: isFirstEntry
              ? { ...profile, startWeightKg: weightKg, startDate: toDateKey(new Date()) }
              : profile,
            weeklyLog: { ...state.health.weeklyLog, [weekKey]: { ...existing, weights } }
          }
        }
      }),

    setHealthWaist: (weekKey, waistCm) =>
      set((state) => ({
        health: {
          ...state.health,
          weeklyLog: { ...state.health.weeklyLog, [weekKey]: { ...state.health.weeklyLog[weekKey], waistCm } }
        }
      })),

    setHealthPhotoTaken: (weekKey) =>
      set((state) => ({
        health: {
          ...state.health,
          weeklyLog: {
            ...state.health.weeklyLog,
            [weekKey]: { ...state.health.weeklyLog[weekKey], photoTaken: true }
          }
        }
      })),

    setPinokEnabled: (key, enabled) =>
      set((state) => ({ health: { ...state.health, pinki: { ...state.health.pinki, [key]: enabled } } })),

    addHealthReview: (entry) =>
      set((state) => ({
        health: { ...state.health, reviewHistory: [...state.health.reviewHistory, entry].slice(-20) }
      }))
  }
}
