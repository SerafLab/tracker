import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <main className="app-shell" data-testid="tracker-app-shell">
      <h1>Трекер личных проектов</h1>
      <p>Стартовая версия приложения опубликована и готова к развитию.</p>
    </main>
  )
}

const root = document.getElementById('root')

if (!root) {
  throw new Error('Application root is missing')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
