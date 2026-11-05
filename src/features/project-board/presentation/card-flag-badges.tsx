import { useTranslation } from 'react-i18next'
import { BoardIcon } from './board-icon'

export type CardFlag = 'important' | 'urgent'

export function CardFlagLabel({ flag }: { flag: CardFlag }) {
  const { t } = useTranslation()
  return <span className={`card-badge card-badge-${flag}`}><BoardIcon name={flag} />{t(flag)}</span>
}

export function CardFlagBadges({ important, urgent }: { important: boolean; urgent: boolean }) {
  return <div className="card-badges">{important ? <CardFlagLabel flag="important" /> : null}{urgent ? <CardFlagLabel flag="urgent" /> : null}</div>
}
