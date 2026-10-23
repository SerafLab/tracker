import { AppBar } from '../../ui/app-bar'
import { useTranslation } from 'react-i18next'
export function RestartRequired({ onRestart }: { onRestart: () => void }) {
  const { t } = useTranslation()
  return <><AppBar title={t('restartTitle')} /><main className="app-shell"><section className="unavailable-state surface-card"><p role="alert">{t('restartHelp')}</p><button className="button button-primary" onClick={onRestart}>{t('restart')}</button></section></main></>
}
