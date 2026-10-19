import { useTranslation } from 'react-i18next'
export function RestartRequired({ onRestart }: { onRestart: () => void }) {
  const { t } = useTranslation()
  return <main className="app-shell"><section className="unavailable-state surface-card"><h1>{t('restartTitle')}</h1><p role="alert">{t('restartHelp')}</p><button className="button button-primary" onClick={onRestart}>{t('restart')}</button></section></main>
}
