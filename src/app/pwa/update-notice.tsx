import { useTranslation } from 'react-i18next'
import { PersistentNotice } from '../../ui/notifications'

export function PwaUpdateNotice({ needRefresh, onUpdate, onLater }: { needRefresh: boolean; onUpdate: () => Promise<void>; onLater: () => void }) {
  const { t } = useTranslation()
  if (!needRefresh) return null

  return <PersistentNotice label={t('updateLabel')} text={t('updateAvailable')} actions={<>
    <button className="button button-primary" onClick={() => void onUpdate()}>{t('update')}</button>
    <button className="button button-secondary" onClick={onLater}>{t('later')}</button>
  </>} />
}
