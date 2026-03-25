import { useState } from 'react'
import { Bell, Search, ChevronDown, User, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useCompanyProfileStore } from '../../store/companyProfileStore'

export default function AdminTopBar() {
  const { user, logout } = useAuthStore()
  const { profile } = useCompanyProfileStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const companyName = profile?.company_name ?? 'Company'
  const initials = (user?.email?.[0] ?? 'A').toUpperCase()

  return (
    <header className="h-[60px] flex items-center justify-between px-6 bg-white border-b border-[#E2E8F0] flex-shrink-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 w-64 max-w-full">
        <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
        <input
          type="text"
          placeholder="Search jobs, applicants..."
          className="bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none w-full"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#3B82F6] hover:border-[#BFDBFE] transition-all">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3B82F6]" />
        </button>

        {/* Avatar + Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-[#0F172A] leading-tight">{companyName}</p>
              <p className="text-[10px] text-[#94A3B8] leading-tight">Admin</p>
            </div>
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-lg z-50 py-1.5 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#F1F5F9]">
                  <p className="text-xs font-semibold text-[#0F172A] truncate">{user?.email}</p>
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Administrator</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/admin/company-profile') }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC] transition-colors"
                >
                  <User size={14} /> Company Profile
                </button>
                <button
                  onClick={() => { logout(); navigate('/login') }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
