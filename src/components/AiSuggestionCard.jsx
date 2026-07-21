import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { priorityMeta } from '../lib/priority'

export default function AiSuggestionCard() {
  const { t } = useTranslation()
  const suggestions = useAppStore((s) => s.suggestions)
  const updateSuggestion = useAppStore((s) => s.updateSuggestion)
  const acceptSuggestion = useAppStore((s) => s.acceptSuggestion)
  const dismissSuggestion = useAppStore((s) => s.dismissSuggestion)
  const [editingIndex, setEditingIndex] = useState(null)

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-400">{t('suggestion.title')}</h2>
      {suggestions.map((s, index) => {
        const isEditing = editingIndex === index
        return (
          <div key={`${s.title}-${index}`} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2">
            {(s.conflict || s.lowConfidence) && (
              <div className="flex gap-2">
                {s.conflict && (
                  <span className="text-xs rounded-full bg-rose-500/20 text-rose-300 px-2 py-0.5">
                    {t('suggestion.conflict')}
                  </span>
                )}
                {s.lowConfidence && (
                  <span className="text-xs rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5">
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
                  className="col-span-2 rounded-md bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <input
                  type="date"
                  value={s.date}
                  onChange={(e) => updateSuggestion(index, { date: e.target.value })}
                  className="rounded-md bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <input
                  type="time"
                  value={s.start_time}
                  onChange={(e) => updateSuggestion(index, { start_time: e.target.value })}
                  className="rounded-md bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-100">{s.title}</p>
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
                className="flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                <Check size={14} /> {t('suggestion.accept')}
              </button>
              <button
                type="button"
                onClick={() => setEditingIndex(isEditing ? null : index)}
                className="flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors"
              >
                <Pencil size={14} /> {t('suggestion.edit')}
              </button>
              <button
                type="button"
                onClick={() => dismissSuggestion(index)}
                className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors"
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
