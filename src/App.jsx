import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingPage from './LandingPage'
import SignInPage from './SignInPage'
import SignUpPage from './SignUpPage'
import DashboardPage from './DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App