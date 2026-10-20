import { toDateKey } from './date'

export const DAILY_CHECK_KEYS = ['treadmill', 'protein', 'magnesium', 'omega3', 'zinc', 'strength', 'water']

// Monday-of-the-week date key — used as the weeklyLog index instead of an
// ISO "2026-W12" string so it sorts correctly as plain text and reads as an
// actual date in the export JSON.
export function getWeekStartKey(date = new Date()) {
  const d = new Date(date)
  const mondayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  return toDateKey(d)
}

export function weeklyAverageWeight(entry) {
  if (!entry || !Array.isArray(entry.weights) || entry.weights.length === 0) return null
  return entry.weights.reduce((a, b) => a + b, 0) / entry.weights.length
}

// Sorted ascending by week — weeklyLog keys are already date strings, so
// plain string sort lines up chronologically.
export function computeWeeklySeries(weeklyLog) {
  return Object.keys(weeklyLog)
    .sort()
    .map((weekKey) => ({
      weekKey,
      weightAvg: weeklyAverageWeight(weeklyLog[weekKey]),
      waistCm: weeklyLog[weekKey].waistCm ?? null
    }))
}

// Stage 1 (90kg) stays the active target until the weekly average actually
// drops to/under it, then stage 2 (85kg) takes over automatically.
export function currentGoalKg(profile, latestWeightAvg) {
  if (latestWeightAvg == null) return profile.goal1Kg
  return latestWeightAvg > profile.goal1Kg ? profile.goal1Kg : profile.goal2Kg
}

// Simple linear rate from the first to the most recent weigh-in — not a
// regression fit, but with only ~1 data point/week that's the honest amount
// of precision to project forward with anyway.
export function forecastGoalDate(weightSeries, goalKg) {
  if (weightSeries.length < 2) return null
  const first = weightSeries[0]
  const last = weightSeries[weightSeries.length - 1]
  if (last.weightAvg <= goalKg) return { reached: true }

  const weeksElapsed = weightSeries.length - 1
  const ratePerWeek = (first.weightAvg - last.weightAvg) / weeksElapsed
  if (ratePerWeek <= 0) return null

  const kgToGo = last.weightAvg - goalKg
  const weeksToGo = kgToGo / ratePerWeek
  const date = new Date()
  date.setDate(date.getDate() + Math.round(weeksToGo * 7))
  return { reached: false, date, kgToGo: Math.round(kgToGo * 10) / 10 }
}

// Flags a week-over-week jump bigger than plausible fat loss — almost
// always water (salt/beer/hormones), not an actual trend reversal.
export function computeWeightTrendWarning(weightSeries) {
  if (weightSeries.length < 2) return false
  const last = weightSeries[weightSeries.length - 1]
  const prev = weightSeries[weightSeries.length - 2]
  return last.weightAvg - prev.weightAvg > 1.5
}

export function computeWaterWarning(dailyLog, referenceDate = new Date()) {
  const yesterday = new Date(referenceDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const entry = dailyLog[toDateKey(yesterday)]
  if (!entry) return false
  return (entry.beer || 0) >= 3 || !!entry.saltyFood
}

export function dayCompletionRatio(entry) {
  if (!entry) return 0
  return DAILY_CHECK_KEYS.filter((k) => entry[k]).length / DAILY_CHECK_KEYS.length
}

// Consecutive days (ending today, or yesterday if today isn't logged yet so
// an unfinished day doesn't look like a broken streak) with either the
// treadmill checked or >=12k steps.
export function computeTreadmillStreak(dailyLog, todayKey) {
  function qualifies(entry) {
    return !!entry && (entry.treadmill || (entry.steps || 0) >= 12000)
  }

  const cursor = new Date(`${todayKey}T00:00:00`)
  if (!qualifies(dailyLog[todayKey])) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (true) {
    const key = toDateKey(cursor)
    if (!qualifies(dailyLog[key])) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeBeerUsage(dailyLog, beerPlan, referenceDate = new Date()) {
  const weekStartKey = getWeekStartKey(referenceDate)
  const start = new Date(`${weekStartKey}T00:00:00`)
  let used = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    used += dailyLog[toDateKey(d)]?.beer || 0
  }
  return { used, limit: beerPlan?.limit ?? 2 }
}

// "Почти пустой день" per the plan: no treadmill AND under 5k steps AND no
// study activity, checked against YESTERDAY so the banner shows up the
// morning after, not mid-day against an unfinished today.
export function shouldShowHardKick(dailyLog, studyAnswerLog, todayKey) {
  const yesterday = new Date(`${todayKey}T00:00:00`)
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = toDateKey(yesterday)
  const entry = dailyLog[yKey]
  const noTreadmill = !entry?.treadmill
  const lowSteps = (entry?.steps || 0) < 5000
  const noStudy = !studyAnswerLog.some((a) => a.dateKey === yKey)
  return noTreadmill && lowSteps && noStudy
}

// Everything the weekly AI check-in (api/ai.js action health-weekly-review)
// needs, pre-aggregated client-side so the server never sees raw daily logs.
export function computeHealthWeeklySummary(health, study, referenceDate = new Date()) {
  const dateKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - (6 - i))
    return toDateKey(d)
  })
  const entries = dateKeys.map((k) => health.dailyLog[k]).filter(Boolean)
  const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

  const stepsAvg = avg(entries.map((e) => e.steps || 0))
  const sleepAvg = avg(entries.filter((e) => e.sleepHours != null).map((e) => e.sleepHours))
  const stressAvg = avg(entries.filter((e) => e.stress != null).map((e) => e.stress))
  const beerTotal = entries.reduce((sum, e) => sum + (e.beer || 0), 0)

  const series = computeWeeklySeries(health.weeklyLog)
  const latestWeek = series[series.length - 1] || null

  const testAnswers = study.answerLog.filter((a) => dateKeys.includes(a.dateKey))
  const testScorePct = testAnswers.length
    ? Math.round((testAnswers.filter((a) => a.correct).length / testAnswers.length) * 100)
    : null

  return {
    weightAvgKg: latestWeek?.weightAvg != null ? Math.round(latestWeek.weightAvg * 10) / 10 : null,
    waistCm: latestWeek?.waistCm ?? null,
    stepsAvg: stepsAvg != null ? Math.round(stepsAvg) : null,
    treadmillStreakDays: computeTreadmillStreak(health.dailyLog, dateKeys[dateKeys.length - 1]),
    beerTotalThisWeek: beerTotal,
    sleepAvgHours: sleepAvg != null ? Math.round(sleepAvg * 10) / 10 : null,
    stressAvg: stressAvg != null ? Math.round(stressAvg * 10) / 10 : null,
    testQuestionsAnswered: testAnswers.length,
    testScorePct
  }
}
