import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import { ERROR_CATEGORIES } from '../../lib/german'

const fieldCls =
  'w-full rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta'

// No API: the "check" is a ready-made prompt copied to the clipboard for
// Claude; the correction is pasted back by hand.
export function buildCheckPrompt(text) {
  return `Проверь мой текст на немецком, исправь ошибки, объясни каждую по-русски: ${text}`
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

const emptyDraft = () => ({ id: null, date: toDateKey(new Date()), topic: '', text: '', corrected: '', errors: {} })

export default function WritingTab() {
  const { t, i18n } = useTranslation()
  const writings = useAppStore((s) => s.german.writings)
  const save = useAppStore((s) => s.saveGermanWriting)
  const remove = useAppStore((s) => s.deleteGermanWriting)
  const checkPlanItem = useAppStore((s) => s.checkGermanPlanItem)

  const [draft, setDraft] = useState(emptyDraft)
  const [copied, setCopied] = useState(null) // null | true | false

  const totals = useMemo(() => {
    const sum = {}
    for (const w of writings) for (const [k, n] of Object.entries(w.errors || {})) sum[k] = (sum[k] || 0) + n
    return Object.entries(sum).sort((a, b) => b[1] - a[1])
  }, [writings])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  async function handleCopy() {
    setCopied(await copyToClipboard(buildCheckPrompt(draft.text.trim())))
    setTimeout(() => setCopied(null), 2500)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!draft.text.trim()) return
    const errors = Object.fromEntries(Object.entries(draft.errors).filter(([, n]) => n > 0))
    save({ ...draft, id: draft.id || `wr-${Date.now().toString(36)}`, errors })
    checkPlanItem(toDateKey(new Date()), 'writing')
    setDraft(emptyDraft())
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <p className="text-sm text-slate-300">{draft.id ? t('german.writing_edit') : t('german.writing_new')}</p>
        <div className="flex gap-2">
          <input type="date" value={draft.date} onChange={(e) => e.target.value && set({ date: e.target.value })} className="rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta" />
          <input type="text" value={draft.topic} onChange={(e) => set({ topic: e.target.value })} placeholder={t('german.writing_topic')} className={fieldCls} />
        </div>
        <textarea rows={6} value={draft.text} onChange={(e) => set({ text: e.target.value })} placeholder={t('german.writing_text')} className={fieldCls} />

        <button
          type="button"
          disabled={!draft.text.trim()}
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-app-cardMuted py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <Copy size={14} /> {copied === true ? t('german.copied') : copied === false ? t('german.copy_failed') : t('german.copy_for_claude')}
        </button>

        <textarea rows={6} value={draft.corrected} onChange={(e) => set({ corrected: e.target.value })} placeholder={t('german.writing_corrected')} className={fieldCls} />

        <p className="pt-1 text-xs text-slate-500">{t('german.writing_errors')}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {ERROR_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center justify-between text-xs text-slate-400">
              {t(`german.err_${cat}`)}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.errors[cat] || ''}
                onChange={(e) => set({ errors: { ...draft.errors, [cat]: Math.max(0, Number(e.target.value) || 0) } })}
                className="w-12 rounded-md bg-app-bg px-1.5 py-0.5 text-right text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
              />
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={!draft.text.trim()} className="flex-1 rounded-md bg-brand-cta py-1.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 disabled:opacity-50">
            {t('german.save')}
          </button>
          {draft.id && (
            <button type="button" onClick={() => setDraft(emptyDraft())} className="rounded-md bg-app-cardMuted px-3 text-sm text-slate-300 transition-colors hover:bg-white/10">
              {t('german.cancel')}
            </button>
          )}
        </div>
      </form>

      {totals.length > 0 && (
        <div className="space-y-1 rounded-2xl border border-white/[0.06] bg-app-card p-3">
          <p className="text-xs text-slate-500">{t('german.errors_total')}</p>
          {totals.map(([cat, n]) => (
            <div key={cat} className="flex justify-between text-sm text-slate-300">
              <span>{t(`german.err_${cat}`)}</span>
              <span className="tabular-nums text-slate-400">{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {writings.length === 0 && <p className="text-sm italic text-slate-600">{t('german.writing_empty')}</p>}
        {writings.map((w) => (
          <div key={w.id} className="space-y-1 rounded-2xl border border-white/[0.06] bg-app-card p-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {new Date(`${w.date}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'short' })}
                {w.topic ? ` · ${w.topic}` : ''}
              </span>
              <span className="flex gap-3">
                <button type="button" onClick={() => setDraft({ ...emptyDraft(), ...w })} className="transition-colors hover:text-slate-200">
                  {t('german.edit')}
                </button>
                <button type="button" onClick={() => remove(w.id)} aria-label={t('german.delete')} className="transition-colors hover:text-priority-high">
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
            <p className="line-clamp-3 whitespace-pre-line text-sm text-slate-300">{w.corrected || w.text}</p>
            {Object.keys(w.errors || {}).length > 0 && (
              <p className="text-xs text-slate-500">
                {Object.entries(w.errors)
                  .map(([k, n]) => `${t(`german.err_${k}`)} ×${n}`)
                  .join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
