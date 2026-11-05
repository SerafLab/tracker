import { useStore } from 'zustand'
import { createBrowserAdapter } from './webmcp/adapter'
import { useWebMcp } from './webmcp/use-webmcp'
import { ToolError } from './webmcp/error'
import { LocaleProvider } from '../i18n/provider'
import { ThemeProvider } from '../ui/theme-provider'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog, presetStatusNames, createProjectBoardStore, createProjectBoardUseCases, DexieProjectBoardRepository, ProjectBoardApp, ProjectBoardDatabase, type DraftGuard, type EditRequest, type Id, type ProjectBoardRepository } from '../features/project-board'
import { InstallProvider } from './pwa/install-guidance'
import { PwaUpdateRegistration } from './pwa/update-registration'
import { usePersistentStorage } from './pwa/persistent-storage'
import { RestartRequired } from './pwa/restart-required'
import { NotificationProvider } from '../ui/notifications'

const routeFor = (id: Id, cardId?: Id) => `#project/${encodeURIComponent(id)}${cardId ? `/card/${encodeURIComponent(cardId)}` : ''}`
function routeFromHash() {
  const match = location.hash.match(/^#project\/([^/]+)(?:\/card\/([^/]+))?$/)
  try { return match ? { projectId: decodeURIComponent(match[1]), cardId: match[2] ? decodeURIComponent(match[2]) : undefined } : undefined }
  catch { return undefined }
}
type PendingTransition = { action: () => void | Promise<void> }
type CardPresentation = 'panel' | 'page'
type NavigationOptions = { presentation?: CardPresentation; replace?: boolean }
type HistoryPosition = { index: number; hash: string }
const indexFromState = (): number | undefined => typeof history.state?.easyTrackIndex === 'number' ? history.state.easyTrackIndex : undefined

function WorkspaceApp({ repository: suppliedRepository, databaseName, reloadApp = () => location.reload() }: { repository?: ProjectBoardRepository; databaseName?: string; reloadApp?: () => void }) {
  const { t } = useTranslation()
  const translate = useRef(t)
  translate.current = t
  const requestPersistentStorage = usePersistentStorage()
  const staleConnection = useRef(false)
  const [restartRequired, setRestartRequired] = useState(false)
  const draftGuard = useRef<DraftGuard | null>(null)
  const pendingRef = useRef<PendingTransition | null>(null)
  const [pending, setPending] = useState<PendingTransition | null>(null)
  const [savingDrafts, setSavingDrafts] = useState(false)
  const pendingSave = useRef(false)
  const stayTrigger = useRef<HTMLButtonElement>(null)
  const navigate = useRef<(hash: string, refresh?: boolean, options?: NavigationOptions) => Promise<void>>(async () => {})
  const [cardPresentation, setCardPresentation] = useState<CardPresentation>('page')
  const [panelIsolated, setPanelIsolated] = useState(false)
  const presentation = useRef<CardPresentation>('page')
  const [editRequest, setEditRequest] = useState<EditRequest | null>(null)
  const editSeq = useRef(0)
  const [runtime] = useState(() => {
    const database = suppliedRepository ? undefined : new ProjectBoardDatabase(databaseName, () => { staleConnection.current = true; setRestartRequired(true) })
    const repository = suppliedRepository ?? new DexieProjectBoardRepository(database!)
    const useCases = createProjectBoardUseCases({ repository, createId: () => crypto.randomUUID(), now: () => new Date().toISOString(), build: { version: 'dev', commit: 'unknown' } })
    return { useCases, store: createProjectBoardStore(useCases, () => !staleConnection.current) }
  })
  const registerDraftGuard = useCallback((guard: DraftGuard | null) => { draftGuard.current = guard }, [])
  const requestLeave = useCallback((action: () => void | Promise<void>) => {
    if (pendingRef.current) return
    if (!draftGuard.current?.isDirty()) { void action(); return }
    const transition = { action }
    pendingRef.current = transition; setPending(transition)
  }, [])
  const cancelLeave = useCallback(() => { if (pendingSave.current) return; pendingRef.current = null; setPending(null) }, [])
  const finishLeave = async (save: boolean) => {
    if (pendingSave.current || !pendingRef.current) return
    pendingSave.current = true; setSavingDrafts(true)
    try {
      if (save && !await draftGuard.current?.save()) { cancelAfterFailedSave(); return }
      if (!save) draftGuard.current?.discard()
      const transition = pendingRef.current
      pendingRef.current = null; setPending(null)
      await transition?.action()
    } finally { pendingSave.current = false; setSavingDrafts(false) }
  }
  const cancelAfterFailedSave = () => { pendingRef.current = null; setPending(null) }
  useEffect(() => { if (pending) queueMicrotask(() => stayTrigger.current?.focus()) }, [pending])

  useEffect(() => {
    let active = true
    let request = 0
    let position: HistoryPosition = { index: indexFromState() ?? 0, hash: location.hash }
    // A reloaded/copied card address always starts as a full page.
    history.replaceState({ ...history.state, easyTrackIndex: position.index, easyTrackPresentation: 'page' }, '')
    let observed = `${position.index}:${position.hash}`
    let restoring = false
    let bypass = false
    let restored: (() => void) | undefined
    const storageReady = runtime.store.getState().openStorage()
    const showRoute = async (restoreLastProject = false) => {
      const startedAt = ++request
      let expectedHash = location.hash
      const isCurrent = () => active && request === startedAt && location.hash === expectedHash
      if (!await storageReady || !isCurrent()) return
      presentation.current = history.state?.easyTrackPresentation === 'panel' ? 'panel' : 'page'
      // Only a card route needs its presentation before it renders; leaving a card keeps the panel until the destination is shown.
      const applyPresentation = () => { if (isCurrent()) setCardPresentation(presentation.current) }
      let route = routeFromHash()
      if (!route && restoreLastProject) {
        let id: Id | undefined
        try { id = (await runtime.useCases.preference())?.lastProjectId } catch { /* A failed preference read still allows the catalogue. */ }
        if (!isCurrent()) return
        if (id) {
          history.replaceState({ ...history.state, easyTrackIndex: position.index }, '', routeFor(id))
          position.hash = location.hash; expectedHash = location.hash; observed = `${position.index}:${position.hash}`
          route = { projectId: id, cardId: undefined }
        }
      }
      if (route) {
        if (route.cardId) {
          applyPresentation()
          const result = await runtime.store.getState().showCard(route.projectId, route.cardId, true)
          if (result !== 'missing' || !isCurrent()) return
        } else {
          const shown = await runtime.store.getState().showBoard(route.projectId, true)
          applyPresentation()
          if (shown || !isCurrent()) return
        }
        history.replaceState({ ...history.state, easyTrackIndex: position.index }, '', location.pathname + location.search)
        position.hash = ''; observed = `${position.index}:`
      }
      const catalogue = runtime.store.getState().showCatalogue()
      await runtime.store.getState().clearLastProject()
      await catalogue
      applyPresentation()
    }
    const acceptPosition = (next: HistoryPosition) => { position = next; setEditRequest(null); void showRoute() }
    const onHistory = () => {
      if (!active) return
      let index = indexFromState()
      if (index === undefined) {
        index = position.index + 1
        history.replaceState({ ...history.state, easyTrackIndex: index }, '')
      }
      const hash = location.hash
      const key = `${index}:${hash}`
      if (key === observed) return
      observed = key
      if (restoring) {
        if (index === position.index && hash === position.hash) { restoring = false; restored?.(); restored = undefined }
        else history.go(position.index - index)
        return
      }
      const next = { index, hash }
      if (bypass) { bypass = false; acceptPosition(next); return }
      if (draftGuard.current?.isDirty() && index !== position.index) {
        const delta = index - position.index
        restoring = true
        const restoration = new Promise<void>(resolve => { restored = resolve })
        history.go(-delta)
        requestLeave(async () => { await restoration; bypass = true; history.go(delta) })
        return
      }
      acceptPosition(next)
    }
    navigate.current = async (hash, refresh = true, options = {}) => {
      if (!active) return
      if (hash !== location.hash || (options.presentation && options.presentation !== presentation.current)) {
        position = { index: position.index + (options.replace ? 0 : 1), hash }
        history[options.replace ? 'replaceState' : 'pushState']({ easyTrackIndex: position.index, easyTrackPresentation: options.presentation ?? 'page' }, '', hash || location.pathname + location.search)
        observed = `${position.index}:${hash}`
      }
      if (refresh) await showRoute()
    }
    void showRoute(true)
    addEventListener('popstate', onHistory)
    addEventListener('hashchange', onHistory)
    return () => { active = false; ++request; removeEventListener('popstate', onHistory); removeEventListener('hashchange', onHistory) }
  }, [runtime, requestLeave])

  const cardOpen = useStore(runtime.store, state => state.workspace.kind === 'card')
  const workspaceReady = useStore(runtime.store, state => !['loading', 'unavailable'].includes(state.workspace.kind))
  const agentPending = useStore(runtime.store, state => state.agentPending)
  const agentRefreshError = useStore(runtime.store, state => state.agentRefreshError)
  useWebMcp(createBrowserAdapter({
    store: runtime.store,
    state: () => staleConnection.current ? 'restart_required' : runtime.store.getState().storageState,
    route: () => location.hash,
    isDirty: () => !!draftGuard.current?.isDirty() || !!pendingRef.current || pendingSave.current,
    reads: runtime.useCases,
    onSaved: requestPersistentStorage,
    statusNames: id => presetStatusNames(id === 'none' ? 'empty' : id, translate.current),
    async showWorkspace(projectId) {
      const assertClean = () => {
        if (staleConnection.current) throw new ToolError('restart_required')
        if (draftGuard.current?.isDirty() || pendingRef.current || pendingSave.current) throw new ToolError('conflict', 'Unsaved drafts block showing another workspace')
      }
      assertClean()
      if (projectId && !await runtime.useCases.board(projectId)) throw new ToolError('not_found')
      assertClean()
      const expected = projectId ? routeFor(projectId) : ''
      await navigate.current(expected)
      const workspace = runtime.store.getState().workspace
      if (location.hash !== expected || (projectId ? workspace.kind !== 'board' || workspace.board.id !== projectId : workspace.kind !== 'catalogue')) throw new ToolError('storage_unavailable', 'Requested workspace was not applied')
      const preference = await runtime.useCases.preference()
      if (location.hash !== expected) throw new ToolError('conflict', 'Workspace changed while confirming navigation')
      if (preference?.lastProjectId !== projectId) throw new ToolError('storage_unavailable', 'Workspace preference was not confirmed')
      return { route: location.hash, url: location.href }
    },
  }), restartRequired)

  const navigateToProject = async (id: Id) => { requestLeave(() => navigate.current(routeFor(id))) }
  const navigateToCard = async (projectId: Id, cardId: Id, options: { edit?: boolean } = {}) => {
    requestLeave(() => {
      setEditRequest({ cardId, seq: ++editSeq.current, edit: !!options.edit })
      return navigate.current(routeFor(projectId, cardId), true, { presentation: 'panel', replace: !!routeFromHash()?.cardId && presentation.current === 'panel' })
    })
  }
  const expandCard = async () => { await navigate.current(location.hash, false, { presentation: 'page' }); presentation.current = 'page'; setCardPresentation('page') }
  const closeCard = async (projectId: Id) => {
    requestLeave(() => presentation.current === 'panel' ? history.back() : navigate.current(routeFor(projectId)))
  }
  // A panel opened in-session sits on top of its board entry, so Back removes it; otherwise replace the card entry.
  const closeMissingCard = useCallback(async (projectId: Id) => {
    if (presentation.current === 'panel') history.back()
    else await navigate.current(routeFor(projectId), true, { replace: true })
  }, [])
  const navigateToCatalogue = async () => { requestLeave(() => navigate.current('')) }
  const onProjectDeleted = async (id: Id) => { if (routeFromHash()?.projectId === id) await navigate.current('', false) }
  const content = restartRequired ? <RestartRequired onRestart={reloadApp} /> : <><div inert={panelIsolated} hidden={!agentRefreshError || cardOpen}>{agentRefreshError ? <div className="save-error" role="alert"><p>{t('agentRefreshFailed')}</p><button className="button button-secondary" disabled={agentPending} onClick={() => void runtime.store.getState().retryAgentRefresh()}>{t('retryBoardRead')}</button></div> : null}</div><ProjectBoardApp onPanelIsolationChange={setPanelIsolated} cardPresentation={cardPresentation} editRequest={editRequest} onExpandCard={expandCard} onCloseCard={closeCard} onPanelCardMissing={closeMissingCard} store={runtime.store} navigateToProject={navigateToProject} navigateToCard={navigateToCard} navigateToCatalogue={navigateToCatalogue} onProjectDeleted={onProjectDeleted} registerDraftGuard={registerDraftGuard} requestLeave={requestLeave} onMutationSaved={requestPersistentStorage} /><PwaUpdateRegistration requestUpdate={requestLeave} />
    {pending ? <ActionDialog title={t('unsavedTitle')} onClose={cancelLeave}><p>{t('unsavedHelp')}</p><div className="form-actions"><button ref={stayTrigger} className="button button-secondary" disabled={savingDrafts} onClick={cancelLeave}>{t('stay')}</button><button className="button button-secondary" disabled={savingDrafts} onClick={() => void finishLeave(false)}>{t('discardAndLeave')}</button><button className="button button-primary" disabled={savingDrafts} onClick={() => void finishLeave(true)}>{t('saveAndLeave')}</button></div></ActionDialog> : null}
  </>
  return <NotificationProvider isolated={panelIsolated}><InstallProvider ready={workspaceReady && !restartRequired}>{content}</InstallProvider></NotificationProvider>
}
export function App(props: Parameters<typeof WorkspaceApp>[0]) { return <LocaleProvider><ThemeProvider><WorkspaceApp {...props} /></ThemeProvider></LocaleProvider> }
