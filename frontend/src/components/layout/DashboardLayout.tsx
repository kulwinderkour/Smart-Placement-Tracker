import { useState } from 'react'
import DashboardSidebar from './DashboardSidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const EXPANDED_W = 240
const COLLAPSED_W = 62

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const marginLeft = sidebarOpen ? EXPANDED_W : COLLAPSED_W

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8f9fb' }}>
      <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />
      <main
        style={{
          flex: 1,
          marginLeft,
          overflowX: 'hidden',
          overflowY: 'auto',
          padding: '32px 40px',
          boxSizing: 'border-box',
          minHeight: '100vh',
          transition: 'margin-left 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
