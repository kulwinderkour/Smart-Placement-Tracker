import { useState } from 'react'
import SmartPlacementLogo from '../common/SmartPlacementLogo'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import ConfirmActionModal from '../common/ConfirmActionModal'

export default function AdminNavbar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const email = user?.email || 'admin@example.com'
  const initials = email.substring(0, 2).toUpperCase()

  const navLinks = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Students', path: '/admin/students' },
    { name: 'Jobs', path: '/admin/jobs' },
    { name: 'Companies', path: '/admin/companies' }
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
      <nav className="h-[72px] flex items-center justify-center sticky top-0 z-40 bg-[#070b18]/80 backdrop-blur-[20px] border-b border-white/10">
        <div className="w-full max-w-[1400px] px-6 sm:px-10 flex justify-between items-center h-full">
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
              className="md:hidden text-white/70 hover:text-white"
              aria-label="Open menu"
              title="Open menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <SmartPlacementLogo size={30} />
              <span className="font-['Sora'] font-extrabold text-white text-[18px] tracking-tight">SmartPlacement</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Admin</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {navLinks.map(link => {
              const isActive = location.pathname.startsWith(link.path)
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    isActive ? 'bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/20' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-[13px] font-bold text-white">{email}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#7c3aed] border border-white/20 flex items-center justify-center text-white text-xs font-bold shadow-lg">
              {initials}
            </div>
            <button onClick={handleLogout} className="text-sm font-bold text-white/50 hover:text-white transition-colors ml-2 hidden sm:block">Logout</button>
          </div>
        </div>
      </nav>

      {/* Basic Mobile Overlay Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-[#070b18]/95 backdrop-blur-md z-50 flex flex-col p-8 md:hidden">
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-white"
              aria-label="Close menu"
              title="Close menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="flex flex-col gap-6 text-xl font-['Sora'] font-bold text-white">
            {navLinks.map(l => (
              <Link key={l.name} to={l.path} onClick={() => setIsSidebarOpen(false)}>{l.name}</Link>
            ))}
            <button onClick={handleLogout} className="text-left text-red-400 mt-auto">Logout</button>
          </div>
        </div>
      )}
    </>
  )
}
