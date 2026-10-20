import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import {
  validateQuestionsVerbose,
  mapExternalBankItem,
  dedupeAgainstBank,
  exportBankToExternalFormat
} from '../../lib/testBank'
import { toDateKey } from '../../lib/date'

function slugify(topic) {
  return topic.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').slice(0, 40) || `topic-${Date.now()}`
}

function downloadJson(filename, content) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// S-02 (whole-module backup, separate from the app-wide export which
// already includes `study`) + S-03 (import a bank from the external
// trainer's compact {title, items:[{t,q,o,a,e,r,h}]} format, with a
// new-bank-or-merge choice and a before/after count so a bad file doesn't
// silently wipe progress).
export default function StudyDataTools() {
  const { t } = useTranslation()
  const study = useAppStore((s) => s.study)
  const exportStudyData = useAppStore((s) => s.exportStudyData)
  const importStudyData = useAppStore((s) => s.importStudyData)
  const saveStudyBank = useAppStore((s) => s.saveStudyBank)
  const setActiveTopicSlug = useAppStore((s) => s.setActiveTopicSlug)

  const backupInputRef = useRef(null)
  const bankInputRef = useRef(null)

  const [pendingBackup, setPendingBackup] = useState(null) // { json, bankCount }
  const [backupError, setBackupError] = useState(false)
  const [backupDone, setBackupDone] = useState(false)

  const [bankPreview, setBankPreview] = useState(null) // { title, questions, rejectedCount, rejectedReasons }
  const [bankTarget, setBankTarget] = useState('new')
  const [bankError, setBankError] = useState(false)
  const [bankDone, setBankDone] = useState(null) // { added, skipped }

  function handleExportBackup() {
    downloadJson(`study-backup-${toDateKey(new Date())}.json`, exportStudyData())
  }

  function handleBackupFileChosen(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBackupError(false)
    setBackupDone(false)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!parsed || typeof parsed.banks !== 'object') throw new Error('bad shape')
        setPendingBackup({ json: reader.result, bankCount: Object.keys(parsed.banks).length })
      } catch {
        setBackupError(true)
      }
    }
    reader.readAsText(file)
  }

  function confirmBackupImport() {
    if (!pendingBackup) return
    try {
      importStudyData(pendingBackup.json)
      setBackupDone(true)
    } catch {
      setBackupError(true)
    }
    setPendingBackup(null)
  }

  function handleBankFileChosen(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBankError(false)
    setBankDone(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!parsed || !Array.isArray(parsed.items)) throw new Error('bad shape')
        const mapped = parsed.items.map(mapExternalBankItem)
        const { valid, rejectedCount, rejectedReasons } = validateQuestionsVerbose(mapped)
        setBankPreview({ title: typeof parsed.title === 'string' ? parsed.title : '', questions: valid, rejectedCount, rejectedReasons })
        setBankTarget('new')
      } catch {
        setBankError(true)
      }
    }
    reader.readAsText(file)
  }

  function confirmBankImport() {
    if (!bankPreview) return
    if (bankTarget === 'new') {
      const title = bankPreview.title || t('study.imported_bank_default_title')
      let slug = slugify(title)
      if (study.banks[slug]) slug = `${slug}-${Date.now().toString(36)}`
      const blocks = [...new Set(bankPreview.questions.map((q) => q.block))]
      saveStudyBank(slug, { topic: title, blocks, questions: bankPreview.questions })
      setActiveTopicSlug(slug)
      setBankDone({ added: bankPreview.questions.length, skipped: 0 })
    } else {
      const existing = study.banks[bankTarget]
      const deduped = dedupeAgainstBank(bankPreview.questions, existing)
      const blocks = [...new Set([...existing.blocks, ...deduped.map((q) => q.block)])]
      saveStudyBank(bankTarget, { ...existing, blocks, questions: [...existing.questions, ...deduped] })
      setActiveTopicSlug(bankTarget)
      setBankDone({ added: deduped.length, skipped: bankPreview.questions.length - deduped.length })
    }
    setBankPreview(null)
  }

  function handleExportCurrentBank(slug) {
    const bank = study.banks[slug]
    if (!bank) return
    downloadJson(`${slugify(bank.topic)}.json`, exportBankToExternalFormat(bank))
  }

  const topicSlugs = Object.keys(study.banks)

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <p className="text-sm text-slate-300">{t('study.backup_title')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-app-cardMuted py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            <Download size={14} /> {t('study.backup_export')}
          </button>
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-app-cardMuted py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            <Upload size={14} /> {t('study.backup_import')}
          </button>
          <input ref={backupInputRef} type="file" accept="application/json" onChange={handleBackupFileChosen} className="hidden" />
        </div>
        {backupError && <p className="text-xs text-priority-high">{t('study.backup_error')}</p>}
        {backupDone && <p className="text-xs text-brand-cta">{t('study.backup_done')}</p>}
        {pendingBackup && (
          <div className="space-y-2 rounded-xl bg-app-bg p-3">
            <p className="text-xs text-slate-300">
              {t('study.backup_confirm', { count: pendingBackup.bankCount })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmBackupImport}
                className="flex-1 rounded-md bg-priority-high py-1.5 text-xs font-medium text-white hover:brightness-110"
              >
                {t('study.backup_confirm_yes')}
              </button>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className="flex-1 rounded-md bg-app-cardMuted py-1.5 text-xs text-slate-200 hover:bg-white/10"
              >
                {t('study.backup_confirm_no')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <p className="text-sm text-slate-300">{t('study.import_bank_title')}</p>
        <button
          type="button"
          onClick={() => bankInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-app-cardMuted py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <Upload size={14} /> {t('study.import_bank_button')}
        </button>
        <input ref={bankInputRef} type="file" accept="application/json" onChange={handleBankFileChosen} className="hidden" />
        {bankError && <p className="text-xs text-priority-high">{t('study.import_bank_error')}</p>}
        {bankDone && (
          <p className="text-xs text-brand-cta">
            {t('study.import_bank_done', { added: bankDone.added, skipped: bankDone.skipped })}
          </p>
        )}
        {bankPreview && (
          <div className="space-y-2 rounded-xl bg-app-bg p-3">
            <p className="text-xs text-slate-300">
              {t('study.import_bank_summary', { valid: bankPreview.questions.length, rejected: bankPreview.rejectedCount })}
            </p>
            {bankPreview.rejectedReasons.length > 0 && (
              <p className="text-xs text-slate-500">{bankPreview.rejectedReasons.join(', ')}</p>
            )}
            <select
              value={bankTarget}
              onChange={(e) => setBankTarget(e.target.value)}
              className="w-full rounded-md bg-app-card px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
            >
              <option value="new">{t('study.import_bank_as_new')}</option>
              {topicSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {study.banks[slug].topic}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmBankImport}
                disabled={bankPreview.questions.length === 0}
                className="flex-1 rounded-md bg-brand-cta py-1.5 text-xs font-medium text-brand-ctaForeground hover:brightness-110 disabled:opacity-50"
              >
                {t('study.import_bank_confirm')}
              </button>
              <button
                type="button"
                onClick={() => setBankPreview(null)}
                className="flex-1 rounded-md bg-app-cardMuted py-1.5 text-xs text-slate-200 hover:bg-white/10"
              >
                {t('study.backup_confirm_no')}
              </button>
            </div>
          </div>
        )}
      </div>

      {topicSlugs.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
          <p className="text-sm text-slate-300">{t('study.export_bank_title')}</p>
          <div className="flex flex-wrap gap-1.5">
            {topicSlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => handleExportCurrentBank(slug)}
                className="rounded-full bg-app-cardMuted px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10"
              >
                {study.banks[slug].topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
