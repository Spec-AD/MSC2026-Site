import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/network.js'
import App from './App.jsx'
import './index.css'
// 1. 引入 AuthProvider
import { AuthProvider } from './context/AuthContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import NetworkStatusBanner from './components/NetworkStatusBanner.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. 用 AuthProvider 包裹 App，这样 App 里的所有组件都能用 AuthContext */}
    <AuthProvider>
      <AppErrorBoundary>
        <NetworkStatusBanner />
        <App />
      </AppErrorBoundary>
    </AuthProvider>
  </React.StrictMode>,
)
