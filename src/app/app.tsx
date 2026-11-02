import { LocaleProvider } from '../i18n/provider'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog, createProjectBoardStore, createProjectBoardUseCases, DexieProjectBoardRepository, ProjectBoardApp, ProjectBoardDatabase, type DraftGuard, type Id, type ProjectBoardRepository } from '../features/project-board'
import { InstallGuidance } from './pwa/install-guidance'
import { PwaUpdateRegistration } from './pwa/update-registration'
import { usePersistentStorage } from './pwa/persistent-storage'
import { RestartRequired } from './pwa/restart-required'

const routeFor = (id: Id, cardId?: Id) => `#project/${encodeURIComponent(id)}${cardId ? `/card/${encodeURIComponent(cardId)}` : ''}`
function routeFromHash() {
  const match = location.hash.match(/^#project\/([^/]+)(?:\/card\/([^/]+))?$/)
  try { return match ? { projectId: decodeURIComponent(match[1]), cardId: match[2] ? decodeURIComponent(match[2]) : undefined } : undefined }
  catch { return undefined }
}
type PendingTransition = { action: () => void | Promise<void> }
type HistoryPosition = { index: number; hash: string }
const indexFromState = (): number | undefined => typeof history.state?.easyTrackIndex === 'number' ? history.state.easyTrackIndex : undefined

function WorkspaceApp({ repository: suppliedRepository, databaseName, reloadApp = () => location.reload() }: { repository?: ProjectBoardRepository; databaseName?: string; reloadApp?: () => void }) {
  const { t } = useTranslation()
  const requestPersistentStorage = usePersistentStorage()
  const staleConnection = useRef(false)
  const [restartRequired, setRestartRequired] = useState(false)
  const draftGuard = useRef<DraftGuard | null>(null)
  const pendingRef = useRef<PendingTransition | null>(null)
  const [pending, setPending] = useState<PendingTransition | null>(null)
  const [savingDrafts, setSavingDrafts] = useState(false)
  const pendingSave = useRef(false)
  const stayTrigger = useRef<HTMLButtonElement>(null)
  const navigate = useRef<(hash: string, refresh?: boolean) => Promise<void>>(async () => {})
  const [runtime] = useState(() => {
    const database = suppliedRepository ? undefined : new ProjectBoardDatabase(databaseName, () => { staleConnection.current = true; setRestartRequired(true) })
    const repository = suppliedRepository ?? new DexieProjectBoardRepository(database!)
    const useCases = createProjectBoardUseCases({ repository, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
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
    history.replaceState({ ...history.state, easyTrackIndex: position.index }, '')
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
          const result = await runtime.store.getState().showCard(route.projectId, route.cardId, true)
          if (result !== 'missing' || !isCurrent()) return
        } else {
          const shown = await runtime.store.getState().showBoard(route.projectId, true)
          if (shown || !isCurrent()) return
        }
        history.replaceState({ ...history.state, easyTrackIndex: position.index }, '', location.pathname + location.search)
        position.hash = ''; observed = `${position.index}:`
      }
      const catalogue = runtime.store.getState().showCatalogue()
      await runtime.store.getState().clearLastProject()
      await catalogue
    }
    const acceptPosition = (next: HistoryPosition) => { position = next; void showRoute() }
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
    navigate.current = async (hash, refresh = true) => {
      if (!active) return
      if (hash !== location.hash) {
        position = { index: position.index + 1, hash }
        history.pushState({ easyTrackIndex: position.index }, '', hash || location.pathname + location.search)
        observed = `${position.index}:${hash}`
      }
      if (refresh) await showRoute()
    }
    void showRoute(true)
    addEventListener('popstate', onHistory)
    addEventListener('hashchange', onHistory)
    return () => { active = false; ++request; removeEventListener('popstate', onHistory); removeEventListener('hashchange', onHistory) }
  }, [runtime, requestLeave])

  const navigateToProject = async (id: Id) => { requestLeave(() => navigate.current(routeFor(id))) }
  const navigateToCard = async (projectId: Id, cardId: Id) => { requestLeave(() => navigate.current(routeFor(projectId, cardId))) }
  const navigateToCatalogue = async () => { requestLeave(() => navigate.current('')) }
  const onProjectDeleted = async (id: Id) => { if (routeFromHash()?.projectId === id) await navigate.current('', false) }
  if (restartRequired) return <RestartRequired onRestart={reloadApp} />
  return <><ProjectBoardApp store={runtime.store} navigateToProject={navigateToProject} navigateToCard={navigateToCard} navigateToCatalogue={navigateToCatalogue} onProjectDeleted={onProjectDeleted} registerDraftGuard={registerDraftGuard} requestLeave={requestLeave} onMutationSaved={requestPersistentStorage} /><InstallGuidance /><PwaUpdateRegistration requestUpdate={requestLeave} />
    {pending ? <ActionDialog title={t('unsavedTitle')} onClose={cancelLeave}><p>{t('unsavedHelp')}</p><div className="form-actions"><button ref={stayTrigger} className="button button-secondary" disabled={savingDrafts} onClick={cancelLeave}>{t('stay')}</button><button className="button button-secondary" disabled={savingDrafts} onClick={() => void finishLeave(false)}>{t('discardAndLeave')}</button><button className="button button-primary" disabled={savingDrafts} onClick={() => void finishLeave(true)}>{t('saveAndLeave')}</button></div></ActionDialog> : null}
  </>
}
export function App(props: Parameters<typeof WorkspaceApp>[0]) { return <LocaleProvider><WorkspaceApp {...props} /></LocaleProvider> }
