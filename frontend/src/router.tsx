import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import GoogleCallback from "./pages/Auth/GoogleCallback";
import Navbar from "./components/layout/Navbar";
import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Auth/Login";
import LoginForm from "./pages/Auth/LoginForm";
import Register from "./pages/Auth/Register";
import StudentJobBoard from "./pages/Student/JobBoard";
import Dashboard from "./pages/Student/Dashboard";
import Tracker from "./pages/Student/Tracker";
import ResumeAnalyser from "./pages/Student/ResumeAnalyser";
import MockInterviewSetup from "./pages/Student/MockInterviewSetup";
import MockInterviewRoom from "./pages/Student/MockInterviewRoom";
import Roadmap from "./pages/Student/Roadmap";
import Questions from "./pages/Student/Questions";
import Onboarding from "./pages/Student/Onboarding";
import Profile from "./pages/Student/Profile";
import Skills from "./pages/Student/Skills";
import ManageStudents from "./pages/Admin/ManageStudents";
import ManageCompanies from "./pages/Admin/ManageCompanies";
import CompanyProfileView from "./pages/Admin/CompanyProfileView";
import JobPosting from "./pages/Admin/JobPosting";
import AdminNavbar from "./components/layout/AdminNavbar";
import CompanyProfileForm from "./pages/Company/CompanyProfileForm";
import CompanyOnboardingGate from "./components/company/CompanyOnboardingGate";
import OnboardingPreview from "./pages/Company/OnboardingPreview";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminJobs from "./pages/Admin/AdminJobs";
import AdminApplicants from "./pages/Admin/AdminApplicants";
import AdminInterviews from "./pages/Admin/AdminInterviews";
import AdminAnalytics from "./pages/Admin/AdminAnalytics";
import AdminCompanyProfile from "./pages/Admin/AdminCompanyProfile";
import AdminSettings from "./pages/Admin/AdminSettings";
import FloatingAgent from "./components/FloatingAgent";
import DocumentVault from "./pages/Student/DocumentVault";
import PrepChecklist from "./pages/Student/PrepChecklist";
import ResourceBookmarks from "./pages/Student/ResourceBookmarks";
import InterviewLog from "./pages/Student/InterviewLog";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col w-full">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
      <FloatingAgent />
    </div>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070b18] text-white font-sans flex flex-col w-full selection:bg-blue-500/30">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@400;600;700;800&display=swap');
      `,
        }}
      />
      <AdminNavbar />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role === "admin")
    return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role === "admin") {
    return (
      <Navigate
        to={user.is_onboarding_completed ? "/admin/dashboard" : "/onboarding"}
        replace
      />
    );
  }
  return <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;
  if (user && !user.is_onboarding_completed)
    return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && !user.is_onboarding_completed) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function SmartOnboarding() {
  const { user } = useAuthStore()
  if (user?.role === 'admin') {
    return <CompanyOnboardingGate><CompanyProfileForm /></CompanyOnboardingGate>
  }
  return <ProtectedRoute><Onboarding /></ProtectedRoute>
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/login-form", element: <LoginForm /> },
  { path: "/register", element: <Register /> },
  {
    path: "/",
    element: (
      <Layout>
        <RootRedirect />
      </Layout>
    ),
  },
  {
    path: "/jobs",
    element: (
      <Layout>
        <OnboardingGuard>
          <StudentJobBoard />
        </OnboardingGuard>
      </Layout>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/roadmap",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <Roadmap />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/skills",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <Skills />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/eligibility",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <PrepChecklist />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/bookmarks",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <ResourceBookmarks />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/interview-log",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <InterviewLog />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/questions",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <Questions />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/tracker",
    element: (
      <Layout>
        <OnboardingGuard>
          <Tracker />
        </OnboardingGuard>
      </Layout>
    ),
  },
  {
    path: "/profile",
    element: (
      <Layout>
        <OnboardingGuard>
          <Profile />
        </OnboardingGuard>
      </Layout>
    ),
  },
  {
    path: "/resume",
    element: (
      <Layout>
        <OnboardingGuard>
          <ResumeAnalyser />
        </OnboardingGuard>
      </Layout>
    ),
  },
  {
    path: "/student/document-vault",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <DocumentVault />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/mock-interview",
    element: (
      <OnboardingGuard>
        <DashboardLayout>
          <MockInterviewSetup />
        </DashboardLayout>
      </OnboardingGuard>
    ),
  },
  {
    path: "/mock-interview/room",
    element: (
      <OnboardingGuard>
        <MockInterviewRoom />
      </OnboardingGuard>
    ),
  },
  { path: "/auth/callback", element: <GoogleCallback /> },
  {
    path: "/admin/dashboard",
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/jobs",
    element: (
      <AdminRoute>
        <AdminJobs />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/applicants",
    element: (
      <AdminRoute>
        <AdminApplicants />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/interviews",
    element: (
      <AdminRoute>
        <AdminInterviews />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <AdminRoute>
        <AdminAnalytics />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/company-profile",
    element: (
      <AdminRoute>
        <AdminCompanyProfile />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/settings",
    element: (
      <AdminRoute>
        <AdminSettings />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/students",
    element: (
      <AdminLayout>
        <AdminRoute>
          <ManageStudents />
        </AdminRoute>
      </AdminLayout>
    ),
  },
  {
    path: "/admin/companies",
    element: (
      <AdminLayout>
        <AdminRoute>
          <ManageCompanies />
        </AdminRoute>
      </AdminLayout>
    ),
  },
  {
    path: "/admin/companies/:id",
    element: (
      <AdminLayout>
        <AdminRoute>
          <CompanyProfileView />
        </AdminRoute>
      </AdminLayout>
    ),
  },
  {
    path: "/admin/jobs/post",
    element: (
      <AdminLayout>
        <AdminRoute>
          <JobPosting />
        </AdminRoute>
      </AdminLayout>
    ),
  },
  { path: "/onboarding", element: <SmartOnboarding /> },
  { path: "/onboarding-preview", element: <OnboardingPreview /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
