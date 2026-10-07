import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import './styles.css'

export { App } from './app/app'

const root = document.getElementById('root')
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>)
