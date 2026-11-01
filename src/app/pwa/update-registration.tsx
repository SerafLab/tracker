import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaUpdateNotice } from './update-notice'

export function PwaUpdateRegistration({ requestUpdate }: { requestUpdate?: (action: () => Promise<void>) => void }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return <PwaUpdateNotice needRefresh={needRefresh} onUpdate={async () => { if (requestUpdate) requestUpdate(() => updateServiceWorker(true)); else await updateServiceWorker(true) }} onLater={() => setNeedRefresh(false)} />
}
