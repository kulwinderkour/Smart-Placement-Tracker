import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { studentApi } from '../../api/student'
import type { StudentProfile } from '../../types'

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Applied:    { bg: '#1f2d3d', color: '#58a6ff', border: '1px solid #1f6feb33' },
  Interviewed:{ bg: '#2d2208', color: '#d29922', border: '1px solid #9e6a0333' },
  Offered:    { bg: '#1a2e22', color: '#3fb950', border: '1px solid #23863633' },
  Rejected:   { bg: '#2d1b1b', color: '#f85149', border: '1px solid #da363333' },
}

export default function Profile() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<Partial<StudentProfile>>(
    JSON.parse(localStorage.getItem('userProfile') || '{}')
  )
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingSkills, setEditingSkills] = useState(false)
  const [draftSkills, setDraftSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [savingSkills, setSavingSkills] = useState(false)

  const openSkillEditor = () => {
    setDraftSkills([...(profile.skills || [])])
    setEditingSkills(true)
  }
  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !draftSkills.includes(s)) setDraftSkills(prev => [...prev, s])
    setSkillInput('')
  }
  const removeSkill = (s: string) => setDraftSkills(prev => prev.filter(x => x !== s))
  const saveSkills = async () => {
    setSavingSkills(true)
    try {
      const res = await studentApi.updateProfile({ skills: draftSkills })
      setProfile(res.data)
      localStorage.setItem('userProfile', JSON.stringify(res.data))
      setEditingSkills(false)
    } catch (err) {
      console.error('Failed to save skills:', err)
      alert('Failed to save skills. Please try again.')
    } finally {
      setSavingSkills(false)
    }
  }

  useEffect(() => {
    studentApi.getProfile()
      .then(res => {
        setProfile(res.data)
        localStorage.setItem('userProfile', JSON.stringify(res.data))
      })
      .catch(err => console.error('Failed to fetch profile:', err))
      .finally(() => setLoading(false))
  }, [])

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
    : (user?.email || 'ST').substring(0, 2).toUpperCase()

  const cgpaPercent = profile.cgpa ? Math.min((profile.cgpa / 10) * 100, 100) : 0

  const handleViewResume = () => {
    if (!profile.resume_base64) return
    const win = window.open('', '_blank')
    if (win) win.document.write(`<html><body style="margin:0"><iframe src="${profile.resume_base64}" width="100%" height="100%" style="border:none;position:fixed;inset:0"></iframe></body></html>`)
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') return

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        const res = await studentApi.updateProfile({
          resume_name: file.name,
          resume_base64: base64
        })
        setProfile(res.data)
        localStorage.setItem('userProfile', JSON.stringify(res.data))
      } catch (err) {
        console.error('Upload failed:', err)
        alert('Failed to upload resume. Please try again.')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const card = (children: React.ReactNode, extraStyle?: React.CSSProperties) => (
    <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 14, padding: '20px', ...extraStyle }}>
      {children}
    </div>
  )

  if (loading) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590' }}>
        Loading profile...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', width: '100%', minHeight: '100vh', background: '#0d1117', padding: '16px', boxSizing: 'border-box', color: '#e6edf3' }}>

      {/* ── Profile Header ──────────────────────────────────────── */}
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 14, padding: '28px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(32, 201, 151, 0.1)', border: '2px solid rgba(32, 201, 151, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#20c997', flexShrink: 0 }}>
          {initials}
        </div>
        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            {profile.full_name || user?.email || 'My Profile'}
          </h1>
          <p style={{ color: '#7d8590', fontSize: 13, margin: '0 0 12px' }}>
            {[profile.college, profile.branch, profile.graduation_year].filter(Boolean).join(' · ') || 'No college info yet'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.job_type && (
              <span style={{ background: 'rgba(32, 201, 151, 0.1)', border: '1px solid rgba(32, 201, 151, 0.2)', color: '#20c997', borderRadius: 50, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>
                {profile.job_type}
              </span>
            )}
            <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7d8590', borderRadius: 50, padding: '4px 14px', fontSize: 12 }}>
              {user?.role || 'student'}
            </span>
          </div>
        </div>
        {/* Edit button */}
        <Link to="/onboarding" style={{ height: 36, padding: '0 20px', borderRadius: 10, background: 'transparent', border: '1px solid #30363d', color: '#c9d1d9', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121(0-0-1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Profile
        </Link>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        {card(
          <>
            <p style={{ fontSize: 12, color: '#7d8590', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CGPA</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3' }}>{profile.cgpa || '—'}</span>
              {profile.cgpa && <span style={{ fontSize: 13, color: '#7d8590' }}>/ 10</span>}
            </div>
            <div style={{ height: 6, background: '#21262d', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cgpaPercent}%`, background: '#20c997', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </>
        )}
        {card(
          <>
            <p style={{ fontSize: 12, color: '#7d8590', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Graduation</p>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3' }}>{profile.graduation_year || '—'}</span>
          </>
        )}
        {card(
          <>
            <p style={{ fontSize: 12, color: '#7d8590', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</p>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3' }}>{profile.branch || '—'}</span>
          </>
        )}
        {card(
          <>
            <p style={{ fontSize: 12, color: '#7d8590', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applications</p>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3' }}>{(profile as any).previousCompanies?.length || 0}</span>
          </>
        )}
      </div>

      {/* ── Skills ─────────────────────────────────────────────── */}
      {card(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', margin: 0 }}>Skills</h3>
            {!editingSkills ? (
              <button onClick={openSkillEditor} style={{ height: 30, padding: '0 14px', borderRadius: 8, background: 'transparent', border: '1px solid #30363d', color: '#c9d1d9', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add / Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditingSkills(false)} style={{ height: 30, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px solid #30363d', color: '#7d8590', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveSkills} disabled={savingSkills} style={{ height: 30, padding: '0 14px', borderRadius: 8, background: '#20c997', border: 'none', color: '#0d1117', fontSize: 12, fontWeight: 600, cursor: savingSkills ? 'not-allowed' : 'pointer', opacity: savingSkills ? 0.7 : 1 }}>
                  {savingSkills ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editingSkills ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, minHeight: 36 }}>
                {draftSkills.length === 0 && <p style={{ color: '#484f58', fontSize: 13, margin: 0 }}>No skills yet — add some below.</p>}
                {draftSkills.map(s => (
                  <span key={s} style={{ background: 'rgba(56,139,253,0.1)', border: '1px solid rgba(56,139,253,0.25)', color: '#58a6ff', borderRadius: 50, padding: '5px 12px 5px 14px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s}
                    <button onClick={() => removeSkill(s)} title={`Remove ${s}`} style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', padding: 0, fontSize: 15, lineHeight: 1, display: 'flex' }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="Type a skill and press Enter…"
                  aria-label="Add skill"
                  style={{ flex: 1, background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '8px 12px', color: '#e6edf3', fontSize: 13, outline: 'none' }}
                />
                <button onClick={addSkill} disabled={!skillInput.trim()} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: skillInput.trim() ? '#7c3aed' : '#21262d', border: 'none', color: skillInput.trim() ? '#fff' : '#7d8590', fontSize: 13, fontWeight: 600, cursor: skillInput.trim() ? 'pointer' : 'default' }}>
                  + Add
                </button>
              </div>
            </>
          ) : (
            profile.skills && profile.skills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile.skills.map((s: string) => (
                  <span key={s} style={{ background: 'rgba(56, 139, 253, 0.1)', border: '1px solid rgba(56, 139, 253, 0.2)', color: '#58a6ff', borderRadius: 50, padding: '6px 14px', fontSize: 13, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: '#7d8590', fontSize: 13, margin: 0 }}>No skills added yet.</p>
                <button onClick={openSkillEditor} style={{ color: '#20c997', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0 }}>+ Add skills →</button>
              </div>
            )
          )}
        </>
      , { marginBottom: 16 })}

      {/* ── Resume ─────────────────────────────────────────────── */}
      {card(
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', margin: '0 0 14px' }}>Resume</h3>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".pdf" 
            onChange={handleResumeUpload}
          />
          {profile.resume_name ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117', border: '1px solid #21262d', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3', margin: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.resume_name}</p>
                  <p style={{ fontSize: 11, color: '#7d8590', margin: '2px 0 0' }}>PDF</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading}
                  style={{ height: 34, padding: '0 16px', borderRadius: 8, background: 'transparent', border: '1px solid #30363d', color: '#c9d1d9', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  {uploading ? 'Uploading...' : 'Update'}
                </button>
                <button 
                  onClick={handleViewResume} 
                  style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#20c997', border: 'none', color: '#0d1117', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: '#7d8590', fontSize: 13, margin: 0 }}>Upload and analyse your resume to get your ATS score</p>
              <Link 
                to="/resume" 
                style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#20c997', border: 'none', color: '#0d1117', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Open Resume Analyser
              </Link>
            </div>
          )}
        </>
      , { marginBottom: 16 })}

      {/* ── Previous Applications ───────────────────────────────── */}
      {card(
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', margin: '0 0 14px' }}>Previous Applications</h3>
          {(profile as any).previousCompanies?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(profile as any).previousCompanies.map((item: any, i: number) => {
                const s = STATUS_STYLES[item.status] || STATUS_STYLES['Applied']
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0d1117', border: '1px solid #21262d', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#161b22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#7d8590' }}>
                        {(item.company || '?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{item.company || 'Unknown'}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 50, background: s.bg, color: s.color, border: s.border }}>{item.status}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#7d8590', fontSize: 13, margin: '0 0 8px' }}>No prior applications recorded</p>
              <Link to="/jobs" style={{ fontSize: 13, color: '#20c997', fontWeight: 500, textDecoration: 'none' }}>Browse jobs →</Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
