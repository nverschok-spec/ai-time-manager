import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './de.json'
import ru from './ru.json'
import en from './en.json'

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    ru: { translation: ru },
    en: { translation: en }
  },
  lng: 'ru', // язык по умолчанию, переключается через LanguageSwitcher
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
