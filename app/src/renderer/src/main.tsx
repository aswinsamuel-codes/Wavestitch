import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Collect renderer errors (read by the developer self-test).
const errs: string[] = ((window as unknown as { __aosErrors: string[] }).__aosErrors = [])
window.addEventListener('error', (e) => errs.push(String(e.message)))
window.addEventListener('unhandledrejection', (e) => errs.push(String((e.reason as Error)?.message ?? e.reason)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
