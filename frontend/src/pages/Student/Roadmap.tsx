import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  Loader2, 
  Sparkles, 
  Search, 
  BookOpen, 
  ChevronRight, 
  Plus, 
  History,
  AlertCircle
} from 'lucide-react';

// Types
interface Topic {
  id: string;
  title: string;
  description: string;
  resources: string[];
}

interface Section {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: Topic[];
}

interface RoadmapData {
  title: string;
  description: string;
  sections: Section[];
}


const SUGGESTED_ROLES = [
  'Full Stack Developer',
  'Cloud Architect',
  'Cybersecurity',
  'ML Engineer',
  'Frontend Developer',
  'Backend Developer'
];

export default function Roadmap() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [error, setError] = useState('');
  const [recentRoadmaps, setRecentRoadmaps] = useState<string[]>([]);
  
  // Load user's saved roadmaps from backend
  const loadRecentRoadmaps = async () => {
    try {
      const res = await apiClient.get('/roadmap/my');
      const names: string[] = (res.data || []).map((r: any) => r.role).filter(Boolean);
      setRecentRoadmaps(names);
    } catch (err) {
      console.error('Failed to load recent roadmaps:', err);
    }
  };

  useEffect(() => {
    loadRecentRoadmaps();
  }, []);

  // Generate roadmap via POST /roadmap/generate (auth required)
  const generateRoadmap = async (field?: string) => {
    const targetField = field || searchTerm;
    if (!targetField) {
      setError('Please enter a role or technology');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/roadmap/generate', { role: targetField, skills: [] });
      const raw = res.data?.roadmap_data ?? res.data?.data ?? res.data;
      // Backend returns { title, description, weeks:[{week,title,description,topics,resources,difficulty}] }
      // Frontend render expects { title, description, sections:[{id,title,level,topics:[{id,title,description,resources}]}] }
      const weeks: any[] = raw?.weeks ?? raw?.sections ?? [];
      const transformed: RoadmapData = {
        title: raw?.title ?? targetField,
        description: raw?.description ?? '',
        sections: weeks.map((w: any) => ({
          id: String(w.week ?? w.id ?? Math.random()),
          title: w.title ?? `Week ${w.week}`,
          level: (w.difficulty ?? w.level ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced',
          topics: (w.topics ?? []).map((t: any, i: number) => ({
            id: `${w.week ?? i}-${i}`,
            title: typeof t === 'string' ? t : t.title,
            description: typeof t === 'object' ? (t.description ?? '') : '',
            resources: typeof t === 'object' ? (t.resources ?? w.resources ?? []) : (w.resources ?? [])
          }))
        }))
      };
      setRoadmap(transformed);
      
      // Update recent list
      if (!recentRoadmaps.includes(targetField)) {
        setRecentRoadmaps(prev => [targetField, ...prev.slice(0, 9)]);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Unknown error';
      setError(`Failed to generate roadmap: ${detail}`);
      console.error('Generation Error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#20c997';
      case 'intermediate': return '#f1a732';
      case 'advanced': return '#f85149';
      default: return '#888888';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: 'calc(100vh - 64px)', 
      background: '#121212', 
      color: '#e0e0e0',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Sidebar - Recent Roadmaps */}
      <aside style={{
        width: '280px',
        background: '#121212',
        borderRight: '1px solid #2d2d2d',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888888' }}>
          <History size={16} />
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Roadmaps
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentRoadmaps.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#555555', fontStyle: 'italic', margin: '20px 0' }}>
              No roadmaps yet.
            </p>
          ) : (
            recentRoadmaps.map((name, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchTerm(name);
                  generateRoadmap(name);
                }}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#888888',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1c1c1c';
                  e.currentTarget.style.color = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#888888';
                }}
              >
                {name}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          {/* Header & Search */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '40px' 
          }}>
            <div style={{ 
              flex: 1, 
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', color: '#888888' }} />
              <input 
                type="text"
                placeholder="Full Stack Developer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateRoadmap()}
                style={{
                  width: '100%',
                  background: '#1c1c1c',
                  border: '1px solid #333333',
                  borderRadius: '10px',
                  padding: '12px 16px 12px 48px',
                  color: '#e0e0e0',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#20c997'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#333333'}
              />
            </div>
            <button
              onClick={() => generateRoadmap()}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#20c997',
                color: '#121212',
                border: 'none',
                borderRadius: '10px',
                padding: '0 24px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, opacity 0.2s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Generate
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#2d1b1b',
              border: '1px solid #da3633',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '32px',
              color: '#f85149',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Initial State */}
          {!roadmap && !loading && (
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#1c1c1c',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: '#20c997',
                border: '1px solid #2d2d2d'
              }}>
                <BookOpen size={32} />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>
                AI-Powered Roadmap Generator
              </h1>
              <p style={{ 
                fontSize: '16px', 
                color: '#888888', 
                lineHeight: 1.6, 
                maxWidth: '600px', 
                margin: '0 auto 40px' 
              }}>
                Type any role or technology above and press Enter to get an interactive, 
                fully-personalized learning path generated by Gemini.
              </p>

              {/* Suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                {SUGGESTED_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setSearchTerm(role);
                      generateRoadmap(role);
                    }}
                    style={{
                      background: '#1c1c1c',
                      border: '1px solid #2d2d2d',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      color: '#888888',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#20c997';
                      e.currentTarget.style.color = '#e0e0e0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2d2d2d';
                      e.currentTarget.style.color = '#888888';
                    }}
                  >
                    <Plus size={14} />
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <Loader2 size={48} className="animate-spin" style={{ color: '#20c997', margin: '0 auto 24px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Building your roadmap...</h2>
              <p style={{ color: '#888888', marginTop: '8px' }}>Gemini is curating the best resources for you.</p>
            </div>
          )}

          {/* Roadmap Result */}
          {roadmap && !loading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div style={{ 
                background: '#1c1c1c', 
                border: '1px solid #333333', 
                borderRadius: '16px', 
                padding: '32px',
                marginBottom: '40px'
              }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{roadmap.title}</h1>
                <p style={{ color: '#888888', fontSize: '15px', lineHeight: 1.5 }}>{roadmap.description}</p>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {roadmap.sections.map((section, sIdx) => (
                  <div key={section.id}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      marginBottom: '20px' 
                    }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: '#20c99720', 
                        color: '#20c997',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700
                      }}>
                        {sIdx + 1}
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{section.title}</h3>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        background: `${getLevelColor(section.level)}20`,
                        color: getLevelColor(section.level),
                        borderRadius: '6px',
                        letterSpacing: '0.05em'
                      }}>
                        {section.level}
                      </span>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                      gap: '20px' 
                    }}>
                      {section.topics.map((topic) => (
                        <div 
                          key={topic.id}
                          style={{
                            background: '#1c1c1c',
                            border: '1px solid #2d2d2d',
                            borderRadius: '12px',
                            padding: '20px',
                            transition: 'border-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#333333'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2d2d2d'}
                        >
                          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{topic.title}</h4>
                          <p style={{ fontSize: '13px', color: '#888888', lineHeight: 1.5, marginBottom: '16px' }}>
                            {topic.description}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {topic.resources.map((res, rIdx) => (
                              <div key={rIdx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                color: '#58a6ff'
                              }}>
                                <ChevronRight size={12} />
                                <span style={{ cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{res}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
