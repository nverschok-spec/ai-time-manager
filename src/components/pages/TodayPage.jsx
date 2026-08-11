import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Users, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { expandOccurrences } from '../../lib/occurrences'
import { toDateKey } from '../../lib/date'
import { vibrate, HAPTIC } from '../../lib/haptics'
import { QUICK_TEMPLATES } from '../../lib/quickTemplates'
import TaskForm from '../TaskForm'
import TaskRow from '../TaskRow'
import PomodoroTimer from '../PomodoroTimer'
import ReminderPicker from '../ReminderPicker'
import UndoSnackbar from '../UndoSnackbar'
import EmptyStateIllustration from '../EmptyStateIllustration'
import Confetti from '../Confetti'
import AiActivityStack from '../AiActivityStack'

// The default landing page — just today, nothing else. Week/Month browsing
// and search live on the Calendar page; this one page's whole job is "what
// do I need to do right now."
export default function TodayPage() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const familyEvents = useAppStore((s) => s.familyEvents)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const toggleTaskOccurrence = useAppStore((s) => s.toggleTaskOccurrence)
  const removeTask = useAppStore((s) => s.removeTask)
  const restoreTask = useAppStore((s) => s.restoreTask)
  const pushEnabled = useAppStore((s) => s.pushEnabled)

  const [showAddForm, setShowAddForm] = useState(false)
  const [prefillTemplate, setPrefillTemplate] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [timerTask, setTimerTask] = useState(null)
  const [reminderTask, setReminderTask] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const todayKey = toDateKey(new Date())

  const todayTasks = useMemo(() => {
    const map = expandOccurrences(tasks, [todayKey])
    return map[todayKey].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [tasks, todayKey])

  // Shared events land here too — they're the one thing on this page that
  // isn't private to whoever's logged in, so they get their own small block
  // instead of being mixed into the personal task list below.
  const todayFamilyEvents = useMemo(
    () => familyEvents.filter((e) => e.date === todayKey),
    [familyEvents, todayKey]
  )

  function handleToggle(task) {
    if (task.recurrence) toggleTaskOccurrence(task.id, task.occurrenceDate)
    else toggleTask(task.id)
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
    if (todayTasks.length === 0 || !todayTasks.every((t) => t.done)) return
    const celebratedKey = `ai-time-manager-celebrated-${todayKey}`
    if (localStorage.getItem(celebratedKey) === '1') return
    localStorage.setItem(celebratedKey, '1')
    vibrate(HAPTIC.success)
    setShowConfetti(true)
  }, [todayTasks, todayKey])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        {!showAddForm && !editingTask && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.key}
                type="button"
                onClick={() => openTemplate(tpl)}
                className="rounded-full bg-app-card px-2.5 py-1 text-xs text-slate-400 transition-transform active:scale-[0.97] hover:bg-app-cardMuted hover:text-slate-100"
              >
                {t(`quick_templates.${tpl.key}`)}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={openAddForm}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-brand-cta px-2.5 py-1.5 text-sm font-medium text-brand-ctaForeground transition-transform active:scale-[0.97] hover:brightness-110"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {t('calendar.add_task')}
        </button>
      </div>

      {!showAddForm && !editingTask && <AiActivityStack />}

      {showAddForm && (
        <TaskForm
          defaultDate={todayKey}
          prefill={prefillTemplate}
          onCancel={() => {
            setShowAddForm(false)
            setPrefillTemplate(null)
          }}
        />
      )}
      {editingTask && <TaskForm task={editingTask} defaultDate={todayKey} onCancel={() => setEditingTask(null)} />}

      {todayFamilyEvents.length > 0 && !showAddForm && !editingTask && (
        <div className="space-y-1.5 rounded-2xl border border-brand-cta/20 bg-brand-cta/10 p-3">
          {todayFamilyEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-2 text-sm text-slate-100">
              <Users size={14} className="shrink-0 text-brand-cta" />
              <span className="min-w-0 flex-1 truncate">{event.title}</span>
              {event.createdByName && <span className="shrink-0 text-xs text-slate-400">{event.createdByName}</span>}
            </div>
          ))}
        </div>
      )}

      {todayTasks.length === 0 && !showAddForm && !editingTask && <EmptyStateIllustration />}

      <ul className="space-y-2">
        {todayTasks.map((task) => (
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
