import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Pencil, Plus, Repeat, Timer, Trash2, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PRIORITY_ORDER, priorityMeta } from '../lib/priority'
import { expandOccurrences } from '../lib/occurrences'
import PomodoroTimer from './PomodoroTimer'
import ReminderPicker from './ReminderPicker'
import UndoSnackbar from './UndoSnackbar'
import SwipeableRow from './SwipeableRow'
import MonthView from './MonthView'

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekdays', 'weekly']
const REMINDER_OFFSET_OPTIONS = [0, 5, 15, 30, 60]

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function formatDayLabel(dateKey, locale) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

// task === null → create mode (addTask); task !== null → edit mode (editTask), pre-filled.
function TaskForm({ task, defaultDate, onCancel }) {
  const { t } = useTranslation()
  const addTask = useAppStore((s) => s.addTask)
  const editTask = useAppStore((s) => s.editTask)
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [date, setDate] = useState(task?.date ?? defaultDate)
  const [startTime, setStartTime] = useState(task?.startTime ?? '09:00')
  const [durationMinutes, setDurationMinutes] = useState(task?.durationMinutes ?? 30)
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? 'none')
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(task?.reminderOffsetMinutes ?? 15)

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
      recurrence: recurrence === 'none' ? undefined : recurrence,
      reminderOffsetMinutes
    }
    if (task) {
      editTask(task.id, payload)
    } else {
      addTask(payload)
    }
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2">
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('calendar.title_placeholder')}
        className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <textarea
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('calendar.notes_placeholder')}
        className="w-full resize-none rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <input
          type="number"
          min="5"
          step="5"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          title={t('calendar.duration')}
          className="rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{t('calendar.priority')}</span>
        <div className="inline-flex rounded-lg bg-slate-900 p-1 gap-1">
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
                  active ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
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
        <div className="inline-flex rounded-lg bg-slate-900 p-1 gap-1">
          {RECURRENCE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecurrence(r)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                recurrence === r ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t(`calendar.repeat_${r}`)}
            </button>
          ))}
        </div>
      </div>
      {pushEnabled && recurrence === 'none' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{t('calendar.remind')}</span>
          <div className="inline-flex rounded-lg bg-slate-900 p-1 gap-1 flex-wrap">
            {REMINDER_OFFSET_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setReminderOffsetMinutes(minutes)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  reminderOffsetMinutes === minutes
                    ? 'bg-slate-700 text-slate-100'
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
          className="flex-1 rounded-md bg-emerald-500 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition-colors"
        >
          {t('calendar.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [timerTask, setTimerTask] = useState(null)
  const [reminderTask, setReminderTask] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const todayKey = toDateKey(new Date())

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

  function handleToggle(task) {
    if (task.recurrence) {
      toggleTaskOccurrence(task.id, task.occurrenceDate)
    } else {
      toggleTask(task.id)
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-slate-800 p-1 gap-1">
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
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition-colors"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {t('calendar.add_task')}
        </button>
      </div>

      {showAddForm && <TaskForm defaultDate={todayKey} onCancel={() => setShowAddForm(false)} />}
      {editingTask && (
        <TaskForm task={editingTask} defaultDate={todayKey} onCancel={() => setEditingTask(null)} />
      )}

      {view === 'month' && <MonthView />}

      {view !== 'month' && (
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
              <ul className="space-y-2">
                {dayTasks.length === 0 && <li className="text-sm text-slate-600 italic">—</li>}
                {dayTasks.map((task) => {
                  const meta = priorityMeta(task.priority)
                  const Icon = meta.icon
                  return (
                    <li key={`${task.id}_${task.occurrenceDate}`}>
                      <SwipeableRow onSwipeLeft={() => handleRemove(task)} onSwipeRight={() => handleToggle(task)}>
                        <div className="flex flex-col gap-1 bg-slate-800/60 px-3 py-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={task.done}
                              onChange={() => handleToggle(task)}
                              className="h-4 w-4 accent-emerald-400"
                            />
                            <Icon size={14} color={meta.color} className="shrink-0" />
                            <span className="text-sm text-slate-400 tabular-nums">{task.startTime}</span>
                            <span
                              className={`flex-1 text-sm ${task.done ? 'line-through text-slate-500' : 'text-slate-100'}`}
                            >
                              {task.title}
                            </span>
                            {task.recurrence && <Repeat size={13} className="shrink-0 text-slate-500" />}
                            {pushEnabled && !task.recurrence && (
                              <button
                                type="button"
                                onClick={() => setReminderTask(task)}
                                className="text-slate-500 hover:text-amber-400 transition-colors"
                              >
                                <Bell size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setTimerTask(task)}
                              className="text-slate-500 hover:text-emerald-400 transition-colors"
                            >
                              <Timer size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(task)}
                              className="text-slate-500 hover:text-sky-400 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(task)}
                              className="text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {task.notes && <p className="truncate pl-7 text-xs text-slate-500">{task.notes}</p>}
                        </div>
                      </SwipeableRow>
                    </li>
                  )
                })}
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
