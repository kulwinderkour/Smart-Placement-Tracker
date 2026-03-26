import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function Icon({ d, color = "#7d8590", size = 18 }: { d: string; color?: string; size?: number }) {
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
      { label: 'Skill Analyzer', path: '/skills', icon: <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /> },
      { label: 'Eligibility Filter', path: '/eligibility', icon: <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /> },
      { label: 'Aptitude Streaks', path: '/streaks', icon: <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /> },
      { label: 'Salary Calculator', path: '/salary', icon: <Icon d="M9 3h12a2 2 0 012 2v12a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2zM4 7h1v10H4zM2 9h1v6H2z" /> },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Nudges & Alerts', path: '/alerts', icon: <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /> },
      { label: 'Celebrations', path: '/celebrate', icon: <Icon d="M20 12l-8 8-4-4" /> },
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

const EXPANDED_W = 220
const COLLAPSED_W = 62

export default function DashboardSidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const displayName = profile.fullName || user?.email?.split('@')[0] || 'User'
  const email = user?.email || 'user@example.com'
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() || '').join('')

  const handleLogout = () => { logout(); navigate('/login') }
  const sidebarWidth = isOpen ? EXPANDED_W : COLLAPSED_W

  return (
    <>
      <style>{HIDE_SCROLLBAR_CSS}</style>

      <div style={{
        width: sidebarWidth,
        height: '100vh',
        background: '#0d1117',
        borderRight: '1px solid #21262d',
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
          padding: isOpen ? '24px 18px 16px' : '24px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          gap: 10,
          minHeight: 80
        }}>
          {isOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#20c997', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon d="M22 10v6M2 10l10-5 10 5-10 5" color="white" size={16} />
              </div>
              <span style={{ color: '#e6edf3', fontSize: 14, fontWeight: 600 }}>SmartPlacement</span>
            </div>
          ) : (
            <div onClick={onToggle} style={{
              width: 28, height: 28, borderRadius: 6,
              background: '#20c997', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon d="M22 10v6M2 10l10-5 10 5-10 5" color="white" size={16} />
            </div>
          )}

          {isOpen && (
            <button onClick={onToggle} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#484f58' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="sidebar-scroll" style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: 16 }}>
              {isOpen && (
                <p style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: '#484f58', padding: '12px 18px 6px', margin: 0
                }}>{group.title}</p>
              )}
              {group.items.map(item => (
                <NavItemLink key={item.path} item={item} isActive={location.pathname === item.path} collapsed={!isOpen} />
              ))}
            </div>
          ))}
        </div>

        {/* User Card */}
        <div style={{ padding: '16px', borderTop: '1px solid #21262d' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: isOpen ? 'flex-start' : 'center',
            cursor: 'pointer'
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#20c99718', color: '#20c997',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, flexShrink: 0
            }}>
              {initials}
            </div>
            {isOpen && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#7d8590', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
            )}
            {isOpen && (
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
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
        padding: collapsed ? '10px 0' : '8px 14px',
        margin: '2px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 6,
        fontSize: 13,
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        color: isActive || hovered ? '#e6edf3' : '#7d8590',
        background: isActive || hovered ? '#161b22' : 'transparent',
        borderLeft: !collapsed && isActive ? '2px solid #20c997' : '2px solid transparent'
      }}
    >
      <span style={{ fontSize: 18, color: isActive ? '#20c997' : 'inherit' }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}
