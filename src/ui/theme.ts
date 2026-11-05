export type ColorTheme = 'green' | 'ink'
export const themeStorageKey = 'easytrack.theme'
export function resolveTheme(storage: Pick<Storage, 'getItem'>): ColorTheme {
  try { if (storage.getItem(themeStorageKey) === 'ink') return 'ink' }
  catch { /* Storage can be blocked independently of the workspace. */ }
  return 'green'
}
export function applyTheme(theme: ColorTheme) {
  if (theme === 'ink') document.documentElement.dataset.theme = 'ink'
  else delete document.documentElement.dataset.theme
}
