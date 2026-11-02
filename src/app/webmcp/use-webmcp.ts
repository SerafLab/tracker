import { useEffect, useRef } from 'react'
import type { RuntimeDependencies } from './runtime'
import type { NativeModelContext, registerPageTools } from './registration'

export function useWebMcp(dependencies: RuntimeDependencies, lifetimeKey: boolean) {
  const current = useRef(dependencies)
  current.current = dependencies
  useEffect(() => {
    const context = (document as Document & { modelContext?: NativeModelContext }).modelContext
    if (typeof context?.registerTool !== 'function') return
    let active = true, generation = 0
    let attempt: ReturnType<typeof registerPageTools> | undefined
    const stop = () => { ++generation; attempt?.stop(); attempt = undefined }
    const start = async () => {
      stop()
      const token = generation
      // Ordinary UI does not download validation/registration code when native tools are unavailable.
      const [{ createToolRuntime }, { registerPageTools }] = await Promise.all([import('./runtime'), import('./registration')])
      if (!active || token !== generation) return
      const runtime = createToolRuntime({ state: () => current.current.state(), route: () => current.current.route(), guard: (tool, input) => current.current.guard(tool, input), execute: (tool, input) => current.current.execute(tool, input) })
      attempt = registerPageTools(context, runtime)
    }
    const restore = (event: PageTransitionEvent) => { if (event.persisted) void start().catch(stop) }
    void start().catch(stop)
    addEventListener('pagehide', stop)
    addEventListener('pageshow', restore)
    return () => { active = false; stop(); removeEventListener('pagehide', stop); removeEventListener('pageshow', restore) }
  }, [lifetimeKey])
}
