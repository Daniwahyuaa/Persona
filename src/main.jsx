import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SelectedEmployeeProvider } from './context/SelectedEmployeeContext.jsx'
import { TalentPointSystemProvider } from './context/TalentPointSystemContext.jsx'

import './styles/theme.css'
import './styles/base.css'
import './styles/login.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SelectedEmployeeProvider>
          <TalentPointSystemProvider>
            <App />
          </TalentPointSystemProvider>
        </SelectedEmployeeProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
