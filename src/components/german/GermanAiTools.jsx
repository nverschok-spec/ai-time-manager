import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { fetchGrammarAnalysis, fetchUpgradeSentence } from '../../services/ai'

// Optional sentence-level AI helpers. Nothing else in the module depends on
// them: with no API key (or the daily cap hit) this card just shows a note.
export default function GermanAiTools() {
  const { t } = useTranslation()
  const addXp = useAppStore((s) => s.addGermanXp)
  const recordWeak = useAppStore((s) => s.recordGermanWeak)

  const [tool, setTool] = useState('upgrade') // upgrade | analysis
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | limit | error
  const [result, setResult] = useState(null)

  async function run(e) {
    e.preventDefault()
    if (!text.trim()) return
    setStatus('loading')
    setResult(null)
    try {
      if (tool === 'upgrade') {
        const res = await fetchUpgradeSentence(text.trim())
        if (typeof res?.upgraded !== 'string') throw new Error('bad shape')
        res.changes?.forEach((c) => recordWeak(c.topic))
        addXp(3, 'grammar')
        setResult({ tool, res })
      } else {
        const res = await fetchGrammarAnalysis(text.trim())
        if (!res?.satzklammer) throw new Error('bad shape')
        addXp(2, 'grammar')
        setResult({ tool, res })
      }
      setStatus('idle')
    } catch (err) {
      setStatus(err?.code === 'daily_limit' ? 'limit' : 'error')
    }
  }

  return (
    <form onSubmit={run} className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
      <p className="text-sm text-slate-300">{t('german.ai_tools_title')}</p>
      <div className="inline-flex gap-1 rounded-lg bg-app-bg p-1">
        {['upgrade', 'analysis'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTool(k)
              setResult(null)
            }}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              tool === k ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t(`german.ai_${k}`)}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t(tool === 'upgrade' ? 'german.ai_upgrade_ph' : 'german.ai_analysis_ph')}
        className="w-full rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta"
      />
      <button
        type="submit"
        disabled={status === 'loading' || !text.trim()}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-cta py-1.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
        {status === 'loading' ? t('german.ai_running') : t('german.ai_run')}
      </button>
      {status === 'limit' && <p className="text-xs text-priority-medium">{t('german.ai_limit')}</p>}
      {status === 'error' && <p className="text-xs text-priority-medium">{t('german.ai_unavailable')}</p>}

      {result?.tool === 'upgrade' && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-slate-500">{t('german.ai_result_b2')}</p>
          <p className="text-sm font-medium text-slate-100">{result.res.upgraded}</p>
          {result.res.changes?.length === 0 && <p className="text-xs text-slate-400">{t('german.ai_no_changes')}</p>}
          {result.res.changes?.map((c, i) => (
            <div key={i} className="space-y-0.5 text-sm">
              <p className="text-slate-400">
                <span className="line-through">{c.original}</span> → <span className="text-slate-100">{c.improved}</span>
              </p>
              <p className="text-xs text-slate-500">
                {t(`german.err_${c.topic}`)} · {c.explanationRu}
              </p>
            </div>
          ))}
        </div>
      )}

      {result?.tool === 'analysis' && (
        <div className="space-y-3 pt-1 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">{t('german.ai_satzklammer')}</p>
            <p className="text-slate-100">
              {result.res.satzklammer.finiteVerb}
              {result.res.satzklammer.secondPart ? ` … ${result.res.satzklammer.secondPart}` : ''}
            </p>
            <p className="text-xs text-slate-500">{result.res.satzklammer.explanationRu}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">{t('german.ai_verbs_prep')}</p>
            {result.res.verbsWithPrepositions.length === 0 && <p className="text-xs text-slate-600">{t('german.ai_nothing')}</p>}
            {result.res.verbsWithPrepositions.map((v, i) => (
              <p key={i} className="text-slate-200">
                {v.verb} {v.preposition} + {v.caseRequired} <span className="text-xs text-slate-500">· {v.noteRu}</span>
              </p>
            ))}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">{t('german.ai_cases')}</p>
            {result.res.cases.length === 0 && <p className="text-xs text-slate-600">{t('german.ai_nothing')}</p>}
            {result.res.cases.map((c, i) => (
              <p key={i} className="text-slate-200">
                {c.phrase} — {c.case} <span className="text-xs text-slate-500">· {c.reasonRu}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
