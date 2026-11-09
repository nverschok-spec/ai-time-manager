import { useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import { buildSession, checkAnswer, germanDisplay, pickDirection, LEITNER_INTERVALS } from '../../lib/german'

// One day's session: due words first, then new ones (capped). A missed word
// shows the right answer + example, and comes back once more at the end of
// the queue (that retry doesn't move the Leitner box again).
export default function WordSession({ onExit }) {
  const { t } = useTranslation()
  const words = useAppStore((s) => s.german.words)
  const settings = useAppStore((s) => s.german.settings)
  const newLog = useAppStore((s) => s.german.newLog)
  const answerWord = useAppStore((s) => s.answerGermanWord)
  const checkPlanItem = useAppStore((s) => s.checkGermanPlanItem)

  const today = toDateKey(new Date())
  // Snapshot at mount: answering mutates the words, the queue must not.
  const initial = useMemo(
    () => buildSession(words, today, settings.newPerDay, newLog[today] || 0).map((w) => w.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [queue, setQueue] = useState(() => initial.map((id, i) => ({ id, retry: false, dir: pickDirection(settings.wordMode, i) })))
  const [pos, setPos] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // { correct, missingArticle }
  const [stats, setStats] = useState({ right: 0, wrong: 0 })
  const inputRef = useRef(null)

  const current = queue[pos]
  const word = current ? words.find((w) => w.id === current.id) : null
  const finished = pos >= queue.length

  useEffect(() => {
    if (!feedback) inputRef.current?.focus()
  }, [pos, feedback])

  useEffect(() => {
    if (finished && queue.length > 0) checkPlanItem(today, 'words')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (queue.length === 0) {
    return (
      <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4 text-center text-sm text-slate-300">
        <p>{t('german.session_empty')}</p>
        <button type="button" onClick={onExit} className="w-full rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 transition-colors hover:bg-white/10">
          {t('german.back')}
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4 text-center">
        <p className="text-3xl font-semibold tabular-nums text-slate-100">
          {stats.right}/{stats.right + stats.wrong}
        </p>
        <p className="text-sm text-slate-400">{t('german.session_done')}</p>
        <button type="button" onClick={onExit} className="w-full rounded-full bg-brand-cta py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110">
          {t('german.back')}
        </button>
      </div>
    )
  }

  if (!word) {
    // word was deleted mid-session — skip it
    setTimeout(() => setPos((p) => p + 1), 0)
    return null
  }

  const prompt = current.dir === 'de-ru' ? germanDisplay(word) : word.ru
  const expected = current.dir === 'de-ru' ? word.ru : germanDisplay(word)

  function submit(e) {
    e.preventDefault()
    if (feedback) return next()
    const result = checkAnswer(word, current.dir, input)
    setFeedback(result)
    if (!current.retry) answerWord(word.id, result.correct)
    setStats((s) => ({ right: s.right + (result.correct ? 1 : 0), wrong: s.wrong + (result.correct ? 0 : 1) }))
    if (!result.correct && !current.retry) {
      setQueue((q) => [...q, { id: word.id, retry: true, dir: current.dir }])
    }
  }

  function next() {
    setFeedback(null)
    setInput('')
    setPos((p) => p + 1)
  }

  const nextBox = feedback && !current.retry ? words.find((w) => w.id === word.id)?.box : null

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <button type="button" onClick={onExit} className="hover:text-slate-100">
          ← {t('german.back')}
        </button>
        <span className="tabular-nums">
          {Math.min(pos + 1, queue.length)}/{queue.length}
        </span>
      </div>

      <div className="space-y-2 rounded-3xl border border-white/[0.06] bg-app-card p-5 text-center">
        <p className="text-xs text-slate-500">
          {current.dir === 'de-ru' ? t('german.dir_de_ru') : t('german.dir_ru_de')}
          {current.retry ? ` · ${t('german.retry')}` : ''}
        </p>
        <p className="text-2xl font-semibold text-slate-100">{prompt}</p>
        {current.dir === 'ru-de' && word.article && !feedback && (
          <p className="text-xs text-slate-500">{t('german.article_required')}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        readOnly={!!feedback}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('german.answer_placeholder')}
        className="w-full rounded-xl bg-app-card px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta"
      />

      {feedback && (
        <div className="space-y-1 rounded-2xl bg-app-card p-3 text-sm">
          <p className={feedback.correct ? 'text-brand-cta' : 'text-priority-high'}>
            {feedback.correct
              ? t('german.correct')
              : feedback.missingArticle
                ? t('german.missing_article')
                : t('german.wrong')}
          </p>
          <p className="text-slate-100">
            {expected}
            {word.plural && current.dir === 'ru-de' ? <span className="text-slate-500"> · pl. {word.plural}</span> : null}
          </p>
          {word.example_de && <p className="italic text-slate-400">{word.example_de}</p>}
          {nextBox != null && (
            <p className="text-xs text-slate-500">
              {t('german.box_info', { box: nextBox, days: LEITNER_INTERVALS[nextBox - 1] })}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-brand-cta py-2.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 active:scale-[0.98]"
      >
        {feedback ? t('german.next') : t('german.check')}
      </button>
    </form>
  )
}
