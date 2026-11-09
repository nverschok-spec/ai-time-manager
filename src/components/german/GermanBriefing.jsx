import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { fetchGermanBriefing } from '../../services/ai'
import { toDateKey } from '../../lib/date'
import { makeWord } from '../../lib/german'

// AI daily briefing — strictly opt-in (a button, never auto-fetched) and
// cached for the local day, so it costs at most one request per day.
export default function GermanBriefing() {
  const { t } = useTranslation()
  const briefing = useAppStore((s) => s.german.briefing)
  const words = useAppStore((s) => s.german.words)
  const setBriefing = useAppStore((s) => s.setGermanBriefing)
  const addWords = useAppStore((s) => s.addGermanWords)
  const addXp = useAppStore((s) => s.addGermanXp)

  const today = toDateKey(new Date())
  const data = briefing?.date === today ? briefing.data : null
  const [status, setStatus] = useState('idle') // idle | loading | limit | error
  const [picked, setPicked] = useState({}) // quiz index -> chosen option
  const [added, setAdded] = useState(false)

  async function load() {
    setStatus('loading')
    try {
      const avoid = words.slice(-40).map((w) => w.de)
      const res = await fetchGermanBriefing(today, avoid)
      // The API schema can't enforce "exactly 4 options" — drop malformed quiz items here.
      const quiz = (res?.quiz || []).filter((q) => q.options?.length === 4 && q.correct >= 0 && q.correct <= 3)
      if (!res?.wordOfDay || !res?.nvVerbindung) throw new Error('bad shape')
      setBriefing({ ...res, quiz })
      setPicked({})
      setAdded(false)
      setStatus('idle')
    } catch (err) {
      setStatus(err?.code === 'daily_limit' ? 'limit' : 'error')
    }
  }

  function pick(qi, oi, q) {
    if (picked[qi] != null) return
    setPicked((p) => ({ ...p, [qi]: oi }))
    if (oi === q.correct) addXp(2, 'grammar')
  }

  function addWord() {
    const w = data.wordOfDay
    addWords([makeWord({ de: w.article ? `${w.article} ${w.word}` : w.word, ru: w.meaningRu, example_de: w.example, plural: w.plural || '', tags: ['briefing'] })])
    setAdded(true)
  }

  return (
    <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4">
      <p className="text-xs text-slate-500">{t('german.brief_title')}</p>

      {!data && (
        <>
          <button
            type="button"
            disabled={status === 'loading'}
            onClick={load}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {status === 'loading' ? t('german.brief_loading') : t('german.brief_load')}
          </button>
          <p className="text-xs text-slate-600">{t('german.brief_hint')}</p>
          {status === 'limit' && <p className="text-xs text-priority-medium">{t('german.ai_limit')}</p>}
          {status === 'error' && <p className="text-xs text-priority-medium">{t('german.ai_unavailable')}</p>}
        </>
      )}

      {data && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">{t('german.brief_word')}</p>
            <p className="text-lg font-semibold text-slate-100">
              {data.wordOfDay.article ? `${data.wordOfDay.article} ` : ''}
              {data.wordOfDay.word}
              {data.wordOfDay.plural && <span className="text-sm font-normal text-slate-500"> · pl. {data.wordOfDay.plural}</span>}
            </p>
            <p className="text-sm text-slate-300">{data.wordOfDay.meaningRu}</p>
            <p className="text-sm italic text-slate-400">{data.wordOfDay.example}</p>
            <button
              type="button"
              disabled={added}
              onClick={addWord}
              className="rounded-full bg-app-cardMuted px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {added ? t('german.brief_added') : t('german.brief_add')}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-500">{t('german.brief_nv')}</p>
            <p className="text-sm font-medium text-slate-100">{data.nvVerbindung.phrase}</p>
            <p className="text-sm text-slate-300">{data.nvVerbindung.meaningRu}</p>
            <p className="text-sm italic text-slate-400">{data.nvVerbindung.example}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-500">{t('german.brief_quiz')}</p>
            {data.quiz.map((q, qi) => (
              <div key={qi} className="space-y-1.5">
                <p className="text-sm text-slate-200">{q.question}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((o, oi) => {
                    const chosen = picked[qi]
                    const state =
                      chosen == null ? '' : oi === q.correct ? 'bg-brand-cta text-brand-ctaForeground' : oi === chosen ? 'bg-priority-high/30 text-slate-100' : 'opacity-50'
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => pick(qi, oi, q)}
                        className={`rounded-lg bg-app-cardMuted px-2 py-1.5 text-left text-sm text-slate-200 transition-colors ${state}`}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
                {picked[qi] != null && <p className="text-xs text-slate-400">{q.explanationRu}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
