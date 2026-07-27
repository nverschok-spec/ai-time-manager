import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { expandOccurrences } from '../lib/occurrences'
import { toDateKey } from '../lib/date'

const WEEKS = 12

// Sequential single-hue scale (brand-cta at increasing opacity) rather than
// a separate palette — a heatmap only needs to show "how much", not "which
// category", so one hue read as intensity is the right tool here.
function levelClass(day) {
  if (!day || day.total === 0) return 'bg-app-cardMuted'
  if (day.ratio >= 1) return 'bg-brand-cta'
  if (day.ratio >= 0.6) return 'bg-brand-cta/70'
  if (day.ratio >= 0.3) return 'bg-brand-cta/40'
  return 'bg-brand-cta/20'
}

export default function ActivityHeatmap() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)

  const cells = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - WEEKS * 7 + 1)

    const keys = []
    const cursor = new Date(start)
    while (cursor <= today) {
      keys.push(toDateKey(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    const map = expandOccurrences(tasks, keys)
    const days = keys.map((key) => {
      const dayTasks = map[key]
      const done = dayTasks.filter((t) => t.done).length
      return { key, done, total: dayTasks.length, ratio: dayTasks.length ? done / dayTasks.length : 0 }
    })

    // Pad the front so columns line up on Monday, giving a clean 7-row grid
    // (grid-flow-col fills top-to-bottom then moves to the next column).
    const leadingPad = (new Date(`${keys[0]}T00:00:00`).getDay() + 6) % 7
    return [...Array(leadingPad).fill(null), ...days]
  }, [tasks])

  return (
    <div className="rounded-3xl border border-white/5 bg-app-card p-4">
      <p className="mb-3 text-xs text-slate-500">{t('stats.activity')}</p>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1"
        style={{ gridAutoColumns: '10px' }}
      >
        {cells.map((day, i) => (
          <div
            key={day?.key ?? `pad-${i}`}
            title={day ? `${day.key}: ${day.done}/${day.total}` : undefined}
            className={`h-2.5 w-2.5 rounded-sm ${levelClass(day)}`}
          />
        ))}
      </div>
    </div>
  )
}
