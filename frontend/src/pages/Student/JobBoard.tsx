import { useEffect, useState, useRef } from "react";



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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    field: '',        // job field/domain
    location: '',     // city filter
    type: '',         // Full-time / Internship / Remote
    experience: '',   // Fresher / 1-3 years / 3+ years
    salary: '',       // Any / Paid only
  });

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

    // Debug check
    if (!key || key === 'undefined' || key.length < 10) {
      setError('RapidAPI key is missing. Add VITE_RAPIDAPI_KEY to your .env file');
      setLoading(false);
      return;
    }

    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const userSkills = profile.skills || [];

      const buildQuery = (field: string, skills: string[], location: string) => {
        if (field) return `${field} jobs ${location || 'india'}`;
        if (skills.length > 0) return `${skills.slice(0, 2).join(' ')} jobs ${location || 'india'}`;
        return `jobs india`;
      };

      const query = buildQuery(fieldOverride || filters.field, userSkills, filters.location);

      console.log('Fetching jobs with query:', query);

      const response = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=2&country=in&date_posted=month`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': key,
            'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          },
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error('API error:', errText);
        setError(`API error ${response.status}: Check your RapidAPI key and subscription`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Jobs received:', data.data?.length, data);

      const mapped = (data.data || []).map((job: any) => ({
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: `${job.job_city || ''} ${job.job_country || ''}`.trim(),
        salary: job.job_min_salary ? `₹${job.job_min_salary} - ₹${job.job_max_salary}` : 'Not listed',
        applyUrl: job.job_apply_link,
        source: 'JSearch',
        description: job.job_description?.substring(0, 200) + '...',
        postedAt: job.job_posted_at_datetime_utc,
        employmentType: job.job_employment_type,
      }));

      if (mapped.length === 0) {
        const remotiveJobs = await fetchRemotiveJobs(userSkills.length > 0 ? userSkills : ['software developer']);
        setJobs(remotiveJobs);
      } else {
        setJobs(mapped);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(`Network error: ${err.message}. Is your internet on?`);
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
      if (type === 'remote' && !loc?.includes('remote') && !titleDesc.includes('remote')) return false;
      if (type === 'internship' && !titleDesc.includes('intern')) return false;
      if (type === 'full-time' && !empType.includes('fulltime') && !empType.includes('full_time')) return false;
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
      <div style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        border: "1px solid #21262d",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "4px", display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <p style={{ color: "#7d8590", fontSize: "13px", margin: 0 }}>Live job opportunities curated for your profile</p>
        </div>
        <button
          onClick={() => fetchJobs()}
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '6px',
            color: '#7d8590',
            padding: '7px 14px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          ↻ Refresh
        </button>
      </div>

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
        {QUICK_FIELDS.map(field => (
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

      {loading ? (
        <p style={{ color: "#8b949e" }}>Loading jobs...</p>
      ) : (
        <>
          <p style={{ color: '#7d8590', fontSize: '13px', marginBottom: '12px' }}>
            {filters.field || searchQuery
              ? `Showing results for "${filters.field || searchQuery}"`
              : `Showing jobs matched to your profile skills: ${userSkills.join(', ') || 'Not set'}`
            }
            {' · '}{filtered.length} jobs found
          </p>

          {filtered.length === 0 ? (
            <p style={{ color: "#8b949e" }}>No jobs found.</p>
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
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: "#238636",
                        color: "#fff",
                        padding: "6px 16px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        marginLeft: "1rem",
                      }}
                    >
                      Apply →
                    </a>
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