import { useEffect, useRef, useState } from 'react'
import { createProjectBoardStore, createProjectBoardUseCases, DexieProjectBoardRepository, ProjectBoardApp, ProjectBoardDatabase, type Id, type ProjectBoardRepository } from '../features/project-board'
import { InstallGuidance } from './pwa/install-guidance'
import { PwaUpdateRegistration } from './pwa/update-registration'
import { usePersistentStorage } from './pwa/persistent-storage'
import { RestartRequired } from './pwa/restart-required'

const routeFor = (id: Id) => `#project/${encodeURIComponent(id)}`
const appTitle = 'EasyTrack — трекер личных проектов'
const projectIdFromHash = (): Id | undefined => {
  const match = location.hash.match(/^#project\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export function App({ repository: suppliedRepository, databaseName, reloadApp = () => location.reload() }: { repository?: ProjectBoardRepository; databaseName?: string; reloadApp?: () => void }) {
  const requestPersistentStorage = usePersistentStorage()
  const staleConnection = useRef(false)
  const [restartRequired, setRestartRequired] = useState(false)
  const [runtime] = useState(() => {
    const database = suppliedRepository ? undefined : new ProjectBoardDatabase(databaseName, () => { staleConnection.current = true; setRestartRequired(true) })
    const repository = suppliedRepository ?? new DexieProjectBoardRepository(database!)
    const useCases = createProjectBoardUseCases({ repository, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
    return { useCases, store: createProjectBoardStore(useCases, () => !staleConnection.current) }
  })

  useEffect(() => { document.title = appTitle }, [])

  useEffect(() => {
    let active = true
    const showRoute = async () => {
      const id = projectIdFromHash()
      if (id) {
        const shown = await runtime.store.getState().showBoard(id, true)
        if (!shown && active) {
          location.hash = ''
          await runtime.store.getState().showCatalogue()
        }
        return
      }
      const lastProjectId = (await runtime.useCases.preference())?.lastProjectId
      if (lastProjectId && await runtime.useCases.board(lastProjectId)) {
        location.hash = routeFor(lastProjectId)
        return
      }
      await runtime.store.getState().showCatalogue()
    }
    const start = async () => {
      if (await runtime.store.getState().openStorage()) {
        try { await showRoute() }
        catch { await runtime.store.getState().showCatalogue() }
      }
    }
    const onHashChange = () => { void showRoute().catch(() => runtime.store.getState().showCatalogue()) }
    void start()
    addEventListener('hashchange', onHashChange)
    return () => { active = false; removeEventListener('hashchange', onHashChange) }
  }, [runtime])

  const navigateToProject = async (id: Id) => {
    location.hash = routeFor(id)
    if (projectIdFromHash() === id) await runtime.store.getState().showBoard(id, true)
  }
  const navigateToCatalogue = async () => {
    if (!await runtime.store.getState().clearLastProject()) return
    location.hash = ''
    await runtime.store.getState().showCatalogue()
  }
  if (restartRequired) return <RestartRequired onRestart={reloadApp} />
  return <><ProjectBoardApp store={runtime.store} navigateToProject={navigateToProject} navigateToCatalogue={navigateToCatalogue} onMutationSaved={requestPersistentStorage} /><InstallGuidance /><PwaUpdateRegistration /></>
}
