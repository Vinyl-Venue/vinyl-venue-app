import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import LandingPage from './LandingPage'
import SignInPage from './SignInPage'
import SignUpPage from './SignUpPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'
import MarketplacePage from './MarketplacePage'
import ProfilePage from './ProfilePage'
import DiscoverPage from './Discoverpage'
import SellerMarketplacePage from './SellerMarketplacePage'
import MessagesInboxPage from './MessagesInboxPage'
import MessageThreadPage from './MessageThreadPage'
import CartPage from './CartPage'
import CheckoutPage from './CheckoutPage'
import TransactionsPage from './Transactionspage'
import BoardPage from './BoardPage'
import BoardTopicPage from './BoardTopicPage'
import SearchResultsPage from './Searchresultspage'
import { useAuth } from './AuthContext'

// Shelf's collection + wishlist management now lives on Profile. This keeps
// /dashboard alive as a redirect rather than a 404, in case anything (e.g.
// the sign-in flow) still navigates there directly.
function DashboardRedirect() {
  const { user } = useAuth()
  return <Navigate to={`/profile/${user.id}`} replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <DiscoverPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesInboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:userId"
            element={
              <ProtectedRoute>
                <MessageThreadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board"
            element={
              <ProtectedRoute>
                <BoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:postId"
            element={
              <ProtectedRoute>
                <BoardTopicPage />
              </ProtectedRoute>
            }
          />
          {/* All three converge on TransactionsPage now — it reads the
              entry path to pick its default tab (Selling for /orders,
              Buying for /purchases, Trade Offers for /trade-offers), so
              existing links/bookmarks to any of the three still land in
              the right place. */}
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade-offers"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId/marketplace"
            element={
              <ProtectedRoute>
                <SellerMarketplacePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App