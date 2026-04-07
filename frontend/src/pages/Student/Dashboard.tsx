import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { applicationsApi, type TrackedApplication } from '../../api/applications'

// ── Types & Helpers ──────────────────────────────────────────────────────────
interface PastApp { company: string; status: string }
interface UserProfile {
  fullName?: string; full_name?: string;
  college?: string; branch?: string; 
  cgpa?: string | number;
  graduationYear?: string | number; graduation_year?: string | number;
  skills?: string[]; 
  jobType?: string; job_type?: string;
  resumeName?: string; resume_name?: string; 
  resumeBase64?: string; resume_base64?: string;
  resumeUrl?: string; resume_url?: string;
  hasExperience?: boolean; 
  previousCompanies?: PastApp[]; previous_companies?: PastApp[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Applied:    { bg: '#1f2d3d', color: '#58a6ff', border: '1px solid #1f6feb33' },
  Interviewed:{ bg: '#2d2208', color: '#d29922', border: '1px solid #9e6a0333' },
  Offered:    { bg: '#1a2e22', color: '#3fb950', border: '1px solid #23863633' },
  Rejected:   { bg: '#2d1b1b', color: '#f85149', border: '1px solid #da363333' },
}

function calcReadiness(profile: UserProfile): number {
  let score = 0
  const fullName = profile.fullName || profile.full_name
  const resume = profile.resumeName || profile.resume_name || profile.resumeUrl || profile.resume_url
  const prevApps = profile.previousCompanies || profile.previous_companies
  const cgpa = typeof profile.cgpa === 'string' ? parseFloat(profile.cgpa) : (profile.cgpa || 0)

  if (fullName && profile.college) score += 20
  if (profile.skills?.length) score += 20
  if (resume) score += 20
  if (profile.hasExperience && prevApps?.length) score += 20
  if (cgpa >= 7.0) score += 20
  return score
}

// ── Components ───────────────────────────────────────────────────────────────

function StatCard({ value, label, icon, accent }: { value: string | number; label: string; icon: string; accent: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#161b22', border: `1px solid ${hov ? '#30363d' : '#21262d'}`,
        borderRadius: 10, padding: '20px 22px', flex: 1, minWidth: 200, transition: 'all 0.15s ease'
      }}>
      <div style={{ color: accent, marginBottom: 16 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h3 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#e6edf3', lineHeight: 1.2 }}>{value}</h3>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7d8590', fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function ActionCard({ icon, title, subtitle, to }: { icon: string; title: string; subtitle: string; to: string }) {
  const [hov, setHov] = useState(false)
  return (
    <Link to={to} 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#1c2128' : '#161b22',
        border: `1px solid ${hov ? '#30363d' : '#21262d'}`,
        borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
        textDecoration: 'none', transition: 'all 0.15s ease', cursor: 'pointer'
      }}
    >
      <div style={{ color: '#20c997', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e6edf3', lineHeight: 1.5 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7d8590', lineHeight: 1.5 }}>{subtitle}</p>
      </div>
      <span style={{ color: hov ? '#7d8590' : '#484f58', fontSize: 18 }}>→</span>
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const profile: UserProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const readiness = calcReadiness(profile)
  const fullName = profile.fullName || profile.full_name
  const firstName = fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Member'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'

  const [logoutHov, setLogoutHov] = useState(false)
  const handleLogout = () => { logout(); navigate('/login') }

  const [applications, setApplications] = useState<TrackedApplication[]>([])
  const [appsLoading, setAppsLoading] = useState(true)

  const [adminJobs, setAdminJobs] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [matchScores, setMatchScores] = useState<Record<string, { loading: boolean; score?: number; label?: string; matched?: string[]; gaps?: string[] }>>({});

  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState('');
  const [minPackage, setMinPackage] = useState(10);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activeJobForApply, setActiveJobForApply] = useState<any>(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleManualApply = async () => {
    if (!activeJobForApply) return;
    setIsApplying(true);
    try {
      await applicationsApi.apply(activeJobForApply.id, applyNotes);
      alert('Application submitted successfully!');
      setShowApplyModal(false);
      setApplyNotes('');
      // Invalidate applications count
      applicationsApi.myApplications().then(res => setApplications(res.data as any));
    } catch (err: any) {
      alert('Failed to apply: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsApplying(false);
    }
  };

  const AI_ENGINE_URL = 'http://localhost:8002';

  const fetchMatchScores = async (jobs: any[]) => {
    setMatchScores(prev => {
      const next = { ...prev };
      jobs.forEach(job => { next[job.id] = { loading: true }; });
      return next;
    });
    const studentPayload = {
      fullName: profile.fullName || profile.full_name || '',
      college: profile.college || '',
      branch: profile.branch || '',
      cgpa: parseFloat((profile.cgpa || '0').toString()) || 0,
      graduationYear: parseInt((profile.graduationYear || profile.graduation_year || '2025').toString()) || 0,
      skills: profile.skills || [],
      mockInterviewScore: 0,
      aptitudeStreak: 0,
      previousCompanies: (profile.previousCompanies || profile.previous_companies || []) as any[],
    };
    await Promise.allSettled(
      jobs.map(async job => {
        try {
          const res = await fetch(`${AI_ENGINE_URL}/api/matcher/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student: studentPayload,
              job: {
                id: job.id || '',
                title: job.title || '',
                company: job.company || job.company_name || '',
                location: job.location || '',
                package_lpa: parseFloat(job.package_lpa || 0),
                required_skills: job.required_skills || [],
                min_cgpa: parseFloat(job.min_cgpa || 0),
                job_type: job.job_type || '',
                company_type: job.company_type || '',
              },
            }),
          });
          if (!res.ok) throw new Error('Score fetch failed');
          const data = await res.json();
          setMatchScores(prev => ({
            ...prev,
            [job.id]: { loading: false, score: data.match_score, label: data.match_label, matched: data.matched_skills || [], gaps: data.gap_skills || [] },
          }));
        } catch {
          setMatchScores(prev => ({ ...prev, [job.id]: { loading: false } }));
        }
      })
    );
  };

  const runAutoApply = async () => {
    setAgentRunning(true);
    setAgentResult('');
    try {
      const token = localStorage.getItem('access_token');

      const res = await fetch(`${AI_ENGINE_URL}/agent/apply-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_token: token,
          resume_url: profile.resumeUrl || profile.resume_url || '',
          min_package_lpa: minPackage,
          student_cgpa: parseFloat(profile.cgpa?.toString() || '0') || 0,
          student_skills: (profile.skills || []).join(', '),
          student_profile: JSON.stringify({
            fullName: profile.fullName || profile.full_name || '',
            college: profile.college || '',
            branch: profile.branch || '',
            cgpa: parseFloat((profile.cgpa || '0').toString()) || 0,
            skills: profile.skills || [],
            experience: (profile.previousCompanies || profile.previous_companies || [])
              .map((c: any) => c.company).filter(Boolean).join(', '),
          }),
        })
      });
      const data = await res.json();
      setAgentResult(data.summary || data.detail || 'Agent finished.');
    } catch (err: any) {
      setAgentResult('Agent failed: ' + err.message);
    }
    setAgentRunning(false);
  };

  useEffect(() => {
    if (!user?.id) return
    applicationsApi.myApplications()
      .then(res => setApplications(res.data as unknown as TrackedApplication[]))
      .catch((err) => {
        console.error("Dashboard: applications fetch failed:", err.response?.data || err.message);
        setApplications([]);
      })
      .finally(() => setAppsLoading(false))
    
    // Fetch admin posted jobs with debug logging
    const fetchJobs = async () => {
      try {
        const SCRAPER_URL = 'http://localhost:8081'; // URL for Scraper/Admin Jobs server
        console.log('Fetching admin jobs from:', `${SCRAPER_URL}/api/admin-jobs/active`);
        
        const res = await fetch(`${SCRAPER_URL}/api/admin-jobs/active`);
        console.log('Response status:', res.status);
        
        const data = await res.json();
        console.log('Admin jobs data:', data);
        
        if (data.jobs) {
          setAdminJobs(data.jobs);
          fetchMatchScores(data.jobs);
        }
      } catch (err) {
        console.error("Failed to fetch admin jobs:", err);
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, [user?.id])

  const skills = profile.skills || []

  const gradYearStr = (profile.graduationYear || profile.graduation_year || '2025').toString()
  const gradYear = parseInt(gradYearStr, 10)
  const diffDays = Math.max(0, Math.ceil((new Date(gradYear, 5, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
  const cgpaNum = typeof profile.cgpa === 'string' ? parseFloat(profile.cgpa) : (profile.cgpa || 0)
  const resumeName = profile.resumeName || profile.resume_name || 'resume.pdf'
  const resumeBase = profile.resumeBase64 || profile.resume_base64

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0d1117' }}>
      
      {/* ── Top Bar ── */}
      <header style={{
        background: '#0d1117', borderBottom: '1px solid #21262d',
        padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#e6edf3' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7d8590' }}>
            {skills.length > 0 ? `Track your profile and skills efficiently.` : `Complete your profile to boost placement readiness.`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell */}
          <div style={{ color: '#7d8590', cursor: 'pointer', padding: '6px', borderRadius: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>

          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#20c99722', color: '#20c997',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, flexShrink: 0
          }}>
            {firstName[0].toUpperCase()}
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 22, background: '#21262d', margin: '0 4px' }} />

          {/* Logout Button */}
          <button
            id="student-logout-btn"
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHov(true)}
            onMouseLeave={() => setLogoutHov(false)}
            title="Sign out"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: logoutHov ? '#2d1b1b' : 'transparent',
              border: `1px solid ${logoutHov ? '#da363344' : 'transparent'}`,
              borderRadius: 8,
              padding: '6px 12px',
              color: logoutHov ? '#f85149' : '#7d8590',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.18s ease',
            }}
          >
            <LogOut size={15} strokeWidth={2.2} />
            <span style={{ display: 'inline' }}>Sign out</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, padding: '20px 28px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <StatCard value={`${readiness}%`} label="Readiness" icon="M22 12h-4l-3 9L9 3l-3 9H2" accent="#20c997" />
            <StatCard value={skills.length} label="Skills" icon="M13 2L3 14h9l-1 8 10-12h-9l1-8z" accent="#7c3aed" />
            <StatCard value={appsLoading ? '…' : applications.length} label="Apps" icon="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" accent="#1f6feb" />
            <StatCard value={`${diffDays}d`} label="To Season" icon="M12 6v6l4 2" accent="#da3633" />
          </div>

          {/* Readiness Bar */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>Placement Readiness</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#20c997' }}>{readiness}%</span>
            </div>
            <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${readiness}%`, height: '100%', background: '#20c997', transition: 'width 0.8s ease' }} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7d8590' }}>
              💡 Profile completion status. Upload your latest resume to reach 100%.
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ActionCard title="Browse Jobs" subtitle="Roles for you" to="/jobs" icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            <ActionCard title="Resume Analyser" subtitle="Check ATS Score" to="/resume" icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <ActionCard title="Application Tracker" subtitle="Manage pipeline" to="/tracker" icon="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" />
          </div>

          {/* Recent Apps */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>Recent Applications</h2>
              <Link to="/jobs" style={{ fontSize: 12, color: '#20c997', textDecoration: 'none', fontWeight: 500 }}>Browse Jobs →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {appsLoading ? (
                <p style={{ fontSize: 13, color: '#7d8590', margin: 0 }}>Loading…</p>
              ) : applications.length > 0 ? applications.slice(0, 5).map((app, i) => {
                const statusKey = app.status === 'applied' ? 'Applied'
                  : app.status === 'offer' ? 'Offered'
                  : app.status === 'rejected' ? 'Rejected'
                  : 'Interviewed'
                const s = STATUS_STYLES[statusKey] || STATUS_STYLES['Applied']
                const appliedDate = app.applied_at
                  ? new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'
                return (
                  <div key={i} style={{ 
                    padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: i === Math.min(applications.length, 5) - 1 ? 'none' : '1px solid #21262d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, background: '#21262d', color: '#7d8590',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500,
                        flexShrink: 0
                      }}>{app.company[0]?.toUpperCase() ?? '?'}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{app.company}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#7d8590' }}>{app.role} · {appliedDate}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                      background: s.bg, color: s.color, border: s.border, flexShrink: 0
                    }}>{statusKey}</span>
                  </div>
                )
              }) : (
                <p style={{ fontSize: 13, color: '#7d8590', margin: 0 }}>
                  No applications yet. <Link to="/jobs" style={{ color: '#20c997', textDecoration: 'none' }}>Browse jobs →</Link>
                </p>
              )}
            </div>
          </div>

          {/* ── Apply Modal ── */}
          {showApplyModal && activeJobForApply && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: '#161b22', border: '1px solid #21262d', borderRadius: '12px',
                width: '100%', maxWidth: '450px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#e6edf3' }}>
                  Apply for {activeJobForApply.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#7d8590', marginTop: '4px', marginBottom: '20px' }}>
                  {activeJobForApply.company} · {activeJobForApply.location}
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#484f58', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Notes for the Placement Cell / Company
                  </label>
                  <textarea 
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    placeholder="Briefly state your interest or mention any relevant details..."
                    style={{
                      width: '100%', height: '120px', background: '#0d1117', border: '1px solid #21262d',
                      borderRadius: '8px', padding: '12px', color: '#e6edf3', fontSize: '14px',
                      resize: 'none', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setShowApplyModal(false); setApplyNotes(''); }}
                    style={{
                      flex: 1, background: 'transparent', border: '1px solid #21262d',
                      color: '#e6edf3', borderRadius: '8px', padding: '10px', fontSize: '14px',
                      fontWeight: 600, cursor: 'pointer'
                    }}>
                    Cancel
                  </button>
                  <button onClick={handleManualApply} disabled={isApplying}
                    style={{
                      flex: 1, background: '#20c997', border: 'none',
                      color: '#0d1117', borderRadius: '8px', padding: '10px', fontSize: '14px',
                      fontWeight: 600, cursor: isApplying ? 'not-allowed' : 'pointer',
                      opacity: isApplying ? 0.7 : 1
                    }}>
                    {isApplying ? 'Applying...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Admin Posted Opportunities Section ── */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Opportunities from SmartPlacement
                  </h2>
                  <span style={{
                    background: '#20c997', color: '#0d1117', fontSize: '10px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.05em'
                  }}>VERIFIED</span>
                </div>
                <p style={{ color: '#7d8590', fontSize: '12px', marginTop: '3px' }}>
                  Handpicked opportunities posted directly by our placement team
                </p>
              </div>
              <span style={{ color: '#7d8590', fontSize: '12px' }}>
                {adminJobs.length} active opening{adminJobs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ height: '1px', background: '#21262d', marginBottom: '16px' }} />

            {/* Auto apply bar */}
            <div style={{
              background: '#161b22', border: '1px solid #21262d',
              borderRadius: '10px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '16px', flexWrap: 'wrap'
            }}>
              <span style={{ color: '#e6edf3', fontSize: '13px', fontWeight: 500 }}>
                Auto Apply Agent
              </span>
              <span style={{ color: '#7d8590', fontSize: '12px' }}>
                Apply to all eligible jobs above
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ color: '#7d8590', fontSize: '12px' }}>Min package:</span>
                <select
                  value={minPackage}
                  onChange={e => setMinPackage(Number(e.target.value))}
                  style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '6px', color: '#e6edf3', padding: '6px 10px', fontSize: '12px' }}
                >
                  {[5, 8, 10, 12, 15, 20, 25, 30].map(p => (
                    <option key={p} value={p}>₹{p} LPA+</option>
                  ))}
                </select>
                <button onClick={runAutoApply} disabled={agentRunning}
                  style={{
                    background: agentRunning ? '#21262d' : '#7c3aed',
                    color: agentRunning ? '#7d8590' : 'white',
                    border: 'none', borderRadius: '6px',
                    padding: '7px 16px', fontSize: '12px',
                    fontWeight: 600, cursor: agentRunning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  {agentRunning ? '⏳ Agent running...' : '⚡ Auto Apply'}
                </button>
              </div>
              {agentResult && (
                <div style={{
                  width: '100%', marginTop: '10px',
                  background: '#0d1117', border: '1px solid #21262d',
                  borderRadius: '8px', padding: '12px',
                  color: '#e6edf3', fontSize: '13px', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {agentResult}
                </div>
              )}
            </div>

            {jobsLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', padding: '18px', height: '100px' }} />
                ))}
              </div>
            )}

            {!jobsLoading && adminJobs.length === 0 && (
              <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
                <p style={{ color: '#484f58', fontSize: '13px' }}>No opportunities posted yet. Check back soon.</p>
              </div>
            )}

            {!jobsLoading && adminJobs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {adminJobs.map(job => {
                  const isApplied = applications.some(a => a.job_id === job.id);
                  const ms = matchScores[job.id];
                  const scoreColor = !ms || ms.loading || ms.score === undefined ? '#7d8590'
                    : ms.score >= 70 ? '#3fb950'
                    : ms.score >= 40 ? '#d29922'
                    : '#f85149';
                  return (
                    <div key={job.id} style={{
                      background: '#161b22', border: '1px solid #21262d', borderRadius: '10px',
                      padding: '18px 20px', transition: 'border-color 0.15s', cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#30363d'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '8px', background: '#21262d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590', fontWeight: 700,
                            fontSize: '14px', flexShrink: 0, overflow: 'hidden'
                          }}>
                            {job.company_logo ? <img src={job.company_logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (job.company || job.company_name)?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#e6edf3', fontSize: '14px', fontWeight: 600 }}>{job.title}</div>
                            <div style={{ color: '#7d8590', fontSize: '12px' }}>{job.company || job.company_name}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                          {(job.package_lpa || job.salary_min) && (
                            <span style={{ background: '#1a2e22', color: '#3fb950', border: '1px solid #23863633', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                              ₹{job.package_lpa || job.salary_min} LPA
                            </span>
                          )}
                          {ms && (
                            ms.loading ? (
                              <span style={{ fontSize: '10px', color: '#7d8590' }}>⏳ scoring…</span>
                            ) : ms.score !== undefined ? (
                              <span style={{ background: scoreColor + '22', color: scoreColor, border: `1px solid ${scoreColor}44`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700 }}>
                                {ms.score}% match
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        {job.location && <span style={{ color: '#7d8590', fontSize: '11px' }}>📍 {job.location}</span>}
                        {job.job_type && <span style={{ color: '#7d8590', fontSize: '11px' }}>💼 {job.job_type}</span>}
                      </div>
                      {ms && !ms.loading && ms.score !== undefined && ((ms.matched?.length ?? 0) > 0 || (ms.gaps?.length ?? 0) > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {(ms.matched || []).slice(0, 3).map(s => (
                            <span key={s} style={{ background: '#1a2e2260', color: '#3fb950', border: '1px solid #3fb95040', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 500 }}>{s}</span>
                          ))}
                          {(ms.gaps || []).slice(0, 2).map(s => (
                            <span key={s} style={{ background: '#2d1b1b60', color: '#f85149', border: '1px solid #f8514940', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 500 }}>−{s}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#484f58', fontSize: '11px' }}>
                          {job.application_deadline ? `Deadline: ${new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                        </span>
                        {isApplied ? (
                          <button disabled
                            style={{ background: '#21262d', color: '#7d8590', border: '1px solid #30363d', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'not-allowed' }}>
                            Applied ✓
                          </button>
                        ) : job.apply_link ? (
                          <a href={job.apply_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            style={{ background: '#20c997', color: '#0d1117', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                            Apply Externally →
                          </a>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setActiveJobForApply(job); setShowApplyModal(true); }}
                            style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Apply Internally →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Placement Pulse CTA */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px 24px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>⚡ Placement Pulse</h2>
              <Link to="/placement-pulse" style={{ fontSize: 12, color: '#20c997', textDecoration: 'none', fontWeight: 500 }}>Open Pulse →</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#20c99712', border: '1px solid #20c99722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#20c997' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>Track your prep momentum</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7d8590' }}>Daily actions · Streaks · Category readiness</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Profile Summary */}
        <aside style={{
          background: '#161b22', border: '1px solid #21262d', borderRadius: 10,
          padding: '20px', position: 'sticky', top: 16, height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#20c99718', color: '#20c997',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600
            }}>{firstName[0].toUpperCase()}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e6edf3' }}>{profile.fullName || 'User'}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#7d8590' }}>Batch of {profile.graduationYear}</p>
            </div>
          </div>

          <div style={{ height: 1, background: '#21262d', margin: '16px 0' }} />

          {/* CGPA Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#7d8590' }}>Academic CGPA</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e6edf3' }}>{profile.cgpa || profile.cgpa} / 10</span>
            </div>
            <div style={{ height: 4, background: '#21262d', borderRadius: 2 }}>
              <div style={{ width: `${(cgpaNum / 10) * 100}%`, height: '100%', background: '#20c997', borderRadius: 2 }} />
            </div>
          </div>

          {/* Skills Section */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skills</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(s => (
                <span key={s} style={{
                  background: '#21262d', color: '#7d8590', padding: '3px 10px', borderRadius: 4, fontSize: 11, border: '1px solid transparent'
                }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: '#21262d', margin: '16px 0' }} />

          {/* Resume Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#3fb950', fontSize: 12 }}>✓</span>
              <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 500 }}>{resumeName}</span>
            </div>
            {resumeBase ? (
              <button 
                onClick={() => {
                  const win = window.open('', '_blank')
                  if (win) win.document.write(`<html><body style="margin:0"><iframe src="${resumeBase}" width="100%" height="100%" style="border:none;position:fixed;inset:0"></iframe></body></html>`)
                }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 500, color: '#58a6ff', textDecoration: 'none', cursor: 'pointer' }}
              >
                View →
              </button>
            ) : (
              <Link to="/profile" style={{ fontSize: 12, fontWeight: 500, color: '#58a6ff', textDecoration: 'none' }}>Add →</Link>
            )}
          </div>

          <Link to="/profile" style={{
            display: 'block', marginTop: 24, textAlign: 'center', fontSize: 13, fontWeight: 500,
            color: '#20c997', textDecoration: 'none', padding: '10px', borderRadius: 6,
            border: '1px solid #21262d', background: '#0d1117'
          }}>Edit Profile</Link>
        </aside>

      </div>
    </div>
  )
}
