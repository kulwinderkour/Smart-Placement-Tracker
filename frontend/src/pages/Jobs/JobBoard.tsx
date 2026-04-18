import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  posted?: string;
  applyUrl?: string;
  source?: string;
  description?: string;
  score?: number;
  matchScore?: number;
  matchedSkills?: string[];
  job_apply_link?: string; // JSearch field
}

const JobCard = ({ job }: { job: Job }) => (
  <div style={{
    background: 'var(--student-surface)',
    border: '1px solid #21262d',
    borderRadius: '10px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'border-color 0.15s'
  }}
  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--student-border)')}
  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--student-border)')}
  >
    {/* Header row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '8px',
          background: 'var(--student-border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--student-text-muted)', fontWeight: 600, fontSize: '16px'
        }}>
          {job.company?.charAt(0) || 'J'}
        </div>
        <div>
          <div style={{ color: 'var(--student-text)', fontSize: '14px', fontWeight: 600 }}>{job.title}</div>
          <div style={{ color: 'var(--student-text-muted)', fontSize: '12px', marginTop: '2px' }}>{job.company} · {job.location}</div>
        </div>
      </div>
      {/* Match score badge */}
      <div style={{
        background: (job.matchScore ?? 0) >= 70 ? '#1a2e22' : (job.matchScore ?? 0) >= 40 ? '#2d2208' : 'var(--student-border)',
        color: (job.matchScore ?? 0) >= 70 ? '#3fb950' : (job.matchScore ?? 0) >= 40 ? '#d29922' : 'var(--student-text-muted)',
        border: `1px solid ${(job.matchScore ?? 0) >= 70 ? '#23863633' : (job.matchScore ?? 0) >= 40 ? '#9e6a0333' : 'var(--student-border)'}`,
        borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600,
        height: 'fit-content'
      }}>
        {job.matchScore}% match
      </div>
    </div>

    {/* Matched skills row */}
    {job.matchedSkills && job.matchedSkills.length > 0 && (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {job.matchedSkills.map(skill => (
          <span key={skill} style={{
            background: '#a78bfa18', color: '#a78bfa',
            border: '1px solid #a78bfa33', borderRadius: '4px',
            padding: '2px 8px', fontSize: '11px'
          }}>
            ✓ {skill}
          </span>
        ))}
      </div>
    )}

    {/* Footer row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <span style={{ color: 'var(--student-text-muted)', fontSize: '12px' }}>{job.salary || 'Salary not listed'}</span>
        <span style={{ color: 'var(--student-text-dim)', fontSize: '12px' }}>{job.posted || 'Recently'}</span>
        <span style={{
          background: 'var(--student-border)', color: 'var(--student-text-muted)',
          borderRadius: '4px', padding: '2px 8px', fontSize: '11px'
        }}>
          {job.source || 'JSearch'}
        </span>
      </div>
      <a href={job.applyUrl || job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{
        background: '#a78bfa', color: 'var(--student-bg)',
        borderRadius: '6px', padding: '6px 14px',
        fontSize: '12px', fontWeight: 600,
        textDecoration: 'none'
      }}>
        Apply →
      </a>
    </div>
  </div>
);

const SkeletonJobCard = () => (
  <div className="skeleton" style={{
    background: 'var(--student-surface)',
    border: '1px solid #21262d',
    borderRadius: '10px',
    padding: '20px',
    height: '140px',
    marginBottom: '16px'
  }} />
);

const JobBoard = () => {
  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const userSkills = profile.skills || [];
  const jobType = profile.jobType || 'Both';
  const { user } = useAuthStore();
  const firstName = profile.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Member';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: 'all',
    type: 'all',
    matchOnly: true
  });

  const loadJobs = async () => {
    setLoading(true);
    try {
      // 1. Fetch from JSearch API
      const jsearchJobs = await fetchJSearchJobs(userSkills, jobType);

      // 2. Fetch from Internshala Node.js scraper
      const internshalaJobs = await fetch(
        `${import.meta.env.VITE_SCRAPER_API_URL || 'http://localhost:8081/api/jobs'}/internshala?skills=${userSkills.join(',')}`
      ).then(r => r.json()).catch(() => []);

      // 3. Merge and process
      const allJobs = [...jsearchJobs, ...internshalaJobs]
        .map(job => ({
          ...job,
          matchScore: calculateMatchScore(job, userSkills),
          matchedSkills: getMatchedSkills(job, userSkills)
        }))
        .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

      setJobs(allJobs);
    } catch (err) {
      console.error('Job loading error:', err);
    }
    setLoading(false);
  };

  const fetchJSearchJobs = async (skills: string[], type: string) => {
    const query = (skills.length > 0 ? skills.slice(0, 3).join(' ') : 'software') + ' developer India';
    const response = await fetch(
      `${import.meta.env.VITE_RAPIDAPI_URL}/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&country=in&date_posted=week`,
      {
        headers: {
          'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      }
    );
    const data = await response.json();
    return (data.data || []).map((j: any) => ({
      ...j,
      title: j.job_title,
      company: j.employer_name,
      location: j.job_city || j.job_state || 'India',
      source: 'JSearch'
    }));
  };

  const calculateMatchScore = (job: any, userSkills: string[]) => {
    const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
    const commonMatches = userSkills.filter(skill => jobText.includes(skill.toLowerCase()));
    return Math.round((commonMatches.length / Math.max(userSkills.length, 1)) * 100);
  };

  const getMatchedSkills = (job: any, userSkills: string[]) => {
    const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
    return userSkills.filter(skill => jobText.includes(skill.toLowerCase()));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filters.location === 'all' || job.location.toLowerCase().includes(filters.location.toLowerCase());
    const matchesType = filters.type === 'all' || job.source === filters.type;
    const matchesSkill = !filters.matchOnly || (job.matchScore ?? 0) >= 30;
    return matchesSearch && matchesLocation && matchesType && matchesSkill;
  });

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--student-bg)' }}>
      <style>{`
        .skeleton {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 10px;
          padding: 20px;
          animation: pulse 1.5s ease infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'var(--student-bg)', borderBottom: '1px solid #21262d',
        padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--student-text)' }}>Job Board</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--student-text-muted)' }}>
            Live job opportunities curated for your profile
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={loadJobs} style={{
            background: 'transparent', border: '1px solid #21262d', color: 'var(--student-text)',
            borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer'
          }}>
            Refresh
          </button>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#a78bfa22', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
            {firstName[0].toUpperCase()}
          </div>
        </div>
      </header>

      <div style={{ padding: '20px 28px' }}>
        {/* Banner Section */}
        <div style={{ 
          background: 'var(--student-surface)', border: '1px solid #21262d', borderRadius: '10px', 
          padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--student-text-muted)' }}>Jobs matching your core skills:</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {userSkills.map(s => (
                <span key={s} style={{ 
                  background: '#a78bfa18', color: '#a78bfa', border: '1px solid #a78bfa33', 
                  borderRadius: '4px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 
                }}>{s}</span>
              ))}
            </div>
          </div>
          <Link to="/profile" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none', fontWeight: 500 }}>
            Edit skills →
          </Link>
        </div>

        {/* Filters Bar */}
        <div style={{ 
          display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap',
          background: 'var(--student-surface)', padding: '12px', borderRadius: '10px', border: '1px solid #21262d'
        }}>
          <div style={{ flex: 1, minWidth: '200px', background: 'var(--student-bg)', borderRadius: '6px', border: '1px solid #21262d', padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--student-text-muted)" strokeWidth="2.5" style={{ marginRight: '8px' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input 
              placeholder="Search companies or titles..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--student-text)', fontSize: '13px', outline: 'none', width: '100%' }}
            />
          </div>
          <select 
            value={filters.location}
            onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
            style={{ background: 'var(--student-bg)', border: '1px solid #21262d', color: 'var(--student-text)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
          >
            <option value="all">Anywhere</option>
            <option value="Remote">Remote</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Delhi">Delhi</option>
            <option value="Mumbai">Mumbai</option>
          </select>
          <select 
            value={filters.type}
            onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
            style={{ background: 'var(--student-bg)', border: '1px solid #21262d', color: 'var(--student-text)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
          >
            <option value="all">All Sources</option>
            <option value="JSearch">JSearch</option>
            <option value="Internshala">Internshala</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--student-text)' }}>
            <input 
              type="checkbox" 
              checked={filters.matchOnly} 
              onChange={e => setFilters(prev => ({ ...prev, matchOnly: e.target.checked }))}
            />
            Matched Skills Only
          </label>
        </div>

        {/* Jobs List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            Array(6).fill(0).map((_, i) => <SkeletonJobCard key={i} />)
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job, idx) => <JobCard key={idx} job={job} />)
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ color: 'var(--student-text-muted)', fontSize: '14px' }}>No jobs found matching your current filters.</p>
              <button 
                onClick={() => { setSearchQuery(''); setFilters({ location: 'all', type: 'all', matchOnly: false }); }}
                style={{ background: 'none', border: 'none', color: '#58a6ff', marginTop: '12px', cursor: 'pointer', fontSize: '13px' }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobBoard;
