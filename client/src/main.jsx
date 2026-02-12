import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. 引入 AuthProvider
import { AuthProvider } from './context/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. 用 AuthProvider 包裹 App，这样 App 里的所有组件都能用 AuthContext */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)