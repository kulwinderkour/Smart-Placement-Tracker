import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { applicationsApi } from '../../api/applications'
import { useAuthStore } from '../../store/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data: apps, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications(),
  })

  const applications = apps?.data || []
  const stats = {
    total:     applications.length,
    active:    applications.filter((a: any) => !['offer','rejected'].includes(a.status)).length,
    offers:    applications.filter((a: any) => a.status === 'offer').length,
    rejected:  applications.filter((a: any) => a.status === 'rejected').length,
  }

  const initials = (user?.email || 'Student').substring(0, 2).toUpperCase()

  const quickActions = [
    { 
      title: 'Browse jobs', 
      desc: 'Explore new matching roles.', 
      badge: 'Live', 
      iconBg: 'bg-purple-100', 
      iconColor: 'text-purple-600', 
      iconPath: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
      ctaColor: 'text-purple-600',
      hoverBorder: 'hover:border-purple-600',
      to: '/jobs'
    },
    { 
      title: 'Application tracker', 
      desc: 'Manage your active pipelines.', 
      badge: 'Board', 
      iconBg: 'bg-blue-100', 
      iconColor: 'text-blue-600', 
      iconPath: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      ctaColor: 'text-blue-600',
      hoverBorder: 'hover:border-blue-600',
      to: '/tracker'
    },
    { 
      title: 'Resume analyser', 
      desc: 'Score and improve your resume.', 
      badge: 'AI', 
      iconBg: 'bg-green-100', 
      iconColor: 'text-green-600', 
      iconPath: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      ctaColor: 'text-green-600',
      hoverBorder: 'hover:border-green-600',
      to: '/resume'
    }
  ]

  const statusColors: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700', 
    online_test: 'bg-yellow-100 text-yellow-700', 
    technical_round: 'bg-purple-100 text-purple-700',
    hr_round: 'bg-purple-100 text-purple-700', 
    offer: 'bg-green-100 text-green-700', 
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', width: '100%', maxWidth: '100%' }}>
      {/* Hero Section */}
      <div 
        style={{
          background: '#1e3a5f',
          borderRadius: '14px',
          margin: '16px',
          padding: '20px 24px 44px',
          width: 'calc(100% - 32px)'
        }}
      >
        <h1 style={{ fontSize: '13px', fontWeight: 500, color: 'white', margin: 0, lineHeight: 1.2 }}>Welcome back, {initials} 👋</h1>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: '4px 0 0 0' }}>Your placement overview</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '20px', width: '100%' }}>
          {[
            { label: 'Total applied', value: stats.total, dot: '#8b5cf6' }, // violet
            { label: 'In progress', value: stats.active, dot: '#eab308' },  // yellow
            { label: 'Offers', value: stats.offers, dot: '#22c55e' },       // green
            { label: 'Rejected', value: stats.rejected, dot: '#ef4444' }     // red
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stat.dot, marginBottom: '8px' }}></div>
              <div style={{ fontSize: '28px', color: 'white', fontWeight: 600, lineHeight: 1, marginBottom: '6px' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div style={{ padding: '0 16px', marginTop: '-20px', width: 'calc(100% - 32px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%' }}>
          {quickActions.map(action => (
            <Link to={action.to} key={action.title} 
              className={`bg-white transition-colors ${action.hoverBorder}`}
              style={{ border: '0.5px solid #e2e0f0', borderRadius: '14px', padding: '18px', textDecoration: 'none', display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div className={`${action.iconBg} ${action.iconColor}`} style={{ width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">{action.iconPath}</svg>
                </div>
                <div style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px', borderRadius: '6px' }}>{action.badge}</div>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '0 0 6px 0', lineHeight: 1 }}>{action.title}</h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, flex: 1 }}>{action.desc}</p>
              <div className={action.ctaColor} style={{ marginTop: '16px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Open <span style={{ fontSize: '16px', lineHeight: 1 }}>&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '12px 16px 24px', width: 'calc(100% - 32px)' }}>
        {/* Left Panel */}
        <div style={{ backgroundColor: 'white', border: '0.5px solid #e2e0f0', borderRadius: '14px', padding: '20px', minHeight: '180px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '0 0 20px 0' }}>Recent applications</h3>
          {isLoading ? (
            <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Loading...</p>
          ) : applications.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#f4f4f8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', fontSize: '20px' }}>📭</div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: 500 }}>No applications yet</p>
              <Link to="/jobs" style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>Browse jobs to get started →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.slice(0, 3).map((app: any) => (
                <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: '0 0 2px 0' }}>{app.job?.role_title || 'Unknown Role'}</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{app.job?.company_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[app.status] || 'bg-gray-100 text-gray-600'}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ backgroundColor: 'white', border: '0.5px solid #e2e0f0', borderRadius: '14px', padding: '20px', minHeight: '180px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '0 0 20px 0' }}>Getting started</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[ 
              { title: 'Complete your profile', desc: 'Add your skills and education.' }, 
              { title: 'Upload a resume', desc: 'Check your ATS score inside the analyser.' }, 
              { title: 'Apply to your first job', desc: 'Browse live openings on the board.' } 
            ].map((step, i) => (
              <div key={step.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#1e3a5f', color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  {i + 1}
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: '0 0 4px 0', lineHeight: 1 }}>{step.title}</h4>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
