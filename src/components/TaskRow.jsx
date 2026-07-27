import { Bell, Flame, Pencil, Repeat, Timer, Trash2 } from 'lucide-react'
import { priorityMeta } from '../lib/priority'
import { computeStreak } from '../lib/streak'
import SwipeableRow from './SwipeableRow'

export default function TaskRow({ task, todayKey, pushEnabled, onToggle, onEdit, onRemove, onOpenTimer, onOpenReminder }) {
  const meta = priorityMeta(task.priority)
  const Icon = meta.icon
  const streak = task.recurrence ? computeStreak(task, todayKey) : 0

  return (
    <SwipeableRow onSwipeLeft={() => onRemove(task)} onSwipeRight={() => onToggle(task)}>
      <div className="flex flex-col gap-1.5 rounded-xl bg-app-card px-3 py-2">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => onToggle(task)}
            className="h-4 w-4 shrink-0 accent-brand-cta"
          />
          <Icon size={14} color={meta.color} className="shrink-0" />
          <span className="shrink-0 text-sm text-slate-400 tabular-nums">{task.startTime}</span>
          <span
            className={`min-w-0 flex-1 truncate text-sm ${task.done ? 'line-through text-slate-500' : 'text-slate-100'}`}
          >
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2 pl-7">
          {task.recurrence && <Repeat size={13} className="shrink-0 text-slate-500" />}
          {streak > 1 && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs text-priority-medium">
              <Flame size={12} /> {streak}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {pushEnabled && !task.recurrence && (
              <button
                type="button"
                onClick={() => onOpenReminder(task)}
                className="text-slate-500 hover:text-priority-medium transition-colors"
              >
                <Bell size={16} />
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
              onClick={() => onEdit(task)}
              className="text-slate-500 hover:text-sky-400 transition-colors"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(task)}
              className="text-slate-500 hover:text-priority-high transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {task.notes && <p className="truncate pl-7 text-xs text-slate-500">{task.notes}</p>}
      </div>
    </SwipeableRow>
  )
}
