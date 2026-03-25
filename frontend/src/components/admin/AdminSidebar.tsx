import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, Briefcase, Users, CalendarDays,
  BarChart2, Building2, Settings, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'

const NAV = [
  { path: '/admin/dashboard',       label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/admin/jobs',            label: 'Jobs',           icon: Briefcase },
  { path: '/admin/applicants',      label: 'Applicants',     icon: Users },
  { path: '/admin/interviews',      label: 'Interviews',     icon: CalendarDays },
  { path: '/admin/analytics',       label: 'Analytics',      icon: BarChart2 },
  { path: '/admin/company-profile', label: 'Company Profile',icon: Building2 },
  { path: '/admin/settings',        label: 'Settings',       icon: Settings },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function AdminSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation()
  const { logout, user } = useAuthStore()

  return (
    <aside
      className="flex flex-col h-full bg-white border-r border-[#E2E8F0] transition-all duration-300 select-none"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center h-[60px] px-4 border-b border-[#E2E8F0] gap-3 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
          <LayoutDashboard size={16} color="white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-[15px] text-[#0F172A] truncate">SmartPlacement</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + '/')
          return (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={[
                'flex items-center gap-3 mx-2 mb-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
              ].join(' ')}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user + collapse toggle */}
      <div className="border-t border-[#E2E8F0] p-3 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-[#F8FAFC] mb-1">
            <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user?.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#0F172A] truncate">{user?.email}</p>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Admin</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logout()}
          title="Logout"
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
