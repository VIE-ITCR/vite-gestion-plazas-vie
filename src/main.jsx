import { StrictMode } from 'react'
  import { createRoot } from 'react-dom/client'
  import { App } from './App.jsx'
  import { initInactivityListener } from './auth'

  initInactivityListener()

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
