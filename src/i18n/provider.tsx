import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { createLocaleInstance, localeStorageKey, type Locale } from './locale'

const LocalePreferenceContext = createContext<{ select: (locale: Locale) => void; warning: boolean; dialogCount: number; setDialogCount: Dispatch<SetStateAction<number>> } | null>(null)

export function LocaleSelector({ inDialog = false }: { inDialog?: boolean }) {
  const { t, i18n } = useTranslation()
  const preference = useContext(LocalePreferenceContext)
  const setDialogCount = preference?.setDialogCount
  useLayoutEffect(() => {
    if (!inDialog || !setDialogCount) return
    setDialogCount(count => count + 1)
    return () => setDialogCount(count => count - 1)
  }, [inDialog, setDialogCount])
  if (!preference) return null
  return <div className="locale-selector"><label className="locale-control"><span>{t('language')}</span><select className="select-input" value={i18n.resolvedLanguage} onChange={event => preference.select(event.target.value as Locale)}><option value="ru" lang="ru">Русский</option><option value="en" lang="en">English</option></select></label>{preference.warning && (inDialog || preference.dialogCount === 0) ? <p role="alert">{t('preferenceWarning')}</p> : null}</div>
}

function LocaleShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const [warning, setWarning] = useState(false)
  const [dialogCount, setDialogCount] = useState(0)
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
  return <LocalePreferenceContext value={{ select, warning, dialogCount, setDialogCount }}><div className="locale-shell"><LocaleSelector /></div>{children}</LocalePreferenceContext>
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [instance] = useState(createLocaleInstance)
  return <I18nextProvider i18n={instance}><LocaleShell>{children}</LocaleShell></I18nextProvider>
}
