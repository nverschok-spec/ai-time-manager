import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PRIORITY_ORDER, priorityMeta } from '../lib/priority'
import { CATEGORY_ORDER, categoryMeta } from '../lib/categories'

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekdays', 'weekly', 'yearly']
const REMINDER_OFFSET_OPTIONS = [0, 5, 15, 30, 60]

// task === null → create mode (addTask); task !== null → edit mode (editTask), pre-filled.
// prefill (create mode only) seeds fields from a quick template, still editable before saving.
export default function TaskForm({ task, defaultDate, prefill, onCancel }) {
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
  // Notes/checklist/repeat/reminder are the fields a quick "buy bread" add
  // never needs — collapsed by default so the form doesn't dump everything
  // on you at once. Auto-expanded when editing a task that already uses any
  // of them, so opening an existing recurring task's reminder doesn't hide it.
  const [showMore, setShowMore] = useState(
    Boolean(task?.notes || task?.checklist?.length > 0 || (task?.recurrence && task.recurrence !== 'none') || task?.reminderOffsetMinutes != null)
  )

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
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {t('calendar.more_options')}
      </button>

      {showMore && (
        <>
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
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-md bg-app-bg px-2 py-1 text-sm text-slate-200"
                  >
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
        </>
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
