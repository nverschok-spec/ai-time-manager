import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { GRAMMAR_STATUSES } from '../../lib/german'
import GermanAiTools from './GermanAiTools'

const STATUS_COLOR = {
  todo: 'text-slate-400',
  doing: 'text-priority-medium',
  review: 'text-priority-high',
  known: 'text-brand-cta'
}

export default function GrammarTab() {
  const { t } = useTranslation()
  const grammar = useAppStore((s) => s.german.grammar)
  const updateTopic = useAppStore((s) => s.updateGermanTopic)
  const addTopic = useAppStore((s) => s.addGermanTopic)
  const deleteTopic = useAppStore((s) => s.deleteGermanTopic)
  const [openId, setOpenId] = useState(null)
  const [newTitle, setNewTitle] = useState('')

  const known = grammar.filter((g) => g.status === 'known').length

  function handleAdd(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    addTopic(newTitle)
    setNewTitle('')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{t('german.grammar_progress', { known, total: grammar.length })}</p>

      {grammar.map((topic) => {
        const open = openId === topic.id
        return (
          <div key={topic.id} className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : topic.id)}
                className="flex-1 text-left text-sm text-slate-100"
              >
                {topic.title}
                {topic.notes && !open && <span className="ml-1 text-xs text-slate-500">· {t('german.has_notes')}</span>}
              </button>
              <select
                value={topic.status}
                onChange={(e) => updateTopic(topic.id, { status: e.target.value })}
                aria-label={t('german.grammar_status')}
                className={`rounded-md bg-app-bg px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-cta ${STATUS_COLOR[topic.status]}`}
              >
                {GRAMMAR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`german.status_${s}`)}
                  </option>
                ))}
              </select>
            </div>
            {open && (
              <>
                <textarea
                  rows={4}
                  value={topic.notes}
                  onChange={(e) => updateTopic(topic.id, { notes: e.target.value })}
                  placeholder={t('german.notes_placeholder')}
                  className="w-full rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta"
                />
                <button
                  type="button"
                  onClick={() => deleteTopic(topic.id)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-priority-high"
                >
                  <Trash2 size={12} /> {t('german.delete')}
                </button>
              </>
            )}
          </div>
        )
      })}

      <GermanAiTools />

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t('german.add_topic')}
          className="min-w-0 flex-1 rounded-md bg-app-card px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="rounded-md bg-app-cardMuted px-3 text-sm text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          +
        </button>
      </form>
    </div>
  )
}
