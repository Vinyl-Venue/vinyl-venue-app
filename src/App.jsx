import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import LandingPage from './LandingPage'
import SignInPage from './SignInPage'
import SignUpPage from './SignUpPage'
import DashboardPage from './DashboardPage'
import WishlistPage from './WishlistPage'
import StatsPage from './StatsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App