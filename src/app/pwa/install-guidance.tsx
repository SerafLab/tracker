import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActionDialog } from '../../features/project-board'
import { SettingsEntryContext } from '../../ui/settings-entry'
import { useModalOpen } from '../../ui/modal-state'
import { dismissInvitation, isAppleMobile, isInvitationDismissed, useInstallState, type InstallState } from './install-state'

/**
 * Owns installation for the app shell: the settings entry, its dialogs and the first-visit invitation.
 * `ready` turns true once a workspace (catalogue, board or card) is shown; the invitation is considered
 * only at that moment, once per launch, and never queued behind another dialog.
 */
export function InstallProvider({ ready = false, children }: { ready?: boolean; children: ReactNode }) {
  const { t } = useTranslation()
  const state = useInstallState()
  const modalOpen = useModalOpen()
  const considered = useRef(false)
  const { standalone, setDialog } = state
  useEffect(() => {
    if (!ready || considered.current) return
    considered.current = true
    if (!standalone && !modalOpen && !isInvitationDismissed()) setDialog('invitation')
  }, [ready, standalone, modalOpen, setDialog])
  const label = state.deferredPrompt ? t('install') : standalone ? t('localDataTitle') : t('installHelp')
  const onSelect = () => { if (state.deferredPrompt) void state.install(); else setDialog('guidance') }
  return <SettingsEntryContext value={{ label, onSelect }}>{children}<InstallDialog state={state} /></SettingsEntryContext>
}

function InstallDialog({ state }: { state: InstallState }) {
  if (state.dialog === 'invitation') return <InstallInvitation state={state} />
  if (state.dialog === 'guidance') return <InstallGuidance state={state} />
  return null
}

function InstallGuidance({ state }: { state: InstallState }) {
  const { t } = useTranslation()
  const close = () => state.setDialog(null)
  return <ActionDialog title={state.standalone ? t('localDataTitle') : t('install')} onClose={close}><div className="install-guidance">
    {state.standalone ? null : <><p>{t('installBefore')}</p><p>{isAppleMobile() ? t('installApple') : t('installBrowser')}</p></>}
    <p>{t('localData')}</p>
    <div className="form-actions"><button className="button button-primary" onClick={close}>{t('understood')}</button></div>
  </div></ActionDialog>
}

function InstallInvitation({ state }: { state: InstallState }) {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const apple = isAppleMobile()
  const close = () => { if (dontShowAgain) dismissInvitation(); state.setDialog(null) }
  const install = () => { close(); void state.install() }
  return <ActionDialog title={t('installInvitationTitle')} onClose={close}><div className="install-guidance">
    <p>{t('installInvitationIntro')}</p>
    {apple ? <p>{t('installInvitationApple')}</p> : null}
    <p>{apple ? t('installApple') : t('installBrowser')}</p>
    <p>{t('localData')}</p>
    <label className="checkbox-field"><input type="checkbox" checked={dontShowAgain} onChange={event => setDontShowAgain(event.target.checked)} />{t('dontShowAgain')}</label>
    <div className="form-actions">
      <button className="button button-secondary" onClick={close}>{t('close')}</button>
      {state.deferredPrompt ? <button className="button button-primary" onClick={install}>{t('install')}</button> : null}
    </div>
  </div></ActionDialog>
}
