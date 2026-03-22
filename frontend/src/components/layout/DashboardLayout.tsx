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
    <div 
      style={{ 
        display: 'flex', 
        height: '100vh', 
        overflow: 'hidden', 
        background: '#0d1117',
        color: '#e6edf3',
        position: 'relative'
      }}
    >
      <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />
      
      <main
        style={{
          flex: 1,
          marginLeft,
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
          transition: 'margin-left 0.2s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </main>
    </div>
  )
}
