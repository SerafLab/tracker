import { LocaleProvider } from '../i18n/provider'
import { useEffect, useRef, useState } from 'react'
import { createProjectBoardStore, createProjectBoardUseCases, DexieProjectBoardRepository, ProjectBoardApp, ProjectBoardDatabase, type Id, type ProjectBoardRepository } from '../features/project-board'
import { InstallGuidance } from './pwa/install-guidance'
import { PwaUpdateRegistration } from './pwa/update-registration'
import { usePersistentStorage } from './pwa/persistent-storage'
import { RestartRequired } from './pwa/restart-required'

const routeFor = (id: Id) => `#project/${encodeURIComponent(id)}`
const projectIdFromHash = (): Id | undefined => {
  const match = location.hash.match(/^#project\/([^/]+)$/)
  try { return match ? decodeURIComponent(match[1]) : undefined }
  catch { return undefined }
}

function WorkspaceApp({ repository: suppliedRepository, databaseName, reloadApp = () => location.reload() }: { repository?: ProjectBoardRepository; databaseName?: string; reloadApp?: () => void }) {
  const requestPersistentStorage = usePersistentStorage()
  const staleConnection = useRef(false)
  const [restartRequired, setRestartRequired] = useState(false)
  const [runtime] = useState(() => {
    const database = suppliedRepository ? undefined : new ProjectBoardDatabase(databaseName, () => { staleConnection.current = true; setRestartRequired(true) })
    const repository = suppliedRepository ?? new DexieProjectBoardRepository(database!)
    const useCases = createProjectBoardUseCases({ repository, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
    return { useCases, store: createProjectBoardStore(useCases, () => !staleConnection.current) }
  })


  useEffect(() => {
    let active = true
    let request = 0
    const storageReady = runtime.store.getState().openStorage()
    const showRoute = async (restoreLastProject = false) => {
      const startedAt = ++request
      const isCurrent = () => active && request === startedAt
      if (!await storageReady || !isCurrent()) return
      let id = projectIdFromHash()
      if (!id && restoreLastProject) {
        try {
          id = (await runtime.useCases.preference())?.lastProjectId
        } catch {
          // A failed preference read should still allow opening the catalogue.
        }
        if (!isCurrent()) return
        if (id) history.replaceState(null, '', routeFor(id))
      }
      if (id) {
        const shown = await runtime.store.getState().showBoard(id, true)
        if (shown || !isCurrent()) return
        history.replaceState(null, '', location.pathname + location.search)
      }
      const catalogue = runtime.store.getState().showCatalogue()
      await runtime.store.getState().clearLastProject()
      await catalogue
    }
    const onHashChange = () => { void showRoute() }
    void showRoute(true)
    addEventListener('hashchange', onHashChange)
    return () => { active = false; ++request; removeEventListener('hashchange', onHashChange) }
  }, [runtime])

  const navigateToProject = async (id: Id) => {
    location.hash = routeFor(id)
  }
  const navigateToCatalogue = async () => {
    location.hash = ''
  }
  if (restartRequired) return <RestartRequired onRestart={reloadApp} />
  return <><ProjectBoardApp store={runtime.store} navigateToProject={navigateToProject} navigateToCatalogue={navigateToCatalogue} onMutationSaved={requestPersistentStorage} /><InstallGuidance /><PwaUpdateRegistration /></>
}

export function App(props: Parameters<typeof WorkspaceApp>[0]) {
  return <LocaleProvider><WorkspaceApp {...props} /></LocaleProvider>
}
