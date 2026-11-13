import { createContext, useContext, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme, themeStorageKey, type ColorTheme } from './theme'

const ThemeContext = createContext<{ theme: ColorTheme; select: (theme: ColorTheme) => void; warning: boolean } | null>(null)

const themes: { theme: ColorTheme; label: 'themeGreen' | 'themeInk' }[] = [{ theme: 'green', label: 'themeGreen' }, { theme: 'ink', label: 'themeInk' }]

export function ThemeChoice() {
  const { t } = useTranslation()
  const preference = useContext(ThemeContext)
  if (!preference) return null
  return <fieldset className="settings-choice">
    <legend>{t('colorTheme')}</legend>
    {themes.map(({ theme, label }) => <label key={theme}>
      <input type="radio" name="theme" checked={preference.theme === theme} onChange={() => preference.select(theme)} />
      {t(label)}
    </label>)}
    <ThemePreferenceWarning />
  </fieldset>
}

function ThemePreferenceWarning() {
  const { t } = useTranslation()
  const preference = useContext(ThemeContext)
  return preference?.warning ? <p role="alert" className="settings-warning">{t('themePreferenceWarning')}</p> : null
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
