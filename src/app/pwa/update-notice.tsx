export function PwaUpdateNotice({ needRefresh, onUpdate, onLater }: { needRefresh: boolean; onUpdate: () => Promise<void>; onLater: () => void }) {
  if (!needRefresh) return null

  return <aside className="pwa-update-notice" role="status" aria-label="Обновление EasyTrack">
    <p>Доступно обновление EasyTrack.</p>
    <div className="form-actions">
      <button className="button button-primary" onClick={() => void onUpdate()}>Обновить</button>
      <button className="button button-secondary" onClick={onLater}>Позже</button>
    </div>
  </aside>
}
