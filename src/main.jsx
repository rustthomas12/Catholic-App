import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.jsx'
import { toast } from './components/shared/Toast'

function AppWithSWUpdater() {
  useRegisterSW({
    onNeedRefresh() {
      toast.info('App updated — tap to refresh')
    },
    onOfflineReady() {
      console.log('App ready for offline use.')
    },
  })
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppWithSWUpdater />
  </StrictMode>,
)
