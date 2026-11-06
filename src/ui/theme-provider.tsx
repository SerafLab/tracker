import { createContext, useContext, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme, themeStorageKey, type ColorTheme } from './theme'

const ThemeContext = createContext<{ theme: ColorTheme; select: (theme: ColorTheme) => void; warning: boolean } | null>(null)

const themes: { theme: ColorTheme; label: 'themeGreen' | 'themeInk' }[] = [{ theme: 'green', label: 'themeGreen' }, { theme: 'ink', label: 'themeInk' }]

export function ThemeMenuGroup() {
  const { t } = useTranslation()
  const preference = useContext(ThemeContext)
  const captionId = useId()
  if (!preference) return null
  return <>
    <div role="separator" className="menu-separator" />
    <div id={captionId} className="menu-caption">{t('colorTheme')}</div>
    <div role="group" aria-labelledby={captionId} className="menu-group">
      {themes.map(({ theme, label }) => {
        const checked = preference.theme === theme
        return <button key={theme} type="button" role="menuitemradio" aria-checked={checked} className="menu-item menu-item-radio" onClick={() => preference.select(theme)}>
          {t(label)}
          {checked ? <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg> : null}
        </button>
      })}
    </div>
  </>
}

export function ThemePreferenceWarning() {
  const { t } = useTranslation()
  const preference = useContext(ThemeContext)
  return preference?.warning ? <p role="alert" className="menu-warning">{t('themePreferenceWarning')}</p> : null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in index.html has already set the attribute before the first frame.
  const [theme, setTheme] = useState<ColorTheme>(() => document.documentElement.dataset.theme === 'green' ? 'green' : 'ink')
  const [warning, setWarning] = useState(false)
  const select = (next: ColorTheme) => {
    applyTheme(next); setTheme(next)
    try { localStorage.setItem(themeStorageKey, next); setWarning(false) }
    catch { setWarning(true) }
  }
  return <ThemeContext value={{ theme, select, warning }}>{children}</ThemeContext>
}
