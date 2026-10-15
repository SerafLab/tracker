export function RestartRequired({ onRestart }: { onRestart: () => void }) {
  return <main className="app-shell"><section className="unavailable-state surface-card"><h1>Нужно перезапустить EasyTrack</h1><p role="alert">Приложение обновило локальное хранилище в другой вкладке. Чтобы продолжить безопасно работать с проектами, перезапустите EasyTrack.</p><button className="button button-primary" onClick={onRestart}>Перезапустить</button></section></main>
}
