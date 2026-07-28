import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PRIORITY_ORDER, priorityMeta } from '../lib/priority'
import { CATEGORY_ORDER, categoryMeta } from '../lib/categories'
import { expandOccurrences, isOccurrenceDone } from '../lib/occurrences'
import { toDateKey } from '../lib/date'
import { vibrate, HAPTIC } from '../lib/haptics'
import PomodoroTimer from './PomodoroTimer'
import ReminderPicker from './ReminderPicker'
import UndoSnackbar from './UndoSnackbar'
import TaskRow from './TaskRow'
import MonthView from './MonthView'
import EmptyStateIllustration from './EmptyStateIllustration'
import ShoppingList from './ShoppingList'
import FamilyEventsList from './FamilyEventsList'
import Confetti from './Confetti'

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekdays', 'weekly', 'yearly']
const REMINDER_OFFSET_OPTIONS = [0, 5, 15, 30, 60]

// One-tap starting points for common errands — still opens the form (not an
// instant silent create) so date/time/etc can be checked before saving.
const QUICK_TEMPLATES = [
  { key: 'pharmacy', category: 'health', durationMinutes: 15, priority: 'medium' },
  { key: 'groceries', category: 'home', durationMinutes: 30, priority: 'medium' },
  { key: 'workout', category: 'health', durationMinutes: 45, priority: 'medium' },
  { key: 'cleaning', category: 'home', durationMinutes: 60, priority: 'low' }
]

function formatDayLabel(dateKey, locale) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

// task === null → create mode (addTask); task !== null → edit mode (editTask), pre-filled.
// prefill (create mode only) seeds fields from a quick template, still editable before saving.
function TaskForm({ task, defaultDate, prefill, onCancel }) {
  const { t } = useTranslation()
  const addTask = useAppStore((s) => s.addTask)
  const editTask = useAppStore((s) => s.editTask)
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const allTasks = useAppStore((s) => s.tasks)
  const [title, setTitle] = useState(task?.title ?? (prefill ? t(`quick_templates.${prefill.key}`) : ''))
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [date, setDate] = useState(task?.date ?? defaultDate)
  const [startTime, setStartTime] = useState(task?.startTime ?? '09:00')
  const [durationMinutes, setDurationMinutes] = useState(task?.durationMinutes ?? prefill?.durationMinutes ?? 30)
  const [priority, setPriority] = useState(task?.priority ?? prefill?.priority ?? 'medium')
  const [category, setCategory] = useState(task?.category ?? prefill?.category ?? '')
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? 'none')
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(task?.reminderOffsetMinutes ?? 15)
  const [checklist, setChecklist] = useState(task?.checklist ?? [])
  const [checklistDraft, setChecklistDraft] = useState('')
  const [timeTouched, setTimeTouched] = useState(false)

  // Create mode only: if a past task with the same title exists, borrow its
  // time/duration as the default instead of the generic 09:00/30min — but
  // only while the user hasn't picked a time themselves.
  function handleTitleBlur() {
    if (task || timeTouched) return
    const normalized = title.trim().toLowerCase()
    if (!normalized) return
    const match = allTasks
      .filter((t) => !t.recurrence && t.title.trim().toLowerCase() === normalized)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (match) {
      setStartTime(match.startTime)
      setDurationMinutes(match.durationMinutes)
    }
  }

  function addChecklistItem() {
    const text = checklistDraft.trim()
    if (!text) return
    setChecklist((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, done: false }])
    setChecklistDraft('')
  }

  function removeChecklistItem(id) {
    setChecklist((prev) => prev.filter((i) => i.id !== id))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      notes: notes.trim(),
      date,
      startTime,
      durationMinutes: Number(durationMinutes) || 30,
      priority,
      category: category || undefined,
      recurrence: recurrence === 'none' ? undefined : recurrence,
      reminderOffsetMinutes,
      checklist: checklist.length > 0 ? checklist : undefined
    }
    if (task) {
      editTask(task.id, payload)
    } else {
      addTask(payload)
    }
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/5 bg-app-card p-3 space-y-2">
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder={t('calendar.title_placeholder')}
        className="w-full rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
      />
      <textarea
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('calendar.notes_placeholder')}
        className="w-full resize-none rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
      />

      <div className="space-y-1.5">
        {checklist.length > 0 && (
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-md bg-app-bg px-2 py-1 text-sm text-slate-200">
                <span className="min-w-0 flex-1 truncate">{item.text}</span>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="shrink-0 text-slate-500 hover:text-priority-high transition-colors"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={checklistDraft}
            onChange={(e) => setChecklistDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addChecklistItem()
              }
            }}
            placeholder={t('calendar.checklist_placeholder')}
            className="min-w-0 flex-1 rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
          />
          <button
            type="button"
            onClick={addChecklistItem}
            className="shrink-0 rounded-md bg-app-cardMuted px-2.5 py-1.5 text-sm text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-w-0 rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => {
            setTimeTouched(true)
            setStartTime(e.target.value)
          }}
          className="min-w-0 rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-slate-400">{t('calendar.duration')}</span>
        <input
          type="number"
          min="5"
          step="5"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="min-w-0 flex-1 rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{t('calendar.priority')}</span>
        <div className="inline-flex flex-wrap rounded-lg bg-app-bg p-1 gap-1">
          {PRIORITY_ORDER.map((p) => {
            const meta = priorityMeta(p)
            const Icon = meta.icon
            const active = priority === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{t('calendar.category')}</span>
        <div className="inline-flex flex-wrap rounded-lg bg-app-bg p-1 gap-1">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`rounded-md px-2 py-1 text-xs transition-colors ${
              category === '' ? 'bg-app-cardMuted text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t('calendar.category_none')}
          </button>
          {CATEGORY_ORDER.map((c) => {
            const meta = categoryMeta(c)
            const Icon = meta.icon
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{t('calendar.repeat')}</span>
        <div className="inline-flex flex-wrap rounded-lg bg-app-bg p-1 gap-1">
          {RECURRENCE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecurrence(r)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                recurrence === r ? 'bg-app-cardMuted text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t(`calendar.repeat_${r}`)}
            </button>
          ))}
        </div>
      </div>
      {pushEnabled && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{t('calendar.remind')}</span>
          <div className="inline-flex rounded-lg bg-app-bg p-1 gap-1 flex-wrap">
            {REMINDER_OFFSET_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setReminderOffsetMinutes(minutes)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  reminderOffsetMinutes === minutes
                    ? 'bg-app-cardMuted text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t(`calendar.remind_${minutes}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 rounded-md bg-brand-cta py-1.5 text-sm font-medium text-app-bg hover:brightness-110 transition-colors"
        >
          {t('calendar.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-app-cardMuted px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors"
        >
          {t('calendar.cancel')}
        </button>
      </div>
    </form>
  )
}

export default function CalendarView() {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const toggleTaskOccurrence = useAppStore((s) => s.toggleTaskOccurrence)
  const removeTask = useAppStore((s) => s.removeTask)
  const restoreTask = useAppStore((s) => s.restoreTask)
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const [view, setView] = useState('day')
  const [selectedMonthDate, setSelectedMonthDate] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [prefillTemplate, setPrefillTemplate] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [timerTask, setTimerTask] = useState(null)
  const [reminderTask, setReminderTask] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const todayKey = toDateKey(new Date())

  // Flat, date-agnostic results — searching by title/notes/category doesn't
  // fit the day/week/month tabs (a match could be on any date), so when a
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
    if (view === 'day') return [todayKey]
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return toDateKey(d)
    })
  }, [view, todayKey])

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
    if (task.recurrence) {
      toggleTaskOccurrence(task.id, task.occurrenceDate)
    } else {
      toggleTask(task.id)
    }
  }

  function openAddForm() {
    setEditingTask(null)
    setPrefillTemplate(null)
    setShowAddForm((v) => !v)
  }

  function openTemplate(tpl) {
    setEditingTask(null)
    setPrefillTemplate(tpl)
    setShowAddForm(true)
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

  // Once-per-day celebration: fires the moment today's list transitions to
  // fully done. Persisted in localStorage (not the store) since it's a pure
  // UI moment, not data worth syncing across devices/people.
  useEffect(() => {
    const todayTasks = tasksByDate[todayKey] || []
    if (todayTasks.length === 0 || !todayTasks.every((t) => t.done)) return
    const celebratedKey = `ai-time-manager-celebrated-${todayKey}`
    if (localStorage.getItem(celebratedKey) === '1') return
    localStorage.setItem(celebratedKey, '1')
    vibrate(HAPTIC.success)
    setShowConfetti(true)
  }, [tasksByDate, todayKey])

  const addFormDefaultDate = view === 'month' && selectedMonthDate ? selectedMonthDate : todayKey
  const isListView = view === 'shopping' || view === 'family'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-lg bg-app-card p-1 gap-1">
          <button
            type="button"
            onClick={() => setView('day')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === 'day' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t('nav.today')}
          </button>
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
          <button
            type="button"
            onClick={() => setView('shopping')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === 'shopping' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t('nav.shopping')}
          </button>
          <button
            type="button"
            onClick={() => setView('family')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === 'family' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t('nav.family')}
          </button>
        </div>
        {!isListView && (
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
        )}
      </div>

      {showSearch && !isListView && (
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

      {view === 'shopping' && <ShoppingList />}
      {view === 'family' && <FamilyEventsList />}

      {!showAddForm && !editingTask && !isListView && !searchResults && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => openTemplate(tpl)}
              className="rounded-full bg-app-card px-2.5 py-1 text-xs text-slate-400 hover:text-slate-100 hover:bg-app-cardMuted transition-colors"
            >
              {t(`quick_templates.${tpl.key}`)}
            </button>
          ))}
        </div>
      )}

      {showAddForm && !isListView && (
        <TaskForm
          defaultDate={addFormDefaultDate}
          prefill={prefillTemplate}
          onCancel={() => {
            setShowAddForm(false)
            setPrefillTemplate(null)
          }}
        />
      )}
      {editingTask && (
        <TaskForm task={editingTask} defaultDate={todayKey} onCancel={() => setEditingTask(null)} />
      )}

      {searchResults && !isListView && (
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

      {!searchResults && view !== 'month' && !isListView && (
      <div className="space-y-5">
        {visibleDateKeys.map((dateKey) => {
          const dayTasks = tasksByDate[dateKey]
          const doneCount = dayTasks.filter((t) => t.done).length
          return (
            <div key={dateKey}>
              {view === 'week' && (
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
              )}
              {dayTasks.length === 0 && view === 'day' && <EmptyStateIllustration />}
              <ul className="space-y-2">
                {dayTasks.length === 0 && view === 'week' && (
                  <li className="text-sm text-slate-600 italic">—</li>
                )}
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

      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
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
