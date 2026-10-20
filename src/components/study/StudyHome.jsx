import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Database, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { generateTestQuestions } from '../../services/ai'
import { validateQuestions } from '../../lib/testBank'
import { toDateKey } from '../../lib/date'
import deB1Grammar from '../../data/tests/de-b1-grammar.json'
import TestMode from './TestMode'
import TrainMode from './TrainMode'
import MistakesMode from './MistakesMode'
import StudyStats from './StudyStats'
import StudyRules from './StudyRules'
import StudyDataTools from './StudyDataTools'

const SEED_BANK_SLUG = 'de-b1-grammar'

function slugify(topic) {
  return topic.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').slice(0, 40) || `topic-${Date.now()}`
}

// Topic picker + mode launcher + the "generate a bank via Claude" form —
// the 3 actual modes (Test/Training/Mistakes) and the stats view take over
// the whole screen while active (see the early returns below).
export default function StudyHome() {
  const { t } = useTranslation()
  const study = useAppStore((s) => s.study)
  const saveStudyBank = useAppStore((s) => s.saveStudyBank)
  const deleteStudyBank = useAppStore((s) => s.deleteStudyBank)
  const setActiveTopicSlug = useAppStore((s) => s.setActiveTopicSlug)
  const setStudySettings = useAppStore((s) => s.setStudySettings)

  const [topicInput, setTopicInput] = useState('')
  const [blocksInput, setBlocksInput] = useState('')
  const [countInput, setCountInput] = useState(15)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(false)
  const [mode, setMode] = useState(null) // null | 'test' | 'train' | 'mistakes' | 'stats' | 'rules'

  const topicSlugs = Object.keys(study.banks)
  const hasSeedBank = !!study.banks[SEED_BANK_SLUG]
  const activeSlug =
    study.activeTopicSlug && study.banks[study.activeTopicSlug] ? study.activeTopicSlug : topicSlugs[0] || null
  const activeBank = activeSlug ? study.banks[activeSlug] : null

  const todayKey = toDateKey(new Date())
  const questionsToday = useMemo(
    () => study.answerLog.filter((a) => a.dateKey === todayKey).length,
    [study.answerLog, todayKey]
  )
  const goalRatio = Math.min(1, questionsToday / (study.settings.dailyGoalQuestions || 15))

  function handleLoadSeedBank() {
    const questions = validateQuestions(deB1Grammar.questions)
    saveStudyBank(SEED_BANK_SLUG, { topic: deB1Grammar.topic, blocks: deB1Grammar.blocks, questions })
    setActiveTopicSlug(SEED_BANK_SLUG)
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!topicInput.trim()) return
    setGenerating(true)
    setGenError(false)
    try {
      const blocks = blocksInput
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)
      const raw = await generateTestQuestions(topicInput.trim(), blocks, Number(countInput) || 15)
      const questions = validateQuestions(raw)
      if (questions.length === 0) {
        setGenError(true)
        return
      }
      const slug = slugify(topicInput)
      saveStudyBank(slug, {
        topic: topicInput.trim(),
        blocks: blocks.length ? blocks : [...new Set(questions.map((q) => q.block))],
        questions
      })
      setActiveTopicSlug(slug)
      setTopicInput('')
      setBlocksInput('')
    } catch {
      setGenError(true)
    } finally {
      setGenerating(false)
    }
  }

  if (mode === 'test' && activeBank) {
    return <TestMode bank={activeBank} topicSlug={activeSlug} settings={study.settings} onExit={() => setMode(null)} />
  }
  if (mode === 'train' && activeBank) {
    return <TrainMode bank={activeBank} topicSlug={activeSlug} onExit={() => setMode(null)} />
  }
  if (mode === 'mistakes' && activeBank) {
    return <MistakesMode bank={activeBank} topicSlug={activeSlug} onExit={() => setMode(null)} />
  }
  if (mode === 'stats' && activeBank) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-100">
          ← {t('study.back_to_study')}
        </button>
        <StudyStats topicSlug={activeSlug} />
      </div>
    )
  }
  if (mode === 'rules') {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-100">
          ← {t('study.back_to_study')}
        </button>
        <StudyRules />
      </div>
    )
  }
  if (mode === 'data') {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-100">
          ← {t('study.back_to_study')}
        </button>
        <StudyDataTools />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('rules')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <BookOpen size={14} /> {t('study.rules_button')}
        </button>
        <button
          type="button"
          onClick={() => setMode('data')}
          className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
          aria-label={t('study.data_button')}
          title={t('study.data_button')}
        >
          <Database size={14} />
        </button>
      </div>

      {!hasSeedBank && (
        <button
          type="button"
          onClick={handleLoadSeedBank}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-cta py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110"
        >
          <Sparkles size={14} /> {t('study.load_seed_button')}
        </button>
      )}

      <div className="space-y-2 rounded-3xl border border-white/[0.06] bg-app-card p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{t('study.daily_goal')}</span>
          <span className="tabular-nums">
            {questionsToday}/{study.settings.dailyGoalQuestions}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
          <div
            className="h-full rounded-full bg-brand-cta transition-all duration-300"
            style={{ width: `${goalRatio * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <label className="space-y-1 text-[11px] text-slate-500">
          {t('study.setting_daily_goal')}
          <input
            type="number"
            inputMode="numeric"
            value={study.settings.dailyGoalQuestions}
            onChange={(e) => setStudySettings({ dailyGoalQuestions: Number(e.target.value) || 1 })}
            className="w-full rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
        </label>
        <label className="space-y-1 text-[11px] text-slate-500">
          {t('study.setting_test_count')}
          <input
            type="number"
            inputMode="numeric"
            value={study.settings.testQuestionCount}
            onChange={(e) => setStudySettings({ testQuestionCount: Number(e.target.value) || 1 })}
            className="w-full rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
        </label>
        <label className="space-y-1 text-[11px] text-slate-500">
          {t('study.setting_test_minutes')}
          <input
            type="number"
            inputMode="numeric"
            value={study.settings.testDurationMinutes}
            onChange={(e) => setStudySettings({ testDurationMinutes: Number(e.target.value) || 1 })}
            className="w-full rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
        </label>
      </div>

      {topicSlugs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{t('study.topic')}</p>
          <div className="flex flex-wrap gap-1.5">
            {topicSlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setActiveTopicSlug(slug)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  slug === activeSlug
                    ? 'bg-brand-cta text-brand-ctaForeground'
                    : 'bg-app-cardMuted text-slate-300 hover:bg-white/10'
                }`}
              >
                {study.banks[slug].topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeBank && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('test')}
              className="rounded-xl bg-app-card px-3 py-3 text-sm text-slate-200 transition-colors hover:bg-app-cardMuted"
            >
              {t('study.mode_test')}
            </button>
            <button
              type="button"
              onClick={() => setMode('train')}
              className="rounded-xl bg-app-card px-3 py-3 text-sm text-slate-200 transition-colors hover:bg-app-cardMuted"
            >
              {t('study.mode_train')}
            </button>
            <button
              type="button"
              onClick={() => setMode('mistakes')}
              className="rounded-xl bg-app-card px-3 py-3 text-sm text-slate-200 transition-colors hover:bg-app-cardMuted"
            >
              {t('study.mode_mistakes')}
            </button>
            <button
              type="button"
              onClick={() => setMode('stats')}
              className="rounded-xl bg-app-card px-3 py-3 text-sm text-slate-200 transition-colors hover:bg-app-cardMuted"
            >
              {t('study.mode_stats')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => deleteStudyBank(activeSlug)}
            className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-priority-high"
          >
            <Trash2 size={12} /> {t('study.delete_bank')}
          </button>
        </>
      )}

      <form onSubmit={handleGenerate} className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <p className="text-sm text-slate-300">{t('study.generate_title')}</p>
        <input
          type="text"
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          placeholder={t('study.topic_placeholder')}
          className="w-full rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <input
          type="text"
          value={blocksInput}
          onChange={(e) => setBlocksInput(e.target.value)}
          placeholder={t('study.blocks_placeholder')}
          className="w-full rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            className="w-20 rounded-md bg-app-bg px-2 py-1.5 text-base text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
          />
          <button
            type="submit"
            disabled={generating || !topicInput.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-cta py-1.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {t('study.generate_button')}
          </button>
        </div>
        {genError && <p className="text-xs text-priority-high">{t('study.generate_error')}</p>}
      </form>
    </div>
  )
}
