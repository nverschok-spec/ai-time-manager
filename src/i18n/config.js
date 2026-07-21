import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './de.json'
import ru from './ru.json'
import en from './en.json'

export const LANGUAGE_STORAGE_KEY = 'ai-time-manager-lang'
const SUPPORTED_LANGUAGES = ['ru', 'de', 'en']

function detectInitialLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored

  const browserLang = (navigator.language || 'ru').slice(0, 2)
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'ru'
}

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    ru: { translation: ru },
    en: { translation: en }
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

// Every explicit switch (LanguageSwitcher) persists here too, but this catches
// any other caller of changeLanguage so the choice always sticks per device.
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
})

export default i18n
