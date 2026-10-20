import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import {
  getWeekStartKey,
  computeWeeklySeries,
  forecastGoalDate,
  computeWeightTrendWarning,
  currentGoalKg
} from '../../lib/health'
import HealthWeeklyReview from './HealthWeeklyReview'

const CHART_WIDTH = 300
const CHART_HEIGHT = 140
const PADDING = 14

function pointPosition(index, value, count, min, max) {
  const xStep = count > 1 ? (CHART_WIDTH - PADDING * 2) / (count - 1) : 0
  const range = max - min || 1
  const x = PADDING + index * xStep
  const y = PADDING + (CHART_HEIGHT - PADDING * 2) * (1 - (value - min) / range)
  return { x, y }
}

function buildPath(values, min, max) {
  return values
    .map((v, i) => {
      const { x, y } = pointPosition(i, v, values.length, min, max)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// SVG only (no chart library, per project constraints) — a plain line +
// dashed goal line is all this needs, and it keeps the bundle untouched.
export default function HealthProgress() {
  const { t, i18n } = useTranslation()
  const health = useAppStore((s) => s.health)
  const addHealthWeight = useAppStore((s) => s.addHealthWeight)
  const setHealthWaist = useAppStore((s) => s.setHealthWaist)
  const setHealthPhotoTaken = useAppStore((s) => s.setHealthPhotoTaken)
  const [weightInput, setWeightInput] = useState('')
  const [waistInput, setWaistInput] = useState('')

  const currentWeekKey = getWeekStartKey(new Date())
  const series = useMemo(() => computeWeeklySeries(health.weeklyLog), [health.weeklyLog])
  const weightSeries = useMemo(() => series.filter((e) => e.weightAvg !== null), [series])
  const lastWeightAvg = weightSeries.length ? weightSeries[weightSeries.length - 1].weightAvg : null
  const goalKg = currentGoalKg(health.profile, lastWeightAvg)
  const forecast = useMemo(() => forecastGoalDate(weightSeries, goalKg), [weightSeries, goalKg])
  const trendWarning = useMemo(() => computeWeightTrendWarning(weightSeries), [weightSeries])

  const weightValues = weightSeries.map((e) => e.weightAvg)
  const min = Math.min(...weightValues, goalKg) - 1
  const max = Math.max(...weightValues, goalKg) + 1
  const goalY = pointPosition(0, goalKg, 1, min, max).y
  const thisWeekEntry = health.weeklyLog[currentWeekKey]

  function handleAddWeight(e) {
    e.preventDefault()
    const value = parseFloat(weightInput.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return
    addHealthWeight(currentWeekKey, value)
    setWeightInput('')
  }

  function handleAddWaist(e) {
    e.preventDefault()
    const value = parseFloat(waistInput.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return
    setHealthWaist(currentWeekKey, value)
    setWaistInput('')
  }

  return (
    <div className="space-y-4">
      {weightValues.length >= 1 && (
        <div className="rounded-3xl border border-white/[0.06] bg-app-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t('health.weight_chart_title')}</span>
            <span className="tabular-nums text-slate-300">
              {lastWeightAvg.toFixed(1)} {t('health.kg')}
            </span>
          </div>
          <svg width="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="overflow-visible">
            <line
              x1={PADDING}
              y1={goalY}
              x2={CHART_WIDTH - PADDING}
              y2={goalY}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-slate-600"
            />
            {weightValues.length > 1 && (
              <path d={buildPath(weightValues, min, max)} fill="none" strokeWidth={2} className="stroke-brand-cta" />
            )}
            {weightValues.map((v, i) => {
              const { x, y } = pointPosition(i, v, weightValues.length, min, max)
              return <circle key={i} cx={x} cy={y} r={3} className="fill-brand-cta" />
            })}
          </svg>
          <p className="text-xs text-slate-500">{t('health.goal_line', { goal: goalKg })}</p>
        </div>
      )}

      {trendWarning && (
        <div className="rounded-2xl border border-priority-high/30 bg-priority-high/10 p-3 text-sm text-slate-200">
          {t('health.weight_jump_warning')}
        </div>
      )}

      {forecast && !forecast.reached && (
        <div className="rounded-2xl border border-white/[0.06] bg-app-card p-3 text-sm text-slate-200">
          {t('health.forecast', {
            date: forecast.date.toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'long' }),
            kg: forecast.kgToGo
          })}
        </div>
      )}
      {forecast?.reached && (
        <div className="rounded-2xl border border-brand-cta/30 bg-brand-cta/10 p-3 text-sm text-slate-100">
          {t('health.goal_reached')}
        </div>
      )}

      <form onSubmit={handleAddWeight} className="rounded-2xl border border-white/[0.06] bg-app-card p-3 space-y-2">
        <label className="text-sm text-slate-300">{t('health.add_weight')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="95.0"
            className="flex-1 rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-cta px-3 py-1.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110"
          >
            {t('health.save')}
          </button>
        </div>
        {!!thisWeekEntry?.weights?.length && (
          <p className="text-xs text-slate-500">{t('health.already_logged_this_week')}</p>
        )}
      </form>

      <form onSubmit={handleAddWaist} className="rounded-2xl border border-white/[0.06] bg-app-card p-3 space-y-2">
        <label className="text-sm text-slate-300">{t('health.add_waist')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={waistInput}
            onChange={(e) => setWaistInput(e.target.value)}
            placeholder="102"
            className="flex-1 rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
          <button
            type="submit"
            className="rounded-md bg-app-cardMuted px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            {t('health.save')}
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setHealthPhotoTaken(currentWeekKey)}
        disabled={!!thisWeekEntry?.photoTaken}
        className="w-full rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
      >
        {thisWeekEntry?.photoTaken ? t('health.photo_done') : t('health.photo_mark')}
      </button>

      <HealthWeeklyReview />
    </div>
  )
}
