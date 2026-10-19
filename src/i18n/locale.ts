import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en, ru } from './resources'

export type Locale = 'ru' | 'en'
export const localeStorageKey = 'easytrack.locale'
export function resolveLocale(storage: Pick<Storage, 'getItem'>, browserLanguage: string): Locale {
  try {
    const saved = storage.getItem(localeStorageKey)
    if (saved === 'ru' || saved === 'en') return saved
  } catch { /* Storage can be blocked independently of the workspace. */ }
  return browserLanguage.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en'
}
export function initialLocale(): Locale {
  try { return resolveLocale(localStorage, navigator.language) }
  catch { return navigator.language.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en' }
}
export function createLocaleInstance(locale = initialLocale()) {
  const instance = createInstance()
  void instance.use(initReactI18next).init({ lng: locale, fallbackLng: 'en', resources: { ru: { translation: ru }, en: { translation: en } }, interpolation: { escapeValue: false }, initAsync: false })
  return instance
}
