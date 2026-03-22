import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import GoogleCallback from './pages/Auth/GoogleCallback'
import Navbar from './components/layout/Navbar'
import Login from './pages/Auth/Login'
import LoginForm from './pages/Auth/LoginForm'
import Register from './pages/Auth/Register'
import JobBoard from './pages/Jobs/JobBoard'
import Dashboard from './pages/Student/Dashboard'
import Tracker from './pages/Student/Tracker'
import ResumeAnalyser from './pages/Student/ResumeAnalyser'

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

export const router = createBrowserRouter([
  { path: '/login',    element: <Login /> },
  { path: '/login-form', element: <LoginForm /> },
  { path: '/register', element: <Register /> },
  {
    path: '/',
    element: <Layout><Navigate to="/dashboard" replace /></Layout>
  },
  {
    path: '/jobs',
    element: <Layout><JobBoard /></Layout>
  },
  {
    path: '/dashboard',
    element: <Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>
  },
  {
    path: '/tracker',
    element: <Layout><ProtectedRoute><Tracker /></ProtectedRoute></Layout>
  },
  {
    path: '/resume',
    element: <Layout><ProtectedRoute><ResumeAnalyser /></ProtectedRoute></Layout>
  },
  {
    path: '/auth/callback',
    element: <GoogleCallback />
  },
])
