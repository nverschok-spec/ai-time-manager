import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { CATEGORY_ORDER, categoryMeta } from '../../lib/categories'
import { expandOccurrences, isOccurrenceDone } from '../../lib/occurrences'
import { toDateKey } from '../../lib/date'
import TaskForm from '../TaskForm'
import PomodoroTimer from '../PomodoroTimer'
import ReminderPicker from '../ReminderPicker'
import UndoSnackbar from '../UndoSnackbar'
import TaskRow from '../TaskRow'
import MonthView from '../MonthView'

function formatDayLabel(dateKey, locale) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

// Week/Month browsing + search — the "look at my schedule" page. Today's own
// list lives on the Home page instead, so this never needs a "day" tab.
export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const toggleTaskOccurrence = useAppStore((s) => s.toggleTaskOccurrence)
  const removeTask = useAppStore((s) => s.removeTask)
  const restoreTask = useAppStore((s) => s.restoreTask)
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const [view, setView] = useState('week')
  const [selectedMonthDate, setSelectedMonthDate] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [timerTask, setTimerTask] = useState(null)
  const [reminderTask, setReminderTask] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const todayKey = toDateKey(new Date())

  // Flat, date-agnostic results — searching by title/notes/category doesn't
  // fit the week/month tabs (a match could be on any date), so when a
  // search is active it fully replaces the tab content below instead of
  // filtering within it.
  const searchResults = useMemo(() => {
    if (!query.trim() && !categoryFilter) return null
    const q = query.trim().toLowerCase()
    return tasks
      .filter((task) => {
        if (categoryFilter && task.category !== categoryFilter) return false
        if (!q) return true
        return task.title.toLowerCase().includes(q) || (task.notes || '').toLowerCase().includes(q)
      })
      .map((task) => ({
        ...task,
        occurrenceDate: task.recurrence ? todayKey : task.date,
        done: task.recurrence ? isOccurrenceDone(task, todayKey) : task.done
      }))
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  }, [tasks, query, categoryFilter, todayKey])

  const visibleDateKeys = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return toDateKey(d)
    })
  }, [todayKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const tasksByDate = useMemo(() => {
    const map = expandOccurrences(tasks, visibleDateKeys)
    for (const key of visibleDateKeys) {
      map[key].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
    }
    return map
  }, [tasks, visibleDateKeys])

  // Independent of visibleDateKeys (which only covers today/next 7 days) —
  // a tap in month view can land on any date, past or future.
  const selectedDateTasks = useMemo(() => {
    if (!selectedMonthDate) return []
    const map = expandOccurrences(tasks, [selectedMonthDate])
    return map[selectedMonthDate].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [tasks, selectedMonthDate])

  function handleToggle(task) {
    if (task.recurrence) toggleTaskOccurrence(task.id, task.occurrenceDate)
    else toggleTask(task.id)
  }

  function openAddForm() {
    setEditingTask(null)
    setShowAddForm((v) => !v)
  }

  function openEditForm(task) {
    setShowAddForm(false)
    setEditingTask(task)
  }

  function handleRemove(task) {
    removeTask(task.id)
    setPendingDelete(task)
  }

  function handleUndoRemove() {
    if (pendingDelete) restoreTask(pendingDelete)
    setPendingDelete(null)
  }

  const addFormDefaultDate = view === 'month' && selectedMonthDate ? selectedMonthDate : todayKey

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-lg bg-app-card p-1 gap-1">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === 'week' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t('nav.week')}
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === 'month' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t('nav.month')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowSearch((v) => !v)
              if (showSearch) {
                setQuery('')
                setCategoryFilter('')
              }
            }}
            className={`rounded-full p-2 transition-colors ${
              showSearch ? 'bg-brand-cta text-app-bg' : 'bg-app-card text-slate-300 hover:text-slate-100'
            }`}
          >
            {showSearch ? <X size={16} /> : <Search size={16} />}
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-1 rounded-full bg-brand-cta px-2.5 py-1.5 text-sm font-medium text-app-bg hover:brightness-110 transition-all"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {t('calendar.add_task')}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="space-y-2 rounded-2xl border border-white/5 bg-app-card p-3">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('calendar.search_placeholder')}
            className="w-full rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
          />
          <div className="inline-flex flex-wrap rounded-lg bg-app-bg p-1 gap-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                categoryFilter === '' ? 'bg-app-cardMuted text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t('calendar.category_all')}
            </button>
            {CATEGORY_ORDER.map((c) => {
              const meta = categoryMeta(c)
              const Icon = meta.icon
              const active = categoryFilter === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    active ? 'bg-app-cardMuted text-slate-100' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={12} color={meta.color} />
                  {t(meta.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showAddForm && (
        <TaskForm defaultDate={addFormDefaultDate} onCancel={() => setShowAddForm(false)} />
      )}
      {editingTask && (
        <TaskForm task={editingTask} defaultDate={todayKey} onCancel={() => setEditingTask(null)} />
      )}

      {searchResults && (
        <ul className="space-y-2">
          {searchResults.length === 0 ? (
            <li className="text-sm italic text-slate-600">{t('calendar.search_empty')}</li>
          ) : (
            searchResults.map((task) => (
              <li key={`${task.id}_${task.occurrenceDate}`}>
                <TaskRow
                  task={task}
                  todayKey={todayKey}
                  pushEnabled={pushEnabled}
                  onToggle={handleToggle}
                  onEdit={openEditForm}
                  onRemove={handleRemove}
                  onOpenTimer={setTimerTask}
                  onOpenReminder={setReminderTask}
                />
              </li>
            ))
          )}
        </ul>
      )}

      {!searchResults && view === 'month' && (
        <>
          <MonthView selectedDate={selectedMonthDate} onSelectDate={setSelectedMonthDate} />

          {selectedMonthDate && (
            <div className="space-y-2 rounded-2xl border border-white/5 bg-app-card/60 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium capitalize text-slate-300">
                  {formatDayLabel(selectedMonthDate, i18n.resolvedLanguage)}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedMonthDate(null)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {selectedDateTasks.length === 0 ? (
                <p className="text-sm italic text-slate-600">—</p>
              ) : (
                <ul className="space-y-2">
                  {selectedDateTasks.map((task) => (
                    <li key={`${task.id}_${task.occurrenceDate}`}>
                      <TaskRow
                        task={task}
                        todayKey={todayKey}
                        pushEnabled={pushEnabled}
                        onToggle={handleToggle}
                        onEdit={openEditForm}
                        onRemove={handleRemove}
                        onOpenTimer={setTimerTask}
                        onOpenReminder={setReminderTask}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {!searchResults && view === 'week' && (
        <div className="space-y-5">
          {visibleDateKeys.map((dateKey) => {
            const dayTasks = tasksByDate[dateKey]
            const doneCount = dayTasks.filter((t) => t.done).length
            return (
              <div key={dateKey}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-400 capitalize">
                    {formatDayLabel(dateKey, i18n.resolvedLanguage)}
                  </h3>
                  {dayTasks.length > 0 && (
                    <span className="text-xs tabular-nums text-slate-500">
                      {doneCount}/{dayTasks.length}
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {dayTasks.length === 0 && <li className="text-sm text-slate-600 italic">—</li>}
                  {dayTasks.map((task) => (
                    <li key={`${task.id}_${task.occurrenceDate}`}>
                      <TaskRow
                        task={task}
                        todayKey={todayKey}
                        pushEnabled={pushEnabled}
                        onToggle={handleToggle}
                        onEdit={openEditForm}
                        onRemove={handleRemove}
                        onOpenTimer={setTimerTask}
                        onOpenReminder={setReminderTask}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {timerTask && <PomodoroTimer task={timerTask} onClose={() => setTimerTask(null)} />}
      {reminderTask && <ReminderPicker task={reminderTask} onClose={() => setReminderTask(null)} />}
      {pendingDelete && (
        <UndoSnackbar
          key={pendingDelete.id}
          label={pendingDelete.title}
          onUndo={handleUndoRemove}
          onDismiss={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
