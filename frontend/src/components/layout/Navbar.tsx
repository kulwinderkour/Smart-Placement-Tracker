import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'
import ConfirmActionModal from '../common/ConfirmActionModal'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const email = user?.email || 'user@example.com'
  const initials = email.substring(0, 2).toUpperCase()

  const navLinks = user?.role === 'admin' ? [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Students', path: '/admin/students' },
    { name: 'Jobs', path: '/admin/jobs' }
  ] : [
    { name: 'Jobs', path: '/jobs' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Questions', path: '/questions' },
    { name: 'Roadmap', path: '/roadmap' },
    { name: 'Tracker', path: '/tracker' }
  ]

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    logout()
    navigate('/landing')
  }

  return (
    <>
      <ConfirmActionModal
        isOpen={showLogoutConfirm}
        title="Sign out"
        message="Do you want to exit?"
        confirmText="Yes"
        cancelText="No"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <nav className="h-[56px] flex items-center justify-start sticky top-0 z-40" style={{background: '#0d1117', borderBottom: '1px solid #21262d'}}>
        <div className="w-full px-[20px] flex justify-between items-center h-full gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-[24px] h-[24px] bg-[#7c3aed] rounded-[6px] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <span className="font-semibold text-[14px]" style={{color: '#e6edf3'}}>PlacementTracker</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center justify-start gap-[28px] h-full flex-1 ml-6">
          {isAuthenticated && navLinks.map(link => {
            const isActive = location.pathname.startsWith(link.path)
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`text-[13px] font-medium h-[56px] flex items-center border-b-[2px] mb-[-2px] transition-colors ${
                  isActive ? 'border-[#20c997] text-[#e6edf3]' : 'border-transparent text-[#7d8590] hover:text-[#e6edf3]'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          {isAuthenticated ? (
            <>
              <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white font-medium text-[11px] flex items-center justify-center">
                {initials}
              </div>
              <span className="text-[12px] hidden md:block" style={{color: '#7d8590'}}>{email}</span>
              <button onClick={handleLogout} className="text-[12px] font-medium ml-2" style={{color: '#7d8590'}}>Logout</button>
            </>
          ) : (
            <div className="flex gap-4 items-center">
              <Link to="/login" className="text-[13px] text-gray-600 hover:text-gray-900 font-medium">Login</Link>
              <Link to="/register" className="text-[13px] text-[#7c3aed] hover:text-purple-700 font-medium">Sign Up</Link>
            </div>
          )}
        </div>
        </div>
      </nav>
    </>
  )
}
