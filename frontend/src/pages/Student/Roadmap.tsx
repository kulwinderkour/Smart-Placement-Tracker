import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Sparkles, BookOpen, ChevronRight, Calendar, Target, TrendingUp, User, GraduationCap, Award } from 'lucide-react';

// Types
interface UserProfile {
  skills: string[];
  branch: string;
  cgpa: number;
  preferredRole: string;
}

interface WeekPlan {
  week: number;
  title: string;
  description: string;
  topics: string[];
  resources: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface RoadmapData {
  title: string;
  description: string;
  totalWeeks: number;
  weeks: WeekPlan[];
}

interface RoadmapResponse {
  id: number;
  user_id: string;
  role: string;
  skills: string[];
  roadmap_data: RoadmapData;
  created_at: string;
  updated_at: string;
}

export default function Roadmap() {
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myRoadmaps, setMyRoadmaps] = useState<RoadmapResponse[]>([]);
  const { token } = useAuthStore();

  // Load user profile from localStorage
  useEffect(() => {
    const profile = localStorage.getItem('userProfile');
    if (profile) {
      try {
        setUserProfile(JSON.parse(profile));
      } catch (err) {
        console.error('Failed to parse user profile:', err);
      }
    }
  }, []);

  // Load user's existing roadmaps
  const loadMyRoadmaps = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/roadmap/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const roadmaps = await response.json();
        setMyRoadmaps(roadmaps);
      }
    } catch (err) {
      console.error('Failed to load roadmaps:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadMyRoadmaps();
    }
  }, [token]);

  // Generate personalized roadmap using backend API
  const generateRoadmap = async () => {
    if (!userProfile) {
      setError('Please complete your profile first');
      return;
    }

    if (!token) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/roadmap/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: userProfile.preferredRole,
          skills: userProfile.skills,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const roadmapData: RoadmapResponse = await response.json();
      setRoadmap(roadmapData);
      
      // Reload roadmaps list
      await loadMyRoadmaps();
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate roadmap: ${msg}`);
      console.error('Roadmap generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load saved roadmap on mount
  useEffect(() => {
    const saved = localStorage.getItem('generatedRoadmap');
    if (saved) {
      try {
        setRoadmap(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse saved roadmap:', err);
      }
    }
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#3fb950';
      case 'intermediate': return '#f1a732';
      case 'advanced': return '#f85149';
      default: return '#7d8590';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#1a2e22';
      case 'intermediate': return '#2d1f1b';
      case 'advanced': return '#2d1b1b';
      default: return '#161b22';
    }
  };

  const selectRoadmap = (roadmapData: RoadmapResponse) => {
    setRoadmap(roadmapData);
    localStorage.setItem('generatedRoadmap', JSON.stringify(roadmapData));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3' }}>
      {/* Header */}
      <header style={{
        padding: '20px',
        borderBottom: '1px solid #21262d',
        background: '#0d1117'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px' }}>Prep Roadmap</h1>
            <p style={{ fontSize: '14px', color: '#7d8590', margin: 0 }}>
              AI-powered personalized learning path
            </p>
          </div>
          
          <button
            onClick={generateRoadmap}
            disabled={loading || !userProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: loading || !userProfile ? '#21262d' : '#20c997',
              color: loading || !userProfile ? '#484f58' : '#0d1117',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !userProfile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating...' : 'Generate Roadmap'}
          </button>
        </div>
      </header>

      {/* User Profile Summary */}
      {userProfile && (
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #21262d',
          background: '#161b22'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={20} color="#7d8590" />
              <div>
                <div style={{ fontSize: '12px', color: '#7d8590', marginBottom: '2px' }}>Target Role</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{userProfile.preferredRole}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <GraduationCap size={20} color="#7d8590" />
              <div>
                <div style={{ fontSize: '12px', color: '#7d8590', marginBottom: '2px' }}>Branch</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{userProfile.branch}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Award size={20} color="#7d8590" />
              <div>
                <div style={{ fontSize: '12px', color: '#7d8590', marginBottom: '2px' }}>CGPA</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{userProfile.cgpa}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Target size={20} color="#7d8590" />
              <div>
                <div style={{ fontSize: '12px', color: '#7d8590', marginBottom: '2px' }}>Skills</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  {userProfile.skills.slice(0, 3).join(', ')}
                  {userProfile.skills.length > 3 && ` +${userProfile.skills.length - 3}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Error Display */}
          {error && (
            <div style={{
              background: '#2d1b1b',
              border: '1px solid #da3633',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#f85149',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* My Roadmaps */}
          {myRoadmaps.length > 0 && !roadmap && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px', color: '#e6edf3' }}>
                Your Saved Roadmaps
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {myRoadmaps.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => selectRoadmap(r)}
                    style={{
                      background: '#161b22',
                      border: '1px solid #21262d',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#20c997';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#21262d';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', color: '#e6edf3' }}>
                      {r.roadmap_data.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#7d8590', margin: '0 0 12px', lineHeight: 1.4 }}>
                      {r.roadmap_data.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#7d8590' }}>
                      <span>{r.role}</span>
                      <span>•</span>
                      <span>{r.roadmap_data.totalWeeks} weeks</span>
                      <span>•</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!roadmap && !loading && myRoadmaps.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                background: '#20c99718',
                color: '#20c997',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <BookOpen size={40} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 12px' }}>
                Your Personalized Roadmap Awaits
              </h2>
              <p style={{ fontSize: '14px', color: '#7d8590', lineHeight: 1.6, margin: '0 0 32px' }}>
                Get a week-by-week learning plan tailored to your skills, branch, and career goals. 
                Generated by AI using your unique profile.
              </p>
              {!userProfile && (
                <p style={{ fontSize: '14px', color: '#f85149' }}>
                  Please complete your profile first to generate a personalized roadmap.
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '12px'
            }}>
              <Loader2 size={40} className="animate-spin" style={{ color: '#20c997', margin: '0 auto 20px' }} />
              <p style={{ fontSize: '16px', color: '#e6edf3' }}>Generating your personalized roadmap...</p>
              <p style={{ fontSize: '14px', color: '#7d8590', marginTop: '8px' }}>
                This may take a few moments as AI analyzes your profile
              </p>
            </div>
          )}

          {/* Roadmap Display */}
          {roadmap && (
            <div>
              {/* Header */}
              <div style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px' }}>
                  {roadmap.roadmap_data.title}
                </h2>
                <p style={{ fontSize: '14px', color: '#7d8590', margin: '0 0 16px' }}>
                  {roadmap.roadmap_data.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="#7d8590" />
                    <span style={{ fontSize: '14px', color: '#7d8590' }}>
                      {roadmap.roadmap_data.totalWeeks} weeks
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} color="#20c997" />
                    <span style={{ fontSize: '14px', color: '#20c997' }}>
                      Progressive learning
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="#7d8590" />
                    <span style={{ fontSize: '14px', color: '#7d8590' }}>
                      {roadmap.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Week Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                {roadmap.roadmap_data.weeks.map((week) => (
                  <div
                    key={week.week}
                    style={{
                      background: '#161b22',
                      border: '1px solid #21262d',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#20c997';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#21262d';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Week Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>
                          {week.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#7d8590', margin: 0, lineHeight: 1.4 }}>
                          {week.description}
                        </p>
                      </div>
                      <span style={{
                        background: getDifficultyBg(week.difficulty),
                        color: getDifficultyColor(week.difficulty),
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {week.difficulty}
                      </span>
                    </div>

                    {/* Topics */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#7d8590', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Topics
                      </h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {week.topics.map((topic, index) => (
                          <li key={index} style={{
                            fontSize: '13px',
                            color: '#e6edf3',
                            marginBottom: '4px',
                            paddingLeft: '16px',
                            position: 'relative'
                          }}>
                            <span style={{
                              position: 'absolute',
                              left: 0,
                              top: '6px',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#20c997'
                            }} />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resources */}
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#7d8590', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Resources
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {week.resources.map((resource, index) => (
                          <div key={index} style={{
                            fontSize: '12px',
                            color: '#58a6ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <ChevronRight size={12} />
                            {resource}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
