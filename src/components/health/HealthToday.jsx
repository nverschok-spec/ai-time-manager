import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Beer, Droplets, Minus, Plus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import {
  DAILY_CHECK_KEYS,
  dayCompletionRatio,
  computeWaterWarning,
  computeBeerUsage,
  computeTreadmillStreak
} from '../../lib/health'

const CHECK_EMOJI = {
  treadmill: '🚶',
  protein: '🥩',
  magnesium: '💊',
  omega3: '🐟',
  zinc: '💊',
  strength: '🏋️',
  water: '💧'
}

const MOOD_EMOJI = ['😩', '😕', '😐', '🙂', '😄']
const STRESS_EMOJI = ['😌', '🙂', '😐', '😣', '🤯']

// Fast daily input — the whole point is under 30 seconds from opening the
// app, so every control here is a single tap/keystroke, no multi-step forms.
export default function HealthToday() {
  const { t } = useTranslation()
  const health = useAppStore((s) => s.health)
  const toggleHealthCheck = useAppStore((s) => s.toggleHealthCheck)
  const setHealthDay = useAppStore((s) => s.setHealthDay)
  const setHealthBeerCount = useAppStore((s) => s.setHealthBeerCount)

  const todayKey = toDateKey(new Date())
  const entry = health.dailyLog[todayKey] || {}

  const ratio = useMemo(() => dayCompletionRatio(entry), [entry])
  const waterWarning = useMemo(() => computeWaterWarning(health.dailyLog), [health.dailyLog])
  const beerUsage = useMemo(
    () => computeBeerUsage(health.dailyLog, health.beerPlan),
    [health.dailyLog, health.beerPlan]
  )
  const streak = useMemo(() => computeTreadmillStreak(health.dailyLog, todayKey), [health.dailyLog, todayKey])

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/[0.06] bg-app-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{t('health.day_progress')}</span>
          <span className="tabular-nums">{Math.round(ratio * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
          <div
            className="h-full rounded-full bg-brand-cta transition-all duration-300"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        {streak > 0 && <p className="text-xs text-slate-500">{t('health.streak', { count: streak })}</p>}
      </div>

      {waterWarning && (
        <div className="flex items-start gap-2 rounded-2xl border border-priority-medium/30 bg-priority-medium/10 p-3 text-sm text-slate-200">
          <Droplets size={16} className="mt-0.5 shrink-0 text-priority-medium" />
          <span>{t('health.water_warning')}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {DAILY_CHECK_KEYS.map((key) => {
          const checked = !!entry[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleHealthCheck(todayKey, key)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors active:scale-[0.97] ${
                checked ? 'bg-brand-cta text-brand-ctaForeground' : 'bg-app-card text-slate-300 hover:bg-app-cardMuted'
              }`}
            >
              <span>{CHECK_EMOJI[key]}</span>
              <span className="truncate">{t(`health.check_${key}`)}</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-app-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">{t('health.steps')}</label>
          <input
            type="number"
            inputMode="numeric"
            value={entry.steps ?? ''}
            onChange={(e) => setHealthDay(todayKey, { steps: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="0"
            className="w-24 rounded-md bg-app-bg px-2 py-1.5 text-right text-base text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-slate-300">
            <Beer size={14} /> {t('health.beer')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHealthBeerCount(todayKey, (entry.beer || 0) - 1)}
              aria-label={t('health.beer_minus')}
              className="rounded-full bg-app-cardMuted p-1.5 text-slate-300 transition-transform active:scale-90"
            >
              <Minus size={14} />
            </button>
            <span className="w-5 text-center text-sm tabular-nums text-slate-100">{entry.beer || 0}</span>
            <button
              type="button"
              onClick={() => setHealthBeerCount(todayKey, (entry.beer || 0) + 1)}
              aria-label={t('health.beer_plus')}
              className="rounded-full bg-app-cardMuted p-1.5 text-slate-300 transition-transform active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">{t('health.beer_usage', { used: beerUsage.used, limit: beerUsage.limit })}</p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">{t('health.salty_food')}</span>
          <button
            type="button"
            onClick={() => setHealthDay(todayKey, { saltyFood: !entry.saltyFood })}
            className={`rounded-full px-3 py-1 text-xs transition-colors active:scale-[0.97] ${
              entry.saltyFood ? 'bg-priority-medium text-slate-900' : 'bg-app-cardMuted text-slate-300'
            }`}
          >
            {entry.saltyFood ? t('health.yes') : t('health.no')}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">{t('health.sleep_hours')}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={entry.sleepHours ?? ''}
            onChange={(e) =>
              setHealthDay(todayKey, { sleepHours: e.target.value === '' ? null : Number(e.target.value) })
            }
            placeholder="0"
            className="w-20 rounded-md bg-app-bg px-2 py-1.5 text-right text-base text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-app-card p-3 space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">{t('health.mood')}</p>
          <div className="flex justify-between">
            {MOOD_EMOJI.map((emoji, i) => {
              const value = i + 1
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHealthDay(todayKey, { mood: value })}
                  className={`rounded-lg px-2.5 py-1.5 text-lg transition-transform active:scale-90 ${
                    entry.mood === value ? 'bg-brand-cta' : 'bg-app-cardMuted'
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">{t('health.stress')}</p>
          <div className="flex justify-between">
            {STRESS_EMOJI.map((emoji, i) => {
              const value = i + 1
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHealthDay(todayKey, { stress: value })}
                  className={`rounded-lg px-2.5 py-1.5 text-lg transition-transform active:scale-90 ${
                    entry.stress === value ? 'bg-brand-cta' : 'bg-app-cardMuted'
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
