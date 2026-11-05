import { useEffect, useState } from 'react'

let updateReady = false
const listeners = new Set<(ready: boolean) => void>()

/** Lets app tests show the update offer that `virtual:pwa-register/react` would raise. */
export function simulateUpdateReady(ready = true) { updateReady = ready; listeners.forEach(listener => listener(ready)) }

export function useRegisterSW() {
  const [needRefresh, setNeedRefresh] = useState(updateReady)
  const [offlineReady, setOfflineReady] = useState(false)
  useEffect(() => { listeners.add(setNeedRefresh); return () => { listeners.delete(setNeedRefresh) } }, [])
  return { needRefresh: [needRefresh, setNeedRefresh] as const, offlineReady: [offlineReady, setOfflineReady] as const, updateServiceWorker: async () => undefined }
}
