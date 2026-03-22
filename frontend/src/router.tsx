import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import GoogleCallback from './pages/Auth/GoogleCallback'
import Navbar from './components/layout/Navbar'
import DashboardLayout from './components/layout/DashboardLayout'
import Login from './pages/Auth/Login'
import LoginForm from './pages/Auth/LoginForm'
import Register from './pages/Auth/Register'
import JobBoard from './pages/Jobs/JobBoard'
import Dashboard from './pages/Student/Dashboard'
import Tracker from './pages/Student/Tracker'
import ResumeAnalyser from './pages/Student/ResumeAnalyser'
import Onboarding from './pages/Student/Onboarding'
import Profile from './pages/Student/Profile'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f4f8] font-sans">
      <div className="w-full min-h-screen relative shadow-sm bg-[#f4f4f8] flex flex-col">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()

  // Check per-user key first, then the generic fallback key
  const userKey = user ? `onboardingComplete_${user.id}` : null
  const onboardingDone =
    (userKey && localStorage.getItem(userKey) === 'true') ||
    localStorage.getItem('onboardingComplete') === 'true'

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!onboardingDone) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login',    element: <Login /> },
  { path: '/login-form', element: <LoginForm /> },
  { path: '/register', element: <Register /> },
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/jobs',
    element: <Layout><OnboardingGuard><JobBoard /></OnboardingGuard></Layout>
  },
  {
    // Dashboard uses PlaceMe-style sidebar layout — no top Navbar
    path: '/dashboard',
    element: <OnboardingGuard><DashboardLayout><Dashboard /></DashboardLayout></OnboardingGuard>
  },
  {
    path: '/tracker',
    element: <Layout><OnboardingGuard><Tracker /></OnboardingGuard></Layout>
  },
  {
    path: '/resume',
    element: <Layout><OnboardingGuard><ResumeAnalyser /></OnboardingGuard></Layout>
  },
  {
    path: '/profile',
    element: <Layout><OnboardingGuard><Profile /></OnboardingGuard></Layout>
  },
  {
    path: '/auth/callback',
    element: <GoogleCallback />
  },
  {
    path: '/onboarding',
    element: <ProtectedRoute><Onboarding /></ProtectedRoute>
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
])
