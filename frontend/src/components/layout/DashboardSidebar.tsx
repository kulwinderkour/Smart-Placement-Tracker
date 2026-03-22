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

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard',       path: '/dashboard', icon: <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /> },
      { label: 'Job Board',       path: '/jobs',      icon: <Icon d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /> },
      { label: 'Prep Roadmap',    path: '/roadmap',   icon: <Icon d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" /> },
      { label: 'Question Bank',   path: '/questions', icon: <Icon d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V4a2 2 0 012-2h14v13H6.5A2.5 2.5 0 004 17v2.5" /> },
      { label: 'Mock Interviews',  path: '/mock',     icon: <Icon d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.893L15 14M4 8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2v-4a2 2 0 00-2-2H4z" /> },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Skill Analyzer',     path: '/skills',      icon: <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /> },
      { label: 'Eligibility Filter',  path: '/eligibility', icon: <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /> },
      { label: 'Aptitude Streaks',   path: '/streaks',     icon: <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /> },
      { label: 'Salary Calculator',  path: '/salary',      icon: <Icon d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M13 3h8m0 0v8m0-8L11 13" /> },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Nudges & Alerts', path: '/alerts',    icon: <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /> },
      { label: 'Celebrations',    path: '/celebrate', icon: <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /> },
      { label: 'Settings',        path: '/settings',  icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /> },
    ],
  },
]

// ── Hide scrollbar CSS ────────────────────────────────────────────────────────
const HIDE_SCROLLBAR_CSS = `
  .sidebar-scroll::-webkit-scrollbar { display: none; }
  .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`

// ── Tooltip on icon-only items ────────────────────────────────────────────────
function NavItemLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      to={item.path}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px 0' : '10px 16px',
        margin: collapsed ? '2px 6px' : '2px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: isActive && !collapsed ? '0 8px 8px 0' : 8,
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? '#20c997' : hovered ? 'white' : 'rgba(255,255,255,0.6)',
        background: isActive
          ? 'rgba(32,201,151,0.12)'
          : hovered
          ? 'rgba(255,255,255,0.06)'
          : 'transparent',
        borderLeft: !collapsed && isActive ? '3px solid #20c997' : !collapsed ? '3px solid transparent' : 'none',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
      {!collapsed && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
      )}

      {/* Tooltip when collapsed */}
      {collapsed && hovered && (
        <div
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: 10,
            background: '#1e293b',
            color: 'white',
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 12px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 999,
            pointerEvents: 'none',
          }}
        >
          {item.label}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              left: -4,
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#1e293b',
            }}
          />
        </div>
      )}
    </Link>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const EXPANDED_W = 240
const COLLAPSED_W = 62

export default function DashboardSidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const displayName = profile.fullName || user?.email?.split('@')[0] || 'User'
  const email = user?.email || 'user@example.com'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase() || '')
    .join('')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarWidth = isOpen ? EXPANDED_W : COLLAPSED_W

  return (
    <>
      <style>{HIDE_SCROLLBAR_CSS}</style>

      <div
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: '100vh',
          background: '#0f1f35',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* ── Header: Logo + Hamburger toggle ── */}
        <div
          style={{
            padding: isOpen ? '20px 20px 16px' : '20px 0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'space-between' : 'center',
            flexShrink: 0,
            gap: 10,
            minHeight: 64,
          }}
        >
          {/* Logo group */}
          {isOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #20c997 0%, #0ea5e9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <span style={{ color: 'white', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                SmartPlacement
              </span>
            </div>
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #20c997 0%, #0ea5e9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
          )}

          {/* Hamburger toggle button (3 lines) */}
          {isOpen && (
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Hamburger at top-center when collapsed */}
        {!isOpen && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', flexShrink: 0 }}>
            <button
              onClick={onToggle}
              title="Expand sidebar"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                width: 32,
                height: 32,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Nav Groups ── */}
        <div className="sidebar-scroll" style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title} style={{ marginBottom: 4 }}>
              {/* Section label — hidden when collapsed */}
              {isOpen && (
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'rgba(255,255,255,0.3)',
                    padding: '10px 20px 6px',
                    margin: 0,
                  }}
                >
                  {group.title}
                </p>
              )}
              {/* Thin divider when collapsed to hint grouping */}
              {!isOpen && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 12px' }} />
              )}

              {group.items.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <NavItemLink
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    collapsed={!isOpen}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* ── User Profile Bottom ── */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: isOpen ? '16px 20px' : '16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'flex-start' : 'center',
            gap: isOpen ? 10 : 0,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #20c997, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              cursor: isOpen ? 'default' : 'pointer',
            }}
            title={!isOpen ? displayName : undefined}
          >
            {initials || 'U'}
          </div>

          {isOpen && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'color 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
