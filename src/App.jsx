import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import LandingPage from './LandingPage'
import SignInPage from './SignInPage'
import SignUpPage from './SignUpPage'
import NotFoundPage from './NotFoundPage'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from './AuthContext'

// Each page below is its own chunk, downloaded when its route is first
// visited, so the first load only ships the landing, sign-in and sign-up pages.
const ForgotPasswordPage = lazy(() => import('./ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./ResetPasswordPage'))
const MarketplacePage = lazy(() => import('./MarketplacePage'))
const ProfilePage = lazy(() => import('./ProfilePage'))
const DiscoverPage = lazy(() => import('./DiscoverPage'))
const SellerMarketplacePage = lazy(() => import('./SellerMarketplacePage'))
const MessagesInboxPage = lazy(() => import('./MessagesInboxPage'))
const MessageThreadPage = lazy(() => import('./MessageThreadPage'))
const CartPage = lazy(() => import('./CartPage'))
const CheckoutPage = lazy(() => import('./CheckoutPage'))
const TransactionsPage = lazy(() => import('./TransactionsPage'))
const BoardPage = lazy(() => import('./BoardPage'))
const BoardTopicPage = lazy(() => import('./BoardTopicPage'))
const SearchResultsPage = lazy(() => import('./SearchResultsPage'))
const ActivityPage = lazy(() => import('./ActivityPage'))
const DigestPage = lazy(() => import('./DigestPage'))
const TermsPage = lazy(() => import('./TermsPage'))
const PrivacyPage = lazy(() => import('./PrivacyPage'))
const RulesPage = lazy(() => import('./RulesPage'))
const AdminReportsPage = lazy(() => import('./AdminReportsPage'))

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
        <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-bg" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/rules" element={<RulesPage />} />
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
            path="/activity"
            element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/digest"
            element={
              <ProtectedRoute>
                <DigestPage />
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App