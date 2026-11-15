import { useContext, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useModalOpen } from './modal-state'
import { SettingsNavigationContext } from './settings-navigation'
import { BarMenu } from './bar-menu'
import { TruncatedText } from './truncated-text'

type BarAction = { disabled?: boolean; label: string; onSelect: () => void; triggerRef: RefObject<HTMLButtonElement | null> }

type AppBarProps = ({ title: string; context?: never } | { title?: never; context: { project: string; status: string } }) & { onReturn?: () => void; creation?: BarAction; onBack?: () => void; projectActions?: { disabled?: boolean; triggerRef: BarAction['triggerRef']; onRename: () => void; onDelete: () => void } }

export function AppBar({ title, context, onReturn, creation, onBack, projectActions }: AppBarProps) {
  const { t } = useTranslation()
  const modalOpen = useModalOpen()
  const navigation = useContext(SettingsNavigationContext)
  const gear = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    const button = gear.current
    return () => { if (button) navigation?.preserveFocus(button) }
  }, [navigation])
  useEffect(() => { queueMicrotask(() => { if (gear.current) navigation?.restoreFocus(gear.current) }) }, [navigation])
  const brand = <><svg className="brand-mark" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h7M4 12h4M4 19h10m-3-7 4 4 6-9" /></svg>EasyTrack</>
  return <header className="app-bar" inert={modalOpen} aria-hidden={modalOpen || undefined}>
    <div className="app-bar-inner">
      {onReturn ? <button className="app-brand bar-hint" data-hint={t('allProjects')} aria-label={`EasyTrack — ${t('allProjects')}`} translate="no" onClick={onReturn}>{brand}</button> : <span className="app-brand" translate="no">{brand}</span>}
      {context
        ? <div className="app-bar-context"><TruncatedText text={context.project} className="app-bar-context-text" wrapClassName="app-bar-context-project" /><span className="app-bar-context-separator" aria-hidden="true">›</span><TruncatedText text={context.status} className="app-bar-context-text" wrapClassName="app-bar-context-status" /></div>
        : <TruncatedText as="h1" text={title ?? ''} className="page-title" focusOnMount={!!onBack && !modalOpen} />}
      <div className="app-bar-controls">
        {creation && !onBack ? <button disabled={creation.disabled} ref={creation.triggerRef} className="button button-primary button-icon bar-hint" data-hint={creation.label} aria-label={creation.label} onClick={creation.onSelect}><svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button> : null}
        {projectActions && !onBack ? <BarMenu label={t('boardProjectActions')} triggerRef={projectActions.triggerRef} disabled={projectActions.disabled} items={[
          { label: t('renameProject'), select: projectActions.onRename },
          { label: t('deleteProject'), select: projectActions.onDelete },
        ]} /> : null}
        {onBack
          ? <button className="button button-quiet button-icon bar-hint" data-hint={t('back')} aria-label={t('back')} onClick={onBack}><svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m11 5-7 7 7 7M4 12h16" /></svg></button>
          : <button ref={gear} className="button button-quiet button-icon bar-hint" data-hint={t('settings')} aria-label={t('settings')} onClick={navigation?.openSettings}><svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 3-.6 2.4-2 .9L4 5.6 2 9l1.8 1.7v2.6L2 15l2 3.4 2.4-.7 2 .9L9 21h4l.6-2.4 2-.9 2.4.7 2-3.4-1.8-1.7v-2.6L20 9l-2-3.4-2.4.7-2-.9L13 3Z" /><circle cx="11" cy="12" r="3" /></svg></button>}
      </div>
    </div>
  </header>
}
