import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ZoneProgress from './ZoneProgress'
import { Check, Flame } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import { activeDays, computeDayStreak, isStreakAtRisk, nextControlTestDate, daysBetween } from '../../lib/german'

const PLANS = {
  min: [
    { key: 'words', minutes: 15, tab: 'words' },
    { key: 'exercise', minutes: 10, tab: 'grammar' }
  ],
  norm: [
    { key: 'words', minutes: 20, tab: 'words' },
    { key: 'grammar', minutes: 25, tab: 'grammar' },
    { key: 'exercise', minutes: 15, tab: 'grammar' },
    { key: 'writing', minutes: 20, tab: 'writing' },
    { key: 'listening', minutes: 15, tab: null }
  ]
}

const inputCls =
  'rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta'

export default function GermanToday({ onOpenTab }) {
  const { t } = useTranslation()
  const german = useAppStore((s) => s.german)
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const setSettings = useAppStore((s) => s.setGermanSettings)
  const togglePlanItem = useAppStore((s) => s.toggleGermanPlanItem)
  const markDone = useAppStore((s) => s.markGermanDayDone)
  const unmarkDone = useAppStore((s) => s.unmarkGermanDayDone)

  const { settings } = german
  const today = toDateKey(new Date())
  const done = german.doneDates.includes(today)
  const checked = german.planChecks[today] || []
  const streak = useMemo(() => computeDayStreak(activeDays(german), today), [german.doneDates, german.activeDates, today])
  const plan = PLANS[settings.dayMode] || PLANS.min
  const totalMinutes = plan.reduce((s, i) => s + i.minutes, 0)

  const controlDue = nextControlTestDate(german.checks)
  const daysToControl = controlDue ? daysBetween(today, controlDue) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-white/[0.06] bg-app-card p-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className={streak > 0 ? 'text-priority-medium' : 'text-slate-600'} />
          <div>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">{streak}</p>
            <p className="text-xs text-slate-500">{t('german.streak')}</p>
          </div>
        </div>
        <p className="max-w-[11rem] text-right text-xs text-slate-500">
          {isStreakAtRisk(german, today) && streak > 0 ? t('german.streak_at_risk') : t('german.streak_note')}
        </p>
      </div>

      <ZoneProgress />

      <div className="inline-flex gap-1 rounded-lg bg-app-card p-1">
        {['min', 'norm'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSettings({ dayMode: m })}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              settings.dayMode === m ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t(`german.mode_${m}`)}
          </button>
        ))}
      </div>

      <div className="space-y-1 rounded-3xl border border-white/[0.06] bg-app-card p-3">
        <div className="flex items-center justify-between px-1 pb-1 text-xs text-slate-500">
          <span>{t(`german.plan_${settings.dayMode}`)}</span>
          <span className="tabular-nums">
            ~{totalMinutes} {t('german.min')}
          </span>
        </div>
        {plan.map((item) => {
          const on = checked.includes(item.key)
          return (
            <div key={item.key} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
              <button
                type="button"
                onClick={() => togglePlanItem(today, item.key)}
                aria-label={t(`german.item_${item.key}`)}
                aria-pressed={on}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  on ? 'border-brand-cta bg-brand-cta text-brand-ctaForeground' : 'border-white/20 text-transparent'
                }`}
              >
                <Check size={14} />
              </button>
              <div className="flex-1">
                <p className={`text-sm ${on ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {t(`german.item_${item.key}`)}
                </p>
                <p className="text-xs text-slate-500">
                  ~{item.minutes} {t('german.min')}
                </p>
              </div>
              {item.tab && (
                <button
                  type="button"
                  onClick={() => onOpenTab(item.tab)}
                  className="rounded-full bg-app-cardMuted px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10"
                >
                  {t('german.open')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {done ? (
        <button
          type="button"
          onClick={unmarkDone}
          className="w-full rounded-full bg-app-cardMuted py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/10"
        >
          {t('german.done_undo')}
        </button>
      ) : (
        <button
          type="button"
          onClick={markDone}
          className="w-full rounded-full bg-brand-cta py-2.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {t('german.done_button')}
        </button>
      )}

      {daysToControl != null && daysToControl <= 3 && (
        <div className="rounded-2xl bg-app-card p-3 text-sm text-priority-medium">
          {daysToControl <= 0 ? t('german.control_due_now') : t('german.control_due_soon', { count: daysToControl })}
        </div>
      )}

      <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <label className="flex items-center justify-between text-sm text-slate-300">
          {t('german.reminders')}
          <input
            type="checkbox"
            checked={settings.remindersEnabled}
            onChange={(e) => setSettings({ remindersEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[11px] text-slate-500">
            {t('german.morning_time')}
            <input
              type="time"
              value={settings.morningTime}
              onChange={(e) => e.target.value && setSettings({ morningTime: e.target.value })}
              className={`w-full ${inputCls}`}
            />
          </label>
          <label className="space-y-1 text-[11px] text-slate-500">
            {t('german.evening_time')}
            <input
              type="time"
              value={settings.eveningTime}
              onChange={(e) => e.target.value && setSettings({ eveningTime: e.target.value })}
              className={`w-full ${inputCls}`}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">{t('german.reminders_hint')}</p>
        {!pushEnabled && <p className="text-xs text-priority-medium">{t('german.push_off')}</p>}
      </div>

      <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <label className="block space-y-1 text-[11px] text-slate-500">
          {t('german.goal_label')}
          <input
            type="text"
            value={settings.goal}
            onChange={(e) => setSettings({ goal: e.target.value })}
            className={`w-full ${inputCls}`}
          />
        </label>
        <label className="block space-y-1 text-[11px] text-slate-500">
          {t('german.horizon_label')}
          <input
            type="text"
            value={settings.goalMonths}
            onChange={(e) => setSettings({ goalMonths: e.target.value })}
            className={`w-full ${inputCls}`}
          />
        </label>
      </div>
    </div>
  )
}
