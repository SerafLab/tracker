import { useCallback, useRef } from 'react'

export function usePersistentStorage() {
  const requested = useRef(false)
  return useCallback(() => {
    if (requested.current || !navigator.storage?.persist) return
    requested.current = true
    void navigator.storage.persist().catch(() => undefined)
  }, [])
}
