import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Users } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { toDateKey } from '../lib/date'
import SwipeableRow from './SwipeableRow'
import UndoSnackbar from './UndoSnackbar'

export default function FamilyEventsList() {
  const { t } = useTranslation()
  const person = useAppStore((s) => s.person)
  const events = useAppStore((s) => s.familyEvents)
  const addFamilyEvent = useAppStore((s) => s.addFamilyEvent)
  const removeFamilyEvent = useAppStore((s) => s.removeFamilyEvent)
  const restoreFamilyEvent = useAppStore((s) => s.restoreFamilyEvent)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toDateKey(new Date()))
  const [pendingDelete, setPendingDelete] = useState(null)

  const sorted = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events])

  function handleAdd(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    addFamilyEvent({ title: trimmed, date, createdByName: person?.name })
    setTitle('')
  }

  function handleRemove(event) {
    removeFamilyEvent(event.id)
    setPendingDelete(event)
  }

  function handleUndoRemove() {
    if (pendingDelete) restoreFamilyEvent(pendingDelete)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('family.placeholder')}
          className="min-w-0 flex-1 rounded-full bg-app-card px-4 py-2 text-sm text-slate-100 placeholder:text-muted outline-none focus:ring-2 focus:ring-brand-cta"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[130px] shrink-0 rounded-full bg-app-card px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-brand-cta"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand-cta p-2.5 text-app-bg hover:brightness-110 transition-all"
        >
          <Plus size={18} />
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('family.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((event) => (
            <li key={event.id}>
              <SwipeableRow onSwipeLeft={() => handleRemove(event)}>
                <div className="flex items-center gap-3 rounded-xl bg-app-card px-3 py-2">
                  <Users size={15} className="shrink-0 text-brand-cta" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-100">{event.title}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {event.date}
                      {event.createdByName && ` · ${event.createdByName}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(event)}
                    className="shrink-0 text-slate-500 hover:text-priority-high transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </SwipeableRow>
            </li>
          ))}
        </ul>
      )}

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
