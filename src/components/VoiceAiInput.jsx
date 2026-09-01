import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Mic, MicOff, Paperclip, Send, X } from 'lucide-react'
import { compressImageFile, readPdfFile } from '../lib/image'

const SpeechRecognitionClass =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export default function VoiceAiInput({ onSubmit, isLoading, autoFocus }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const voiceAvailable = useMemo(() => Boolean(SpeechRecognitionClass), [])

  // Delayed past the sheet's own enter transition (see AiInputSheet) so iOS
  // Safari doesn't fight two viewport shifts at once — the sheet sliding up
  // and the keyboard opening — which is what causes the jump the brief
  // called out. Skipped entirely when not opened inside the sheet.
  useEffect(() => {
    if (!autoFocus) return
    const timer = setTimeout(() => textareaRef.current?.focus(), 260)
    return () => clearTimeout(timer)
  }, [autoFocus])

  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleChange(e) {
    setText(e.target.value)
    autoGrow(e.target)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if ((!trimmed && !attachment) || isLoading) return
    onSubmit({ text: trimmed, attachment })
    setText('')
    setAttachment(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      if (file.type === 'application/pdf') {
        setAttachment(await readPdfFile(file))
      } else {
        setAttachment(await compressImageFile(file))
      }
    } catch {
      // unreadable or too-large file — ignore, user can retry
    }
  }

  function toggleListening() {
    if (!voiceAvailable) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    setVoiceError(false)
    const recognition = new SpeechRecognitionClass()
    recognition.lang = i18n.resolvedLanguage === 'ru' ? 'ru-RU' : i18n.resolvedLanguage === 'de' ? 'de-DE' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || ''
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onend = () => setIsListening(false)
    // The Web Speech API exists (voiceAvailable) but iOS Safari refuses to
    // actually run it once the app is installed as a home-screen PWA — this
    // fires near-instantly in that case, so tell people to use the
    // keyboard's own dictation mic instead of leaving the tap unexplained.
    recognition.onerror = () => {
      setIsListening(false)
      setVoiceError(true)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {voiceError && <p className="px-2 text-xs text-priority-medium">{t('input.mic_error')}</p>}
      {attachment && (
        <div className="flex items-center gap-2 rounded-xl bg-app-card p-2">
          {attachment.mediaType === 'application/pdf' ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-app-cardMuted text-slate-300">
              <FileText size={20} />
            </div>
          ) : (
            <img src={attachment.previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-muted">
            {attachment.mediaType === 'application/pdf' ? attachment.fileName : t('input.photo_attached')}
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label={t('input.remove_attachment')}
            className="p-1 text-slate-500 hover:text-priority-high transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('input.placeholder')}
          className="min-w-0 flex-1 max-h-36 resize-none overflow-y-auto rounded-full bg-app-card px-4 py-2.5 text-sm text-slate-100 placeholder:text-muted outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t('input.photo_start')}
          aria-label={t('input.photo_start')}
          className="rounded-full bg-app-card p-2.5 text-slate-300 transition-transform active:scale-[0.97] hover:text-slate-100"
        >
          <Paperclip size={18} />
        </button>
        <button
          type="button"
          onClick={toggleListening}
          disabled={!voiceAvailable}
          title={voiceAvailable ? t('input.mic_start') : t('input.mic_unavailable')}
          aria-label={voiceAvailable ? t('input.mic_start') : t('input.mic_unavailable')}
          className={`rounded-full p-2.5 transition-transform active:scale-[0.97] ${
            !voiceAvailable
              ? 'text-slate-700 cursor-not-allowed'
              : isListening
                ? 'bg-priority-high text-white'
                : 'bg-brand-cta text-brand-ctaForeground hover:brightness-110'
          }`}
        >
          {voiceAvailable ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          type="submit"
          disabled={isLoading || (!text.trim() && !attachment)}
          title={t('input.send')}
          aria-label={t('input.send')}
          className="rounded-full bg-brand-cta p-2.5 text-brand-ctaForeground transition-transform active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  )
}
