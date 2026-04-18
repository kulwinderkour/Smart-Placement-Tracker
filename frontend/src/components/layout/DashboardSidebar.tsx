import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../hooks/use-theme'
import ConfirmActionModal from '../common/ConfirmActionModal'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function Icon({ d, color = "currentColor", size = 18 }: { d: string; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /> },
      { label: 'Job Board', path: '/jobs',      icon: <Icon d="M21 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /> },
      { label: 'Prep Roadmap', path: '/roadmap', icon: <Icon d="M9 18l6-6-6-6" /> },
      { label: 'Question Bank', path: '/questions', icon: <Icon d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V4a2 2 0 012-2h14v13H6.5A2.5 2.5 0 004 17v2.5" /> },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Mock Interviews', path: '/mock-interview', icon: <Icon d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /> },
      { label: 'Resume Analyser', path: '/resume', icon: <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" /> },
      { label: 'Freepad Notebook', path: '/eligibility', icon: <Icon d="M4 4h16v16H4z M8 4v16 M12 8h6 M12 12h6 M12 16h6" /> },
      { label: 'Resource Bookmarks', path: '/bookmarks', icon: <Icon d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /> },
      { label: 'Interview Replay Log', path: '/interview-log', icon: <Icon d="M12 21a9 9 0 100-18 9 9 0 000 18zm-1-12l5 3-5 3V9z" /> },
      { label: 'Interview Scheduler', path: '/placement-pulse', icon: <Icon d="M8 2v4M16 2v4M3 10h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /> },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Settings', path: '/settings', icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15c-.8.8-1.5 1.5-1.5 1.5l-2.5-2.5M4.6 9c.8-.8 1.5-1.5 1.5-1.5l-2.5-2.5" /> },
    ],
  },
]

const HIDE_SCROLLBAR_CSS = `
  .sidebar-scroll::-webkit-scrollbar { display: none; }
  .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const EXPANDED_W = 248
const COLLAPSED_W = 72

export default function DashboardSidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const displayName = profile.fullName || user?.email?.split('@')[0] || 'User'
  const email = user?.email || 'user@example.com'
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() || '').join('')

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }
  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    logout()
    navigate('/landing')
  }
  const sidebarWidth = isOpen ? EXPANDED_W : COLLAPSED_W

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
      <style>{HIDE_SCROLLBAR_CSS}</style>

      <div style={{
        width: sidebarWidth,
        height: '100vh',
        background: 'var(--student-bg)',
        borderRight: '1px solid var(--student-border)',
        color: 'var(--student-text)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        transition: 'width 0.2s ease',
        overflow: 'hidden'
      }}>
        {/* Header/Logo */}
        <div style={{
          padding: isOpen ? '28px 18px 18px' : '24px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          gap: 10,
          minHeight: 80
        }}>
          {isOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(145deg, var(--student-accent), var(--student-accent-hover))', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon d="M22 10v6M2 10l10-5 10 5-10 5" color="white" size={16} />
              </div>
              <span style={{ color: 'var(--student-text)', fontSize: 15, fontWeight: 700, lineHeight: 1 }}>SmartPlacement</span>
            </div>
          ) : (
            <div onClick={onToggle} style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(145deg, var(--student-accent), var(--student-accent-hover))', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon d="M22 10v6M2 10l10-5 10 5-10 5" color="white" size={16} />
            </div>
          )}

          {isOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Theme toggle (Sun / Moon) */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle theme"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--student-surface-hover)',
                  border: '1px solid var(--student-border)',
                  cursor: 'pointer',
                  color: 'var(--student-text-muted)',
                  transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--student-accent)'
                  e.currentTarget.style.borderColor = 'var(--student-accent-border)'
                  e.currentTarget.style.background = 'var(--student-accent-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--student-text-muted)'
                  e.currentTarget.style.borderColor = 'var(--student-border)'
                  e.currentTarget.style.background = 'var(--student-surface-hover)'
                }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                onClick={onToggle}
                title="Toggle sidebar"
                aria-label="Toggle sidebar"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--student-text-muted)', padding: 6 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Theme toggle — visible when sidebar is collapsed */}
        {!isOpen && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 8px' }}>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--student-surface-hover)',
                border: '1px solid var(--student-border)',
                cursor: 'pointer',
                color: 'var(--student-text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="sidebar-scroll" style={{ flex: 1, padding: '18px 0', overflowY: 'auto' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: 14 }}>
              {isOpen && (
                <p style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--student-text-dim)', padding: '8px 18px 10px', margin: 0
                }}>{group.title}</p>
              )}
              {group.items.map(item => (
                <NavItemLink key={item.path} item={item} isActive={location.pathname === item.path} collapsed={!isOpen} />
              ))}
            </div>
          ))}
        </div>

        {/* User Card */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--student-border)', background: 'var(--student-bg)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: isOpen ? 'flex-start' : 'center',
            cursor: 'pointer'
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--student-accent-bg)', color: 'var(--student-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, flexShrink: 0
            }}>
              {initials}
            </div>
            {isOpen && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--student-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--student-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

function NavItemLink({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link to={item.path}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: collapsed ? '12px 0' : '12px 12px',
        margin: '4px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        color: isActive
          ? '#ffffff'
          : hovered
          ? 'var(--student-text)'
          : 'var(--student-text-muted)',
        background: isActive
          ? 'linear-gradient(145deg, var(--student-accent), var(--student-accent-hover))'
          : hovered
          ? 'var(--student-surface-hover)'
          : 'transparent',
        boxShadow: isActive ? '0 8px 16px var(--student-accent-glow)' : 'none'
      }}
    >
      <span style={{ fontSize: 18, display: 'flex', color: 'inherit' }}>{item.icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </>
      )}
    </Link>
  )
}
