export type ColorTheme = 'green' | 'ink'
export const themeStorageKey = 'easytrack.theme'
export function applyTheme(theme: ColorTheme) {
  if (theme === 'ink') document.documentElement.dataset.theme = 'ink'
  else delete document.documentElement.dataset.theme
}
