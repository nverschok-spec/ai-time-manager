import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Users, Wand2, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { priorityMeta } from '../lib/priority'
import { findFreeSlotOnDate } from '../lib/freeSlot'

export default function AiSuggestionCard() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const suggestions = useAppStore((s) => s.suggestions)
  const updateSuggestion = useAppStore((s) => s.updateSuggestion)
  const acceptSuggestion = useAppStore((s) => s.acceptSuggestion)
  const acceptSuggestionAsShared = useAppStore((s) => s.acceptSuggestionAsShared)
  const dismissSuggestion = useAppStore((s) => s.dismissSuggestion)
  const [editingIndex, setEditingIndex] = useState(null)

  if (suggestions.length === 0) return null

  function handleResolveConflict(index) {
    const s = suggestions[index]
    const freeTime = findFreeSlotOnDate(tasks, s.date, s.duration_minutes)
    if (freeTime) updateSuggestion(index, { start_time: freeTime, conflict: false })
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-400">{t('suggestion.title')}</h2>
      {suggestions.map((s, index) => {
        const isEditing = editingIndex === index
        return (
          <div key={`${s.title}-${index}`} className="rounded-2xl border border-white/5 bg-app-card p-3 space-y-2 animate-page-in">
            {s.is_shared_candidate && s.ai_tip && (
              <p className="flex items-center gap-1.5 text-xs text-brand-cta">
                <Users size={12} className="shrink-0" />
                {s.ai_tip}
              </p>
            )}

            {(s.conflict || s.lowConfidence) && (
              <div className="flex gap-2">
                {s.conflict && (
                  <span className="flex items-center gap-1 text-xs rounded-full bg-priority-high/20 text-priority-high px-2 py-0.5">
                    {t('suggestion.conflict')}
                    <button
                      type="button"
                      onClick={() => handleResolveConflict(index)}
                      className="flex items-center gap-0.5 rounded-full bg-priority-high/20 pl-1 hover:text-priority-high/70"
                      title={t('suggestion.find_free_slot')}
                    >
                      <Wand2 size={11} />
                    </button>
                  </span>
                )}
                {s.lowConfidence && (
                  <span className="text-xs rounded-full bg-priority-medium/20 text-priority-medium px-2 py-0.5">
                    {t('suggestion.low_confidence')}
                  </span>
                )}
              </div>
            )}

            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={s.title}
                  onChange={(e) => updateSuggestion(index, { title: e.target.value })}
                  className="col-span-2 w-full min-w-0 rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
                />
                <input
                  type="date"
                  value={s.date}
                  onChange={(e) => updateSuggestion(index, { date: e.target.value })}
                  className="w-full min-w-0 rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
                />
                <input
                  type="time"
                  value={s.start_time}
                  onChange={(e) => updateSuggestion(index, { start_time: e.target.value })}
                  className="w-full min-w-0 rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
                />
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-100">
                  {s.emoji && <span className="mr-1">{s.emoji}</span>}
                  {s.title}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400 tabular-nums">
                  {(() => {
                    const meta = priorityMeta(s.priority)
                    const Icon = meta.icon
                    return <Icon size={12} color={meta.color} />
                  })()}
                  {s.date} · {s.start_time} · {s.duration_minutes} min
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => acceptSuggestion(index)}
                className="flex items-center gap-1 rounded-md bg-brand-cta px-2.5 py-1 text-xs font-medium text-app-bg hover:brightness-110 transition-colors"
              >
                <Check size={14} /> {t('suggestion.accept')}
              </button>
              {s.is_shared_candidate && (
                <button
                  type="button"
                  onClick={() => acceptSuggestionAsShared(index)}
                  className="flex items-center gap-1 rounded-md bg-app-cardMuted px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <Users size={14} /> {t('suggestion.make_shared')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingIndex(isEditing ? null : index)}
                className="flex items-center gap-1 rounded-md bg-app-cardMuted px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
              >
                <Pencil size={14} /> {t('suggestion.edit')}
              </button>
              <button
                type="button"
                onClick={() => dismissSuggestion(index)}
                className="flex items-center gap-1 rounded-md bg-app-card px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-priority-high transition-colors"
              >
                <X size={14} /> {t('suggestion.dismiss')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
