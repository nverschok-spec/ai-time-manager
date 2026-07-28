import { useState } from 'react'
import {
  AlarmClockPlus,
  Bell,
  Cake,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  ListChecks,
  MapPin,
  Pencil,
  Repeat,
  Share2,
  Timer,
  Trash2
} from 'lucide-react'
import { priorityMeta } from '../lib/priority'
import { categoryMeta } from '../lib/categories'
import { computeStreak } from '../lib/streak'
import { vibrate, HAPTIC } from '../lib/haptics'
import { shareTask } from '../lib/share'
import { useAppStore } from '../store/useAppStore'
import SwipeableRow from './SwipeableRow'

export default function TaskRow({ task, todayKey, pushEnabled, onToggle, onEdit, onRemove, onOpenTimer, onOpenReminder }) {
  const snoozeTask = useAppStore((s) => s.snoozeTask)
  const toggleChecklistItem = useAppStore((s) => s.toggleChecklistItem)
  const meta = priorityMeta(task.priority)
  const Icon = meta.icon
  const catMeta = categoryMeta(task.category)
  const CatIcon = catMeta?.icon
  // computeStreak walks backward day-by-day from today until it hits
  // task.date, which would be a years-long loop for a yearly anchor — streaks
  // only make sense for the daily/weekdays/weekly cadences anyway.
  const streak = task.recurrence && task.recurrence !== 'yearly' ? computeStreak(task, todayKey) : 0
  const yearlyAge =
    task.recurrence === 'yearly' ? new Date(task.occurrenceDate).getFullYear() - new Date(task.date).getFullYear() : null
  const [justCopied, setJustCopied] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)

  function handleChecklistToggle(itemId) {
    vibrate(HAPTIC.tap)
    toggleChecklistItem(task.id, itemId)
  }

  function handleToggle() {
    vibrate(task.done ? HAPTIC.tap : HAPTIC.success)
    onToggle(task)
  }

  function handleRemove() {
    vibrate(HAPTIC.delete)
    onRemove(task)
  }

  function handleSnooze() {
    vibrate(HAPTIC.tap)
    snoozeTask(task.id)
  }

  async function handleShare() {
    const result = await shareTask(task)
    if (result === 'copied') {
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 1500)
    }
  }

  return (
    <SwipeableRow onSwipeLeft={handleRemove} onSwipeRight={handleToggle}>
      <div className="flex flex-col gap-1.5 rounded-xl bg-app-card px-3 py-2">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={task.done}
            onChange={handleToggle}
            className="h-4 w-4 shrink-0 accent-brand-cta"
          />
          <Icon size={14} color={meta.color} className="shrink-0" />
          <span className="shrink-0 text-sm text-slate-400 tabular-nums">{task.startTime}</span>
          <span
            className={`min-w-0 flex-1 truncate text-sm ${task.done ? 'line-through text-slate-500' : 'text-slate-100'}`}
          >
            {task.emoji && <span className="mr-1">{task.emoji}</span>}
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2 pl-7">
          {task.recurrence && <Repeat size={13} className="shrink-0 text-slate-500" />}
          {catMeta && <CatIcon size={13} color={catMeta.color} className="shrink-0" />}
          {yearlyAge !== null && yearlyAge > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs text-priority-medium">
              <Cake size={12} /> {yearlyAge}
            </span>
          )}
          {streak > 1 && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs text-priority-medium">
              <Flame size={12} /> {streak}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {pushEnabled && (
              <button
                type="button"
                onClick={() => onOpenReminder(task)}
                className="text-slate-500 hover:text-priority-medium transition-colors"
              >
                <Bell size={16} />
              </button>
            )}
            {!task.recurrence && !task.done && (
              <button
                type="button"
                onClick={handleSnooze}
                title="+1h"
                className="text-slate-500 hover:text-priority-medium transition-colors"
              >
                <AlarmClockPlus size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenTimer(task)}
              className="text-slate-500 hover:text-brand-cta transition-colors"
            >
              <Timer size={16} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="text-slate-500 hover:text-sky-400 transition-colors"
            >
              {justCopied ? <Check size={16} className="text-brand-cta" /> : <Share2 size={16} />}
            </button>
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="text-slate-500 hover:text-sky-400 transition-colors"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-slate-500 hover:text-priority-high transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {task.notes && (
          <div className="flex items-center gap-1.5 pl-7">
            <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{task.notes}</p>
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(task.notes)}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-slate-600 hover:text-brand-cta transition-colors"
            >
              <MapPin size={13} />
            </a>
          </div>
        )}
        {task.checklist?.length > 0 && (
          <div className="pl-7">
            <button
              type="button"
              onClick={() => setChecklistOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ListChecks size={12} />
              {task.checklist.filter((i) => i.done).length}/{task.checklist.length}
              {checklistOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {checklistOpen && (
              <ul className="mt-1 space-y-1">
                {task.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleChecklistToggle(item.id)}
                      className="h-3.5 w-3.5 shrink-0 accent-brand-cta"
                    />
                    <span className={`text-xs ${item.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SwipeableRow>
  )
}
