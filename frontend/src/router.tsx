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
import ManageStudents from './pages/Admin/ManageStudents'
import ManageCompanies from './pages/Admin/ManageCompanies'
import CompanyProfileView from './pages/Admin/CompanyProfileView'
import JobPosting from './pages/Admin/JobPosting'
import AdminNavbar from './components/layout/AdminNavbar'
import CompanyProfileForm from './pages/Company/CompanyProfileForm'
import CompanyOnboardingGate from './components/company/CompanyOnboardingGate'
import OnboardingPreview from './pages/Company/OnboardingPreview'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminJobs from './pages/Admin/AdminJobs'
import AdminApplicants from './pages/Admin/AdminApplicants'
import AdminInterviews from './pages/Admin/AdminInterviews'
import AdminAnalytics from './pages/Admin/AdminAnalytics'
import AdminCompanyProfile from './pages/Admin/AdminCompanyProfile'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col w-full">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
    </div>
  )
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070b18] text-white font-sans flex flex-col w-full selection:bg-blue-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@400;600;700;800&display=swap');
      `}} />
      <AdminNavbar />
      <main className="flex-1 w-full">{children}</main>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && user.role === 'admin') {
    return (
      <Navigate
        to={user.is_onboarding_completed ? '/admin/dashboard' : '/onboarding'}
        replace
      />
    )
  }
  return <Navigate to="/dashboard" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  if (user && !user.is_onboarding_completed) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AdminPageRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  if (user && !user.is_onboarding_completed) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login',    element: <Login /> },
  { path: '/login-form', element: <LoginForm /> },
  { path: '/register', element: <Register /> },
  {
    path: '/',
    element: <Layout><RootRedirect /></Layout>
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
    path: '/student-dashboard',
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
  {
    path: '/admin/dashboard',
    element: <AdminPageRoute><AdminDashboard /></AdminPageRoute>
  },
  {
    path: '/admin-dashboard',
    element: <AdminPageRoute><AdminDashboard /></AdminPageRoute>
  },
  {
    path: '/admin/jobs',
    element: <AdminPageRoute><AdminJobs /></AdminPageRoute>
  },
  {
    path: '/admin/applicants',
    element: <AdminPageRoute><AdminApplicants /></AdminPageRoute>
  },
  {
    path: '/admin/interviews',
    element: <AdminPageRoute><AdminInterviews /></AdminPageRoute>
  },
  {
    path: '/admin/analytics',
    element: <AdminPageRoute><AdminAnalytics /></AdminPageRoute>
  },
  {
    path: '/admin/company-profile',
    element: <AdminPageRoute><AdminCompanyProfile /></AdminPageRoute>
  },
  {
    path: '/admin/students',
    element: <AdminLayout><AdminRoute><ManageStudents /></AdminRoute></AdminLayout>
  },
  {
    path: '/admin/companies',
    element: <AdminLayout><AdminRoute><ManageCompanies /></AdminRoute></AdminLayout>
  },
  {
    path: '/admin/companies/:id',
    element: <AdminLayout><AdminRoute><CompanyProfileView /></AdminRoute></AdminLayout>
  },
  {
    path: '/admin/jobs/post',
    element: <AdminLayout><AdminRoute><JobPosting /></AdminRoute></AdminLayout>
  },
  {
    path: '/onboarding',
    element: <CompanyOnboardingGate><CompanyProfileForm /></CompanyOnboardingGate>
  },
  {
    path: '/onboarding-preview',
    element: <OnboardingPreview />
  },
])
