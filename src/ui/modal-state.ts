import { useSyncExternalStore } from 'react'

let modalCount = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const snapshot = () => modalCount > 0
const notify = () => { listeners.forEach(listener => listener()) }

export function registerModal() {
  modalCount++
  notify()
  return () => { modalCount--; notify() }
}

export function useModalOpen() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
