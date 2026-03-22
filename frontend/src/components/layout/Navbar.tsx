import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const email = user?.email || 'user@example.com'
  const initials = email.substring(0, 2).toUpperCase()

  const navLinks = [
    { name: 'Jobs', path: '/jobs' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Tracker', path: '/tracker' }
  ]

  const sidebarLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: 'Browse Jobs', path: '/jobs', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { name: 'Tracker', path: '/tracker', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Resume Analyser', path: '/resume', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Settings', path: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false)
      }
    }
    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSidebarOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="bg-white h-[56px] flex items-center justify-center sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="w-full max-w-[1100px] px-[20px] flex justify-between items-center h-full gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
              className="text-gray-500 hover:text-gray-700 focus:outline-none flex items-center justify-center p-1"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-[24px] h-[24px] bg-[#7c3aed] rounded-[6px] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-[14px]">PlacementTracker</span>
            </Link>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-[28px] h-full flex-1">
            {isAuthenticated && navLinks.map(link => {
              const isActive = location.pathname.startsWith(link.path)
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-[13px] font-medium h-[56px] flex items-center border-b-[2px] mb-[-2px] transition-colors ${
                    isActive ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-900'
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
                <span className="text-[12px] text-gray-400 hidden md:block">{email}</span>
                <button onClick={handleLogout} className="text-[12px] text-gray-500 hover:text-[#1e3a5f] font-medium ml-2">Logout</button>
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

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" />
      )}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-[#1e3a5f] shadow-lg z-50 overflow-hidden flex flex-col transition-all duration-250 ease-in-out`}
        style={{ width: isSidebarOpen ? '220px' : '0', transition: 'width 0.25s ease' }}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 h-[56px] w-[220px]">
          <span className="text-white font-semibold text-[14px] truncate flex-1">Menu</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-white/70 hover:text-white shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="flex flex-col py-3 overflow-y-auto w-[220px]">
          {sidebarLinks.map(link => {
            const isActive = location.pathname.startsWith(link.path)
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition-colors ${
                  isActive 
                    ? 'border-l-[3px] border-white bg-white/10 text-white' 
                    : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d={link.icon} />
                </svg>
                <span className="truncate">{link.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
