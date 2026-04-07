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

const JOB_FIELDS = {
  "💻 Tech": [
    { value: "software developer", label: "Software Developer" },
    { value: "frontend developer", label: "Frontend Developer" },
    { value: "backend developer", label: "Backend Developer" },
    { value: "full stack developer", label: "Full Stack Developer" },
    { value: "data scientist", label: "Data Science" },
    { value: "machine learning engineer", label: "ML / AI Engineer" },
    { value: "data analyst", label: "Data Analyst" },
    { value: "devops engineer", label: "DevOps / Cloud" },
    { value: "android developer", label: "Android Developer" },
    { value: "ios developer", label: "iOS Developer" },
    { value: "cybersecurity analyst", label: "Cybersecurity" },
    { value: "blockchain developer", label: "Blockchain" },
    { value: "ui ux designer", label: "UI/UX Designer" },
  ],
  "📊 Business": [
    { value: "business analyst", label: "Business Analyst" },
    { value: "product manager", label: "Product Manager" },
    { value: "project manager", label: "Project Manager" },
    { value: "management consultant", label: "Management Consultant" },
    { value: "operations manager", label: "Operations Manager" },
    { value: "supply chain analyst", label: "Supply Chain" },
  ],
  "📣 Marketing & Sales": [
    { value: "digital marketing", label: "Digital Marketing" },
    { value: "sales executive", label: "Sales Executive" },
    { value: "content marketing", label: "Content Marketing" },
    { value: "seo specialist", label: "SEO Specialist" },
    { value: "social media manager", label: "Social Media Manager" },
    { value: "brand manager", label: "Brand Manager" },
    { value: "growth hacker", label: "Growth Hacking" },
    { value: "business development", label: "Business Development" },
    { value: "account manager", label: "Account Manager" },
  ],
  "💰 Finance": [
    { value: "financial analyst", label: "Financial Analyst" },
    { value: "investment banking", label: "Investment Banking" },
    { value: "chartered accountant", label: "CA / Accounting" },
    { value: "risk analyst", label: "Risk Analyst" },
    { value: "equity research analyst", label: "Equity Research" },
    { value: "fintech", label: "Fintech" },
  ],
  "🏥 Healthcare": [
    { value: "healthcare analyst", label: "Healthcare Analyst" },
    { value: "clinical research", label: "Clinical Research" },
    { value: "hospital management", label: "Hospital Management" },
    { value: "pharmacist", label: "Pharmacist" },
  ],
  "⚖️ Legal & HR": [
    { value: "human resources", label: "Human Resources" },
    { value: "talent acquisition", label: "Talent Acquisition" },
    { value: "legal analyst", label: "Legal Analyst" },
    { value: "corporate law", label: "Corporate Law" },
    { value: "compliance officer", label: "Compliance" },
  ],
  "🎨 Creative": [
    { value: "graphic designer", label: "Graphic Designer" },
    { value: "video editor", label: "Video Editor" },
    { value: "content writer", label: "Content Writer" },
    { value: "copywriter", label: "Copywriter" },
    { value: "motion graphics", label: "Motion Graphics" },
    { value: "photography", label: "Photography" },
  ],
  "🏗️ Engineering": [
    { value: "mechanical engineer", label: "Mechanical Engineer" },
    { value: "civil engineer", label: "Civil Engineer" },
    { value: "electrical engineer", label: "Electrical Engineer" },
    { value: "chemical engineer", label: "Chemical Engineer" },
    { value: "manufacturing engineer", label: "Manufacturing" },
  ],
};

const QUICK_FIELDS = [
  '🔥 Trending', 'Software Developer', 'Data Science',
  'Digital Marketing', 'Sales Executive', 'Product Manager',
  'Financial Analyst', 'UI/UX Designer', 'Human Resources'
];

export default function JobBoard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [confirmJob, setConfirmJob] = useState<Job | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [dynamicQuickFields, setDynamicQuickFields] = useState<string[]>(QUICK_FIELDS);
  const [filters, setFilters] = useState({
    field: '',        // job field/domain
    location: '',     // city filter
    type: '',         // Full-time / Internship / Remote
    experience: '',   // Fresher / 1-3 years / 3+ years
    salary: '',       // Any / Paid only
  });

  const navigate = useNavigate();

  const searchTimeout = useRef<any>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounce API call by 600ms
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (value.length > 2) {
        fetchJobsByField(value); // search term becomes the query
      }
    }, 600);
  };

  useEffect(() => {
    fetchJobs();
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const field = profile.branch || 'Software';
    fetch(`http://localhost:8081/api/skills/suggestions?field=${field}`)
      .then(res => res.json())
      .then(data => {
        if (data.skills) setDynamicQuickFields(['🔥 Trending', ...data.skills.slice(0, 8)]);
      })
      .catch(() => {});
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

  const fetchRemotiveJobs = async (skills: string[]) => {
    try {
      const skill = skills[0] || 'developer';
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(skill)}&limit=20`
      );
      const data = await res.json();
      return data.jobs?.map((job: any) => ({
        id: String(job.id),
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Not listed',
        applyUrl: job.url,
        source: 'Remotive',
        description: job.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        employmentType: job.job_type,
      })) || [];
    } catch {
      return [];
    }
  };

  const fetchJobs = async (fieldOverride?: string) => {
    setLoading(true);
    setError('');

    const key = import.meta.env.VITE_RAPIDAPI_KEY;

    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const userSkills = profile.skills || [];
      const city = filters.location || 'India';
      const skillQuery = userSkills.length > 0 ? userSkills.slice(0, 2).join(' ') : 'Software';
      const baseQuery = fieldOverride || filters.field || skillQuery;

      console.log('Searching all sources for:', baseQuery);

      // 1. Fetch from JSearch (RapidAPI)
      let jsearchResults: Job[] = [];
      if (key && key !== 'undefined' && key.length > 5) {
        try {
          const res = await fetch(
            `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(baseQuery + ' jobs in ' + city)}&page=1&num_pages=1&country=in&date_posted=month`,
            { headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' } }
          );
          if (res.ok) {
            const data = await res.json();
            jsearchResults = (data.data || []).map((job: any) => ({
              id: job.job_id,
              title: job.job_title,
              company: job.employer_name,
              location: `${job.job_city || ''} ${job.job_country || ''}`.trim(),
              salary: job.job_min_salary ? `₹${job.job_min_salary} - ₹${job.job_max_salary}` : 'Not listed',
              applyUrl: job.job_apply_link,
              source: 'JSearch',
              description: job.job_description?.substring(0, 200) + '...',
              postedAt: job.job_posted_at_datetime_utc,
              employmentType: job.job_employment_type?.toLowerCase(),
            }));
          }
        } catch (e) {
          console.error('JSearch failed');
        }
      }

      // 2. Fetch from your Internshala scraper
      let internshalaResults: Job[] = [];
      try {
        const res = await fetch(`http://localhost:8081/api/jobs/internshala?skills=${encodeURIComponent(baseQuery)}`);
        if (res.ok) {
          const data = await res.json();
          internshalaResults = data.map((job: any) => ({
            ...job,
            id: `is-${Math.random().toString(36).substr(2, 9)}`,
            employmentType: 'internship'
          }));
        }
      } catch (e) {
        console.error('Internshala scraper not running on 8081');
      }

      // 3. Fallback to Remotive (use search query if available, else skills)
      let remotiveJobs: Job[] = [];
      try {
        const remotiveQuery = baseQuery || (userSkills.length > 0 ? userSkills[0] : 'software');
        remotiveJobs = await fetchRemotiveJobs([remotiveQuery]);
      } catch (e) {}

      const allJobs = [...jsearchResults, ...internshalaResults, ...remotiveJobs];
      console.log('Merged Results:', allJobs.length);
      setJobs(allJobs);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(`Search failed. Please try again.`);
    }

    setLoading(false);
  };

  const fetchJobsByField = (field: string) => {
    fetchJobs(field);
  };

  const filtered = jobs.filter(job => {
    const titleDesc = `${job.title} ${job.description}`.toLowerCase();
    const loc = job.location?.toLowerCase();

    // Search box filter
    if (searchQuery && !titleDesc.includes(searchQuery.toLowerCase()) &&
        !job.company?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Location filter
    if (filters.location && !loc?.includes(filters.location.toLowerCase())) return false;

    // Job type filter
    if (filters.type) {
      const type = filters.type.toLowerCase();
      const empType = job.employmentType?.toLowerCase() || '';
      if (type === 'full-time' || type === 'Full-time') {
        if (!empType.includes('fulltime') && !empType.includes('full_time') && !empType.includes('full-time')) return false;
      }
      if (type === 'internship' || type === 'Internship') {
        if (!titleDesc.includes('intern') && !empType.includes('intern')) return false;
      }
      if (type === 'contract' || type === 'Contract') {
        if (!empType.includes('contract') && !empType.includes('contractor')) return false;
      }
      if (type === 'remote' || type === 'Remote') {
        if (!loc?.includes('remote') && !titleDesc.includes('remote')) return false;
      }
    }

    // Experience filter
    if (filters.experience === 'fresher' &&
      !titleDesc.includes('fresher') &&
      !titleDesc.includes('0-1') &&
      !titleDesc.includes('entry level') &&
      !titleDesc.includes('graduate')) return false;

    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const userSkills = profile.skills || [];

  return (
    <div style={{ padding: "2rem", background: "#0d1117", minHeight: "100vh", color: "#e6edf3" }}>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: '8px',
          color: '#7d8590',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '1rem'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#21262d';
          e.currentTarget.style.color = '#e6edf3';
          e.currentTarget.style.borderColor = '#20c997';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#161b22';
          e.currentTarget.style.color = '#7d8590';
          e.currentTarget.style.borderColor = '#21262d';
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Compact Header */}
      <div style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        border: "1px solid #21262d",
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
            {activeFilterCount > 0 && (
              <span style={{
                background: '#20c99718',
                color: '#20c997',
                border: '1px solid #20c99740',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
              }}>
                {activeFilterCount} active
              </span>
            )}
          </h1>
          <p style={{ color: "#7d8590", fontSize: "12px", margin: 0 }}>Live job opportunities curated for your profile</p>
        </div>
        <button
          onClick={() => fetchJobs()}
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '6px',
            color: '#7d8590',
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          ↻ Refresh
        </button>
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
          background: "#161b22",
          border: "1px solid #21262d",
          borderRadius: "8px",
          color: "#e6edf3",
          fontSize: "14px",
          marginBottom: "1.5rem",
          outline: "none",
        }}
      />

      {/* Quick Picks */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {dynamicQuickFields.map(field => (
          <button
            key={field}
            onClick={() => {
              const val = field.startsWith('🔥') ? '' : field.toLowerCase();
              setFilters(f => ({ ...f, field: val }));
              fetchJobsByField(val);
            }}
            style={{
              background: filters.field === field.toLowerCase() ? '#20c99718' : '#161b22',
              border: `1px solid ${filters.field === field.toLowerCase() ? '#20c997' : '#21262d'}`,
              color: filters.field === field.toLowerCase() ? '#20c997' : '#7d8590',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}
          >
            {field}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '16px'
      }}>
        {/* Field dropdown */}
        <select
          value={filters.field}
          onChange={e => {
            setFilters(f => ({ ...f, field: e.target.value }));
            fetchJobsByField(e.target.value);
          }}
          style={{
            background: '#161b22',
            border: `1px solid ${filters.field ? '#20c997' : '#21262d'}`,
            borderRadius: '6px',
            color: filters.field ? '#e6edf3' : '#7d8590',
            padding: '7px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            minWidth: '160px'
          }}
        >
          <option value="">All Fields</option>
          {Object.entries(JOB_FIELDS).map(([group, options]) => (
            <optgroup key={group} label={group}>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Job type pills */}
        {['All', 'Full-time', 'Internship', 'Remote', 'Contract'].map(type => (
          <button
            key={type}
            onClick={() => setFilters(f => ({ ...f, type: type === 'All' ? '' : type }))}
            style={{
              background: filters.type === (type === 'All' ? '' : type) ? '#20c997' : '#161b22',
              color: filters.type === (type === 'All' ? '' : type) ? '#0d1117' : '#7d8590',
              border: `1px solid ${filters.type === (type === 'All' ? '' : type) ? '#20c997' : '#21262d'}`,
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: filters.type === (type === 'All' ? '' : type) ? 600 : 400,
              transition: 'all 0.15s'
            }}
          >
            {type}
          </button>
        ))}

        {/* Experience filter */}
        <select
          value={filters.experience}
          onChange={e => setFilters(f => ({ ...f, experience: e.target.value }))}
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '6px',
            color: filters.experience ? '#e6edf3' : '#7d8590',
            padding: '7px 12px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <option value="">Experience</option>
          <option value="fresher">Fresher / 0 years</option>
          <option value="1 year">1+ years</option>
          <option value="3 years">3+ years</option>
        </select>

        {/* Location filter */}
        <select
          value={filters.location}
          onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '6px',
            color: filters.location ? '#e6edf3' : '#7d8590',
            padding: '7px 12px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <option value="">All Locations</option>
          <option value="bangalore">Bangalore</option>
          <option value="hyderabad">Hyderabad</option>
          <option value="pune">Pune</option>
          <option value="mumbai">Mumbai</option>
          <option value="delhi">Delhi / NCR</option>
          <option value="chennai">Chennai</option>
          <option value="remote">Remote</option>
        </select>

        {/* Clear all filters */}
        {(filters.field || filters.type || filters.location || filters.experience) && (
          <button
            onClick={() => {
              setFilters({ field: '', location: '', type: '', experience: '', salary: '' });
              fetchJobsByField('');
            }}
            style={{
              background: 'transparent',
              border: '1px solid #da363333',
              borderRadius: '6px',
              color: '#f85149',
              padding: '7px 12px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

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
            background: '#161b22', border: '1px solid #30363d',
            borderRadius: '14px', padding: '28px 32px',
            maxWidth: '420px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#7d8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Application check
            </p>
            <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: '#e6edf3', lineHeight: 1.4 }}>
              Did you apply to this job?
            </h2>
            <div style={{
              background: '#0d1117', border: '1px solid #21262d',
              borderRadius: '8px', padding: '12px 14px', margin: '16px 0 24px',
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#e6edf3' }}>{confirmJob.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7d8590' }}>{confirmJob.company} · {confirmJob.location}</p>
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
                  background: 'transparent', color: '#7d8590',
                  border: '1px solid #30363d', fontSize: '14px', fontWeight: 500,
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
        <p style={{ color: "#8b949e" }}>Loading jobs...</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ color: '#7d8590', fontSize: '13px', margin: 0 }}>
              {filters.field || searchQuery
                ? `Showing results for "${filters.field || searchQuery}"`
                : `Skills: ${userSkills.join(', ') || 'Not set — add skills for better matches'}`
              }
              {' · '}{filtered.length} jobs found
            </p>
            <button
              onClick={() => navigate('/skills')}
              style={{
                background: '#20c99718', color: '#20c997',
                border: '1px solid #20c99740', borderRadius: '6px',
                padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              ✏ Edit Skills
            </button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#7d8590', fontSize: '14px', marginBottom: '12px' }}>
                {userSkills.length === 0
                  ? 'No skills set on your profile — add skills to see matched jobs, or use the search bar above.'
                  : 'No jobs found. Try clearing filters or searching a different role.'}
              </p>
              {userSkills.length === 0 && (
                <button
                  onClick={() => navigate('/skills')}
                  style={{
                    background: '#20c997', color: '#0d1117',
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
                    background: "#161b22",
                    border: "1px solid #21262d",
                    borderRadius: "10px",
                    padding: "1.2rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>{job.title}</h3>
                      <p style={{ color: "#8b949e", fontSize: "14px" }}>{job.company} · {job.location}</p>
                      <p style={{ color: "#8b949e", fontSize: "13px", marginTop: "6px" }}>{job.description}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginLeft: '1rem', flexShrink: 0 }}>
                      {appliedIds.has(job.applyUrl) ? (
                        <span style={{
                          background: '#1a2e22', color: '#3fb950',
                          border: '1px solid #23863633',
                          padding: '6px 14px', borderRadius: '6px',
                          fontSize: '13px', whiteSpace: 'nowrap'
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
                              background: pendingJobs.some(j => j.applyUrl === job.applyUrl) ? '#1c2128' : '#238636',
                              color: pendingJobs.some(j => j.applyUrl === job.applyUrl) ? '#7d8590' : '#fff',
                              border: pendingJobs.some(j => j.applyUrl === job.applyUrl) ? '1px solid #30363d' : 'none',
                              padding: '6px 16px', borderRadius: '6px', fontSize: '13px',
                              cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '90px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {pendingJobs.some(j => j.applyUrl === job.applyUrl) ? 'Open Again ↗' : 'Apply →'}
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
                  <div style={{ marginTop: "8px" }}>
                    <span style={{
                      background: "#21262d",
                      color: "#8b949e",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "20px",
                    }}>
                      {job.salary}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}