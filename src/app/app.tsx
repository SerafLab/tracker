import { useEffect, useState } from 'react'
import { createProjectBoardStore, createProjectBoardUseCases, DexieProjectBoardRepository, ProjectBoardApp, ProjectBoardDatabase, type Id, type ProjectBoardRepository } from '../features/project-board'

const routeFor = (id: Id) => `#project/${encodeURIComponent(id)}`
const projectIdFromHash = (): Id | undefined => {
  const match = location.hash.match(/^#project\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export function App({ repository: suppliedRepository }: { repository?: ProjectBoardRepository }) {
  const [runtime] = useState(() => {
    const repository = suppliedRepository ?? new DexieProjectBoardRepository(new ProjectBoardDatabase())
    const useCases = createProjectBoardUseCases({ repository, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
    return { useCases, store: createProjectBoardStore(useCases) }
  })

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
  return <ProjectBoardApp store={runtime.store} navigateToProject={navigateToProject} navigateToCatalogue={navigateToCatalogue} />
}
