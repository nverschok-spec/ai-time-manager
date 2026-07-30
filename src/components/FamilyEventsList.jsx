import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2, User, Users, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { toDateKey } from '../lib/date'
import SwipeableRow from './SwipeableRow'
import UndoSnackbar from './UndoSnackbar'

function EventChecklist({ event }) {
  const { t } = useTranslation()
  const addFamilyEventChecklistItem = useAppStore((s) => s.addFamilyEventChecklistItem)
  const toggleFamilyEventChecklistItem = useAppStore((s) => s.toggleFamilyEventChecklistItem)
  const removeFamilyEventChecklistItem = useAppStore((s) => s.removeFamilyEventChecklistItem)
  const [text, setText] = useState('')
  const checklist = event.checklist || []

  function handleAdd(e) {
    e.preventDefault()
    addFamilyEventChecklistItem(event.id, text)
    setText('')
  }

  return (
    <div className="space-y-1.5 pl-6">
      {checklist.length > 0 && (
        <ul className="space-y-1">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleFamilyEventChecklistItem(event.id, item.id)}
                className="h-3.5 w-3.5 shrink-0 accent-brand-cta"
              />
              <span className={`flex-1 text-xs ${item.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => removeFamilyEventChecklistItem(event.id, item.id)}
                className="shrink-0 text-slate-600 hover:text-priority-high transition-colors"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('calendar.checklist_placeholder')}
          className="min-w-0 flex-1 rounded-md bg-app-bg px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta"
        />
      </form>
    </div>
  )
}

export default function FamilyEventsList() {
  const { t } = useTranslation()
  const person = useAppStore((s) => s.person)
  const people = useAppStore((s) => s.people)
  const events = useAppStore((s) => s.familyEvents)
  const addFamilyEvent = useAppStore((s) => s.addFamilyEvent)
  const removeFamilyEvent = useAppStore((s) => s.removeFamilyEvent)
  const restoreFamilyEvent = useAppStore((s) => s.restoreFamilyEvent)
  const toggleFamilyEventClaim = useAppStore((s) => s.toggleFamilyEventClaim)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toDateKey(new Date()))
  const [pendingDelete, setPendingDelete] = useState(null)
  const [openChecklist, setOpenChecklist] = useState(null)

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
          {sorted.map((event) => {
            const claimant = event.claimedBy ? people.find((p) => p.id === event.claimedBy) : null
            const checklist = event.checklist || []
            const checklistOpen = openChecklist === event.id
            return (
              <li key={event.id}>
                <SwipeableRow onSwipeLeft={() => handleRemove(event)}>
                  <div className="space-y-1.5 rounded-xl bg-app-card px-3 py-2">
                    <div className="flex items-center gap-3">
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
                        onClick={() => toggleFamilyEventClaim(event.id)}
                        title={claimant ? claimant.name : t('family.claim')}
                        className="shrink-0"
                      >
                        {claimant ? (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-app-bg"
                            style={{ backgroundColor: claimant.color }}
                          >
                            {claimant.name.slice(0, 1).toUpperCase()}
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-400">
                            <User size={11} />
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(event)}
                        className="shrink-0 text-slate-500 hover:text-priority-high transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenChecklist(checklistOpen ? null : event.id)}
                      className="flex items-center gap-1 pl-7 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <ListChecks size={12} />
                      {checklist.length > 0 && `${checklist.filter((i) => i.done).length}/${checklist.length}`}
                      {checklistOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {checklistOpen && <EventChecklist event={event} />}
                  </div>
                </SwipeableRow>
              </li>
            )
          })}
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
