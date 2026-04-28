import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import SignInPage from './components/SignIn.jsx' // Changed this line

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SignInPage />
  </StrictMode>,
)