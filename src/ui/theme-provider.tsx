import { createContext, useContext, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme, themeStorageKey, type ColorTheme } from './theme'

const ThemeContext = createContext<{ theme: ColorTheme; select: (theme: ColorTheme) => void; warning: boolean } | null>(null)

export function ThemeSelector() {
  const { t } = useTranslation()
  const preference = useContext(ThemeContext)
  if (!preference) return null
  return <div className="locale-selector"><label className="locale-control"><span>{t('colorTheme')}</span><select className="select-input" value={preference.theme} onChange={event => preference.select(event.target.value as ColorTheme)}><option value="green">{t('themeGreen')}</option><option value="ink">{t('themeInk')}</option></select></label>{preference.warning ? <p role="alert">{t('themePreferenceWarning')}</p> : null}</div>
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in index.html has already set the attribute before the first frame.
  const [theme, setTheme] = useState<ColorTheme>(() => document.documentElement.dataset.theme === 'ink' ? 'ink' : 'green')
  const [warning, setWarning] = useState(false)
  const select = (next: ColorTheme) => {
    applyTheme(next); setTheme(next)
    try { localStorage.setItem(themeStorageKey, next); setWarning(false) }
    catch { setWarning(true) }
  }
  return <ThemeContext value={{ theme, select, warning }}>{children}</ThemeContext>
}
