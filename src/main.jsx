import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import PinGate from './components/PinGate.jsx'
import './i18n/config.js'
import './index.css'

// registerType: 'autoUpdate' makes this apply a new service worker the
// moment one is found and reload the page to match — no more manual
// "clear site data" every deploy. Re-checking on an interval matters most
// for installed/standalone PWAs, which don't reliably re-run this on reopen.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PinGate>
      <App />
    </PinGate>
  </React.StrictMode>
)
