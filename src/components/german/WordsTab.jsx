import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import { buildSession, computeDayStreak, germanDisplay, intervalDays, isNewWord, parseImport, wordStats, MAX_NEW_PER_DAY } from '../../lib/german'
import WordSession from './WordSession'

const MODES = ['mixed', 'de-ru', 'ru-de']

export default function WordsTab() {
  const { t } = useTranslation()
  const german = useAppStore((s) => s.german)
  const setSettings = useAppStore((s) => s.setGermanSettings)
  const addWords = useAppStore((s) => s.addGermanWords)
  const loadSeed = useAppStore((s) => s.loadGermanSeedWords)
  const deleteWord = useAppStore((s) => s.deleteGermanWord)

  const [session, setSession] = useState(false)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [showList, setShowList] = useState(false)

  const today = toDateKey(new Date())
  const { words, settings } = german
  const stats = useMemo(() => wordStats(words, today), [words, today])
  const streak = useMemo(() => computeDayStreak(german.doneDates, today), [german.doneDates, today])
  const sessionSize = useMemo(
    () => buildSession(words, today, settings.newPerDay, german.newLog[today] || 0).length,
    [words, today, settings.newPerDay, german.newLog]
  )

  if (session) return <WordSession onExit={() => setSession(false)} />

  function handleImport() {
    const { words: parsed, skipped, invalid } = parseImport(importText, words)
    if (parsed.length) addWords(parsed)
    setImportResult({ added: parsed.length, skipped, invalid })
    if (parsed.length || (!skipped && !invalid.length)) setImportText('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">{sessionSize}</p>
            <p className="text-xs text-slate-500">
              {t('german.session_today', { due: stats.due, fresh: Math.max(0, sessionSize - stats.due) })}
            </p>
          </div>
          <button
            type="button"
            disabled={sessionSize === 0}
            onClick={() => setSession(true)}
            className="rounded-full bg-brand-cta px-5 py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            {t('german.start_session')}
          </button>
        </div>

        <div className="inline-flex gap-1 rounded-lg bg-app-bg p-1">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSettings({ wordMode: m })}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                settings.wordMode === m ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t(`german.wordmode_${m}`)}
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between text-xs text-slate-500">
          {t('german.new_per_day', { max: MAX_NEW_PER_DAY })}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_NEW_PER_DAY}
            value={settings.newPerDay}
            onChange={(e) => setSettings({ newPerDay: Math.min(MAX_NEW_PER_DAY, Math.max(1, Number(e.target.value) || 1)) })}
            className="w-16 rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
        </label>
      </div>

      {words.length === 0 && (
        <button
          type="button"
          onClick={loadSeed}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <Sparkles size={14} /> {t('german.load_seed')}
        </button>
      )}

      <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4">
        <p className="text-xs text-slate-500">{t('german.stats_title')}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-semibold tabular-nums text-slate-100">{stats.learned}</p>
            <p className="text-[11px] text-slate-500">{t('german.stat_learned')}</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-slate-100">{stats.total}</p>
            <p className="text-[11px] text-slate-500">{t('german.stat_total')}</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-slate-100">{streak}</p>
            <p className="text-[11px] text-slate-500">{t('german.streak')}</p>
          </div>
        </div>
        <div className="space-y-1">
          {['new', 'young', 'mid', 'mature'].map((k) => (
            <div key={k} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-24">{t(`german.bucket_${k}`)}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-bg">
                <div
                  className="h-full rounded-full bg-brand-cta transition-all duration-300"
                  style={{ width: `${stats.total ? (stats.buckets[k] / stats.total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums">{stats.buckets[k]}</span>
            </div>
          ))}
        </div>
        {stats.topMistakes.length > 0 && (
          <div className="space-y-1 border-t border-white/[0.06] pt-3">
            <p className="text-xs text-slate-500">{t('german.top_mistakes')}</p>
            {stats.topMistakes.map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm text-slate-300">
                <span>
                  {germanDisplay(w)} <span className="text-slate-500">— {w.ru}</span>
                </span>
                <span className="tabular-nums text-priority-high">×{w.wrong_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <p className="text-sm text-slate-300">{t('german.import_title')}</p>
        <p className="text-xs text-slate-500">{t('german.import_hint')}</p>
        <textarea
          rows={5}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={'der Tisch;стол;Der Tisch ist groß.\nbewerben;подавать заявку;Ich bewerbe mich.'}
          className="w-full rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <button
          type="button"
          disabled={!importText.trim()}
          onClick={handleImport}
          className="w-full rounded-md bg-brand-cta py-1.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {t('german.import_button')}
        </button>
        {importResult && (
          <p className="text-xs text-slate-400">
            {t('german.import_result', { added: importResult.added, skipped: importResult.skipped })}
            {importResult.invalid.length > 0 && ` ${t('german.import_invalid', { lines: importResult.invalid.join(', ') })}`}
          </p>
        )}
      </div>

      {words.length > 0 && (
        <div className="space-y-1">
          <button type="button" onClick={() => setShowList((v) => !v)} className="text-xs text-slate-500 transition-colors hover:text-slate-200">
            {showList ? t('german.hide_list') : t('german.show_list', { count: words.length })}
          </button>
          {showList &&
            words.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg bg-app-card px-3 py-1.5 text-sm text-slate-300">
                <span className="min-w-0 flex-1 truncate">
                  {germanDisplay(w)} <span className="text-slate-500">— {w.ru}</span>
                </span>
                <span className="mx-2 text-xs tabular-nums text-slate-500">
                  {isNewWord(w) ? t('german.new') : `${intervalDays(w)}${t('german.d')}`}
                </span>
                <button
                  type="button"
                  onClick={() => deleteWord(w.id)}
                  aria-label={t('german.delete')}
                  className="text-slate-600 transition-colors hover:text-priority-high"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
