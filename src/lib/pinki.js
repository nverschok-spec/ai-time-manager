import { toDateKey } from './date'

// Fixed schedule from the plan — times are wall-clock, days follow
// JS Date#getDay() (0 = Sunday .. 6 = Saturday). "monthly-1" fires once, on
// the 1st of the month. Each entry's titleKey is translated at send time.
export const PINKI_DEFS = [
  { key: 'morning', time: '07:00', days: 'daily', titleKey: 'health.pinok_morning' },
  { key: 'lunch', time: '13:30', days: 'daily', titleKey: 'health.pinok_lunch' },
  { key: 'study', time: '18:00', days: 'daily', titleKey: 'health.pinok_study' },
  { key: 'strength', time: '19:00', days: [1, 3, 5], titleKey: 'health.pinok_strength' },
  { key: 'night', time: '21:30', days: 'daily', titleKey: 'health.pinok_night' },
  { key: 'weigh_in', time: '08:00', days: [1], titleKey: 'health.pinok_weigh_in' },
  { key: 'weekend_plan', time: '12:00', days: [6], titleKey: 'health.pinok_weekend_plan' },
  { key: 'weekly_review', time: '18:00', days: [0], titleKey: 'health.pinok_weekly_review' },
  { key: 'photo', time: '09:00', days: 'monthly-1', titleKey: 'health.pinok_photo' }
]

function matchesDaysRule(days, date) {
  if (days === 'daily') return true
  if (Array.isArray(days)) return days.includes(date.getDay())
  if (days === 'monthly-1') return date.getDate() === 1
  return false
}

// Finds the next date (strictly after referenceDate) that satisfies a
// pinok's time+days rule — same "recompute next occurrence on every app
// open" approach useAppStore.js uses for recurring task reminders, needed
// because a fired Redis reminder is deleted by push-check and has to be
// re-registered for its next occurrence.
export function nextPinokDateKey(def, referenceDate = new Date()) {
  const [h, m] = def.time.split(':').map(Number)
  const cursor = new Date(referenceDate)
  cursor.setHours(h, m, 0, 0)
  for (let i = 0; i < 370; i++) {
    if (cursor.getTime() > referenceDate.getTime() && matchesDaysRule(def.days, cursor)) {
      return toDateKey(cursor)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}
