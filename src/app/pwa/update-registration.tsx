import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaUpdateNotice } from './update-notice'

export function PwaUpdateRegistration() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return <PwaUpdateNotice needRefresh={needRefresh} onUpdate={() => updateServiceWorker(true)} onLater={() => setNeedRefresh(false)} />
}
