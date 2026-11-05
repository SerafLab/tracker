import { createContext, useContext, useId, useLayoutEffect, useState, type ReactNode } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { createLocaleInstance, localeStorageKey, type Locale } from './locale'

const LocalePreferenceContext = createContext<{ select: (locale: Locale) => void; warning: boolean } | null>(null)

const languages: { locale: Locale; label: string }[] = [{ locale: 'ru', label: 'Русский' }, { locale: 'en', label: 'English' }]

export function LanguageMenuGroup() {
  const { t, i18n } = useTranslation()
  const preference = useContext(LocalePreferenceContext)
  const captionId = useId()
  if (!preference) return null
  return <>
    <div id={captionId} className="menu-caption">{t('applicationLanguage')}</div>
    <div role="group" aria-labelledby={captionId} className="menu-group">
      {languages.map(({ locale, label }) => {
        const checked = i18n.resolvedLanguage === locale
        return <button key={locale} type="button" role="menuitemradio" aria-checked={checked} lang={locale} className="menu-item menu-item-radio" onClick={() => preference.select(locale)}>
          {label}
          {checked ? <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg> : null}
        </button>
      })}
    </div>
  </>
}

export function LanguagePreferenceWarning() {
  const { t } = useTranslation()
  const preference = useContext(LocalePreferenceContext)
  return preference?.warning ? <p role="alert" className="menu-warning">{t('preferenceWarning')}</p> : null
}

function LocaleShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const [warning, setWarning] = useState(false)
  const locale = i18n.resolvedLanguage as Locale
  useLayoutEffect(() => {
    document.documentElement.lang = locale
    document.title = t('pageTitle')
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.append(description) }
    description.content = t('description')
    let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!manifest) { manifest = document.createElement('link'); manifest.rel = 'manifest'; document.head.append(manifest) }
    manifest.href = `${import.meta.env.BASE_URL}manifest.${locale}.webmanifest`
  }, [locale, t])
  const select = (next: Locale) => {
    void i18n.changeLanguage(next)
    try { localStorage.setItem(localeStorageKey, next); setWarning(false) }
    catch { setWarning(true) }
  }
  return <LocalePreferenceContext value={{ select, warning }}>{children}</LocalePreferenceContext>
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [instance] = useState(createLocaleInstance)
  return <I18nextProvider i18n={instance}><LocaleShell>{children}</LocaleShell></I18nextProvider>
}
