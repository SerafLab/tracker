import { useTranslation } from 'react-i18next'
export function PwaUpdateNotice({ needRefresh, onUpdate, onLater }: { needRefresh: boolean; onUpdate: () => Promise<void>; onLater: () => void }) {
  const { t } = useTranslation()
  if (!needRefresh) return null

  return <aside className="pwa-update-notice" role="status" aria-label={t('updateLabel')}>
    <p>{t('updateAvailable')}</p>
    <div className="form-actions">
      <button className="button button-primary" onClick={() => void onUpdate()}>{t('update')}</button>
      <button className="button button-secondary" onClick={onLater}>{t('later')}</button>
    </div>
  </aside>
}
