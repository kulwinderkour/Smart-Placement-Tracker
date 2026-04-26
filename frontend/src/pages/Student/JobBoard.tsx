import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { applicationsApi } from "../../api/applications";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  applyUrl: string;
  source: string;
  description?: string;
  postedAt?: string;
  employmentType?: string;
}

export default function JobBoard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [confirmJob, setConfirmJob] = useState<Job | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();

  const searchTimeout = useRef<any>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounce API call by 600ms.
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchJobs(value);
    }, 600);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setPendingJobs(prev => {
          if (prev.length === 0) return prev;
          setConfirmJob(prev[0]);
          return prev;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchJobs = async (queryOverride?: string) => {
    setLoading(true);
    setError('');

    try {
      const scraperBase = (import.meta.env.VITE_SCRAPER_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}`).replace(/\/$/, '');
      const params = new URLSearchParams();
      const q = (queryOverride ?? searchQuery ?? '').trim();
      if (q) params.set('q', q);

      let scraperJobs: Job[] = [];
      const cachedRes = await fetch(`${scraperBase}/scraped-jobs?${params.toString()}`);
      if (cachedRes.ok) {
        const data = await cachedRes.json();
        scraperJobs = (data.jobs || []).map((job: any, idx: number) => ({
          id: job.id || `scraped-${idx}-${job.applyUrl || job.title}`,
          title: job.title,
          company: job.company,
          location: job.location || 'India',
          salary: job.salary || 'Not listed',
          applyUrl: job.applyUrl,
          source: job.source || 'Scraper',
          description: job.description || '',
          employmentType: (job.employmentType || '').toLowerCase(),
        }));
        setLastUpdated(data.lastUpdated || null);
      } else if (cachedRes.status === 404) {
        // Backward compatibility with legacy scraper server shape.
        const legacyRes = await fetch(`http://localhost:8081/api/jobs/internshala?skills=${encodeURIComponent(baseQuery)}`);
        if (!legacyRes.ok) throw new Error('Failed to load scraper jobs');
        const legacyData = await legacyRes.json();
        scraperJobs = (legacyData || []).map((job: any, idx: number) => ({
          id: job.id || `legacy-${idx}-${job.applyUrl || job.title}`,
          title: job.title,
          company: job.company,
          location: job.location || 'India',
          salary: job.salary || 'Not listed',
          applyUrl: job.applyUrl,
          source: job.source || 'Internshala',
          description: job.description || '',
          employmentType: (job.employmentType || '').toLowerCase(),
        }));
        setLastUpdated(null);
      } else {
        throw new Error('Failed to load scraper jobs');
      }
      setJobs(scraperJobs);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(`Search failed. Please try again.`);
    }

    setLoading(false);
  };

  const refreshJobs = async () => {
    const scraperBase = (import.meta.env.VITE_SCRAPER_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}`).replace(/\/$/, '');
    try {
      await fetch(`${scraperBase}/scraped-jobs/refresh`, { method: 'POST' });
    } catch (e) {
      // Ignore refresh failures when running against legacy scraper backend.
    }
    await fetchJobs();
  };

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filtered = jobs.filter(job => {
    if (!searchQuery.trim()) return true;
    const hay = `${job.title} ${job.company} ${job.location} ${job.description || ''}`.toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const userSkills = profile.skills || [];

  return (
    <div style={{ padding: "2rem", background: "var(--student-bg)", minHeight: "100vh", color: "var(--student-text)" }}>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--student-surface)',
          border: '1px solid #2d2d2d',
          borderRadius: '8px',
          color: 'var(--student-text-muted)',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '1rem'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'var(--student-border)';
          e.currentTarget.style.color = 'var(--student-text)';
          e.currentTarget.style.borderColor = '#a78bfa';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'var(--student-surface)';
          e.currentTarget.style.color = 'var(--student-text-muted)';
          e.currentTarget.style.borderColor = 'var(--student-border)';
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Compact Header */}
      <div style={{
        background: "var(--student-surface)",
        border: "1px solid var(--student-border)",
        borderRadius: "12px",
        padding: "1rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "2px", display: 'flex', alignItems: 'center', gap: '10px' }}>
            Job Board
          </h1>
          <p style={{ color: "var(--student-text-muted)", fontSize: "12px", margin: 0 }}>Live job opportunities curated for your profile</p>
          <p style={{ color: "var(--student-text-dim)", fontSize: "12px", margin: "2px 0 0" }}>
            Last updated: {lastUpdated ? timeAgo(lastUpdated) : 'Loading...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={refreshJobs}
            style={{
              background: 'var(--student-surface)',
              border: '1px solid #2d2d2d',
              borderRadius: '6px',
              color: 'var(--student-text-muted)',
              padding: '6px 12px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => { setSearchQuery(''); fetchJobs(''); }}
            style={{
              background: 'var(--student-surface)',
              border: '1px solid #2d2d2d',
              borderRadius: '6px',
              color: 'var(--student-text-muted)',
              padding: '6px 12px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Show all jobs
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search any role — sales, marketing, engineer..."
        value={searchQuery}
        onChange={e => handleSearchChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: "var(--student-surface)",
          border: "1px solid #2d2d2d",
          borderRadius: "8px",
          color: "var(--student-text)",
          fontSize: "14px",
          marginBottom: "1.5rem",
          outline: "none",
        }}
      />

      {error && (
        <div style={{
          background: '#2d1b1b',
          border: '1px solid #da363333',
          borderRadius: '8px',
          padding: '14px 18px',
          color: '#f85149',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Confirmation Modal — fires on tab return ─────────────────────── */}
      {confirmJob && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--student-surface)', border: '1px solid var(--student-text-dim)',
            borderRadius: '14px', padding: '28px 32px',
            maxWidth: '420px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: 'var(--student-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Application check
            </p>
            <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: 'var(--student-text)', lineHeight: 1.4 }}>
              Did you apply to this job?
            </h2>
            <div style={{
              background: 'var(--student-bg)', border: '1px solid #2d2d2d',
              borderRadius: '8px', padding: '12px 14px', margin: '16px 0 24px',
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--student-text)' }}>{confirmJob.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--student-text-muted)' }}>{confirmJob.company} · {confirmJob.location}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                disabled={applyingIds.has(confirmJob.applyUrl)}
                onClick={async () => {
                  if (!user?.id) return;
                  const job = confirmJob;
                  setApplyingIds(prev => new Set(prev).add(job.applyUrl));
                  try {
                    await applicationsApi.trackJobBoardApplication(user.id, {
                      applyUrl: job.applyUrl, title: job.title,
                      company: job.company, salary: job.salary,
                      description: job.description,
                    });
                    setAppliedIds(prev => new Set(prev).add(job.applyUrl));
                    setPendingJobs(prev => prev.filter(j => j.applyUrl !== job.applyUrl));
                    setConfirmJob(null);
                  } catch (e) {
                    console.error('Failed to track:', e);
                  } finally {
                    setApplyingIds(prev => { const s = new Set(prev); s.delete(job.applyUrl); return s; });
                  }
                }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: applyingIds.has(confirmJob.applyUrl) ? '#1a2e22' : '#238636',
                  color: '#fff', border: 'none', fontSize: '14px', fontWeight: 500,
                  cursor: applyingIds.has(confirmJob.applyUrl) ? 'wait' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {applyingIds.has(confirmJob.applyUrl) ? 'Saving…' : '✓ Yes, I Applied'}
              </button>
              <button
                onClick={() => {
                  setPendingJobs(prev => prev.filter(j => j.applyUrl !== confirmJob.applyUrl));
                  setConfirmJob(null);
                }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: 'transparent', color: 'var(--student-text-muted)',
                  border: '1px solid var(--student-text-dim)', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                No, just browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--student-text-muted)" }}>Loading jobs...</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ color: 'var(--student-text-muted)', fontSize: '13px', margin: 0 }}>
              {searchQuery
                ? `Showing results for "${searchQuery}"`
                : `Skills: ${userSkills.join(', ') || 'Not set — add skills for better matches'}`
              }
              {' · '}{filtered.length} jobs found
            </p>
            <button
              onClick={() => navigate('/skills')}
              style={{
                background: '#a78bfa18', color: '#a78bfa',
                border: '1px solid #a78bfa40', borderRadius: '6px',
                padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              ✏ Edit Skills
            </button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: 'var(--student-text-muted)', fontSize: '14px', marginBottom: '12px' }}>
                {userSkills.length === 0
                  ? 'No skills set on your profile — add skills to see matched jobs, or use the search bar above.'
                  : 'No jobs found. Try clearing filters or searching a different role.'}
              </p>
              {userSkills.length === 0 && (
                <button
                  onClick={() => navigate('/skills')}
                  style={{
                    background: '#a78bfa', color: 'var(--student-bg)',
                    border: 'none', borderRadius: '8px',
                    padding: '8px 20px', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Add Skills →
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filtered.map((job) => (
                <div
                  key={job.id}
                  style={{
                    background: "var(--student-surface)",
                    border: "1px solid var(--student-border)",
                    borderRadius: "10px",
                    padding: "1.2rem",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    cursor: "default",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(47,129,247,0.45)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,129,247,0.08)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--student-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>{job.title}</h3>
                      <p style={{ color: "var(--student-text-secondary)", fontSize: "14px", fontWeight: 500 }}>{job.company} · {job.location}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginLeft: '1rem', flexShrink: 0 }}>
                      {appliedIds.has(job.applyUrl) ? (
                        <span style={{
                          background: '#0d1117', color: '#2f81f7',
                          border: '1px solid rgba(47,129,247,0.35)',
                          padding: '6px 14px', borderRadius: '6px',
                          fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 600
                        }}>✓ Applied</span>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              window.open(job.applyUrl, '_blank', 'noreferrer');
                              setPendingJobs(prev =>
                                prev.some(j => j.applyUrl === job.applyUrl) ? prev : [...prev, job]
                              );
                            }}
                            style={{
                              background: pendingJobs.some(j => j.applyUrl === job.applyUrl) ? '#161b22' : '#1f6feb',
                              color: pendingJobs.some(j => j.applyUrl === job.applyUrl) ? '#2f81f7' : '#ffffff',
                              border: pendingJobs.some(j => j.applyUrl === job.applyUrl) ? '1px solid rgba(47,129,247,0.35)' : 'none',
                              padding: '6px 16px', borderRadius: '6px', fontSize: '13px',
                              cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '90px',
                              transition: 'all 0.2s ease', fontWeight: 600,
                            }}
                          >
                            {pendingJobs.some(j => j.applyUrl === job.applyUrl) ? 'Open Again ↗' : 'Apply Remote'}
                          </button>
                          {pendingJobs.some(j => j.applyUrl === job.applyUrl) && (
                            <button
                              onClick={() => setConfirmJob(job)}
                              style={{
                                background: 'transparent', color: '#3fb950',
                                border: '1px solid #23863655',
                                padding: '4px 12px', borderRadius: '6px',
                                fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >✓ I Applied</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {job.salary && job.salary.toLowerCase() !== "not listed" && (
                    <div style={{ marginTop: "8px" }}>
                      <span style={{
                        background: "var(--student-border)",
                        color: "var(--student-text-muted)",
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "20px",
                      }}>
                        {job.salary}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}