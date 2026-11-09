import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import { ZONES, weakSpots, zoneWeek } from '../../lib/german'

// Where the effort went this week, by zone — the lowest zone (once there's
// any activity at all) is flagged as the one to feed next.
export default function ZoneProgress() {
  const { t } = useTranslation()
  const german = useAppStore((s) => s.german)
  const today = toDateKey(new Date())
  const week = useMemo(() => zoneWeek(german.progress.history, today), [german.progress.history, today])
  const spots = useMemo(() => weakSpots(german, 3), [german])

  const total = ZONES.reduce((s, z) => s + week[z], 0)
  const max = Math.max(1, ...ZONES.map((z) => week[z]))
  const weakest = total > 0 ? ZONES.reduce((a, b) => (week[b] < week[a] ? b : a)) : null

  return (
    <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4">
      <p className="text-xs text-slate-500">{t('german.zones_title')}</p>
      {ZONES.map((z) => (
        <div key={z} className="space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>
              {t(`german.zone_${z}`)}
              {z === weakest && <span className="ml-2 text-xs text-priority-medium">{t('german.zone_weakest')}</span>}
            </span>
            <span className="tabular-nums text-slate-400">{week[z]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
            <div
              className={`h-full rounded-full transition-all duration-300 ${z === weakest ? 'bg-priority-medium' : 'bg-brand-cta'}`}
              style={{ width: `${(week[z] / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {spots.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.06] pt-3">
          <p className="text-xs text-slate-500">{t('german.weak_spots')}</p>
          {spots.map((s) => (
            <div key={s.category} className="flex justify-between text-sm text-slate-300">
              <span>{t(`german.err_${s.category}`)}</span>
              <span className="tabular-nums text-priority-high">×{s.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
