export type ColorTheme = 'green' | 'ink'
export const themeStorageKey = 'easytrack.theme'
export function applyTheme(theme: ColorTheme) {
  if (theme === 'green') document.documentElement.dataset.theme = 'green'
  else delete document.documentElement.dataset.theme
}
