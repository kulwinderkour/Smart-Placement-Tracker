import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Applied:    { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', border: '#3b82f6' },
  Interviewed:{ bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '#f59e0b' },
  Offered:    { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: '#10b981' },
  Rejected:   { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: '#ef4444' },
}

export default function Profile() {
  const { user } = useAuthStore()
  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
    : (user?.email || 'ST').substring(0, 2).toUpperCase()

  const cgpaPercent = profile.cgpa ? Math.min((parseFloat(profile.cgpa) / 10) * 100, 100) : 0

  const handleViewResume = () => {
    if (!profile.resumeBase64) return
    const win = window.open('', '_blank')
    if (win) win.document.write(`<html><body style="margin:0"><iframe src="${profile.resumeBase64}" width="100%" height="100%" style="border:none;position:fixed;inset:0"></iframe></body></html>`)
  }

  const card = (children: React.ReactNode, extraStyle?: React.CSSProperties) => (
    <div style={{ background: '#fff', border: '0.5px solid #e2e0f0', borderRadius: 14, padding: '20px', ...extraStyle }}>
      {children}
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', width: '100%', maxWidth: '100%', padding: '16px', boxSizing: 'border-box' }}>

      {/* ── Profile Header ──────────────────────────────────────── */}
      <div style={{ background: '#1e3a5f', borderRadius: 14, padding: '28px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 0 24px rgba(124,58,237,0.5)' }}>
          {initials}
        </div>
        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            {profile.fullName || user?.email || 'My Profile'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 12px' }}>
            {[profile.college, profile.branch, profile.graduationYear].filter(Boolean).join(' · ') || 'No college info yet'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.jobType && (
              <span style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.6)', color: '#c4b5fd', borderRadius: 50, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>
                {profile.jobType}
              </span>
            )}
            <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 50, padding: '4px 14px', fontSize: 12 }}>
              {user?.role || 'student'}
            </span>
          </div>
        </div>
        {/* Edit button */}
        <Link to="/onboarding" style={{ height: 36, padding: '0 20px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Profile
        </Link>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        {card(
          <>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CGPA</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{profile.cgpa || '—'}</span>
              {profile.cgpa && <span style={{ fontSize: 13, color: '#6b7280' }}>/ 10</span>}
            </div>
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cgpaPercent}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </>
        )}
        {card(
          <>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Graduation</p>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{profile.graduationYear || '—'}</span>
          </>
        )}
        {card(
          <>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</p>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{profile.branch || '—'}</span>
          </>
        )}
        {card(
          <>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applications</p>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{profile.previousCompanies?.length || 0}</span>
          </>
        )}
      </div>

      {/* ── Skills ─────────────────────────────────────────────── */}
      {card(
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>Skills</h3>
          {profile.skills?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.skills.map((s: string) => (
                <span key={s} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#7c3aed', borderRadius: 50, padding: '6px 14px', fontSize: 13, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>No skills added yet.</p>
          )}
        </>
      , { marginBottom: 16 })}

      {/* ── Resume ─────────────────────────────────────────────── */}
      {card(
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>Resume</h3>
          {profile.resumeName ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.resumeName}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>PDF</p>
                </div>
              </div>
              <button onClick={handleViewResume} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>No resume uploaded yet</p>
              <Link to="/resume" style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Upload Resume</Link>
            </div>
          )}
        </>
      , { marginBottom: 16 })}

      {/* ── Previous Applications ───────────────────────────────── */}
      {card(
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>Previous Applications</h3>
          {profile.previousCompanies?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profile.previousCompanies.map((item: any, i: number) => {
                const s = STATUS_STYLES[item.status] || STATUS_STYLES['Applied']
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#6b7280' }}>
                        {(item.company || '?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.company || 'Unknown'}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 50, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{item.status}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 8px' }}>No prior applications recorded</p>
              <Link to="/jobs" style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>Browse jobs →</Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
