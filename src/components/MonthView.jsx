import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { expandOccurrences } from '../lib/occurrences'
import { priorityMeta } from '../lib/priority'
import { toDateKey } from '../lib/date'

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// 6x7 grid covering the full weeks that touch this month (Monday-first),
// so leading/trailing days from neighboring months fill the edges.
function buildMonthGrid(monthCursor) {
  const firstOfMonth = startOfMonth(monthCursor)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - firstWeekday)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

export default function MonthView({ selectedDate, onSelectDate }) {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const [monthCursor, setMonthCursor] = useState(() => new Date())

  const days = useMemo(() => buildMonthGrid(monthCursor), [monthCursor])
  const dateKeys = useMemo(() => days.map(toDateKey), [days])
  const occurrencesByDate = useMemo(() => expandOccurrences(tasks, dateKeys), [tasks, dateKeys])

  const todayKey = toDateKey(new Date())
  const currentMonth = monthCursor.getMonth()

  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d.toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short' })
    })
  }, [i18n.resolvedLanguage])

  function changeMonth(delta) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label={t('calendar.prev_month')}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-100"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium capitalize text-slate-200">
          {monthCursor.toLocaleDateString(i18n.resolvedLanguage, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label={t('calendar.next_month')}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {weekdayLabels.map((label, i) => (
          <div key={`${label}-${i}`} className="capitalize">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = toDateKey(d)
          const dayTasks = occurrencesByDate[key] || []
          const isCurrentMonth = d.getMonth() === currentMonth
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          const priorities = [...new Set(dayTasks.map((t) => t.priority))]

          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(key)}
              className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-all duration-150 active:scale-90 ${
                isSelected ? 'bg-brand-cta/40' : isToday ? 'bg-brand-cta/20' : 'hover:bg-white/5'
              } ${isCurrentMonth ? '' : 'opacity-30'}`}
            >
              <span
                className={`text-xs tabular-nums ${isToday ? 'font-semibold text-emerald-300' : 'text-slate-300'}`}
              >
                {d.getDate()}
              </span>
              <div className="flex h-1.5 gap-0.5">
                {priorities.slice(0, 3).map((p) => (
                  <span
                    key={p}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: priorityMeta(p).color }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
