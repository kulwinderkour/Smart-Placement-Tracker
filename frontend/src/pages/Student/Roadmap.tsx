import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  Loader2, 
  Sparkles, 
  Search, 
  ChevronRight, 
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
      case 'beginner': return '#a78bfa';
      case 'intermediate': return '#f1a732';
      case 'advanced': return '#f85149';
      default: return 'var(--student-text-muted)';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: 'calc(100vh - 64px)', 
      background: 'var(--student-bg)', 
      color: 'var(--student-text)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Sidebar - Recent Roadmaps */}
      <aside style={{
        width: '280px',
        background: 'var(--student-bg)',
        borderRight: '1px solid #2d2d2d',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--student-text-muted)' }}>
          <History size={16} />
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Roadmaps
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentRoadmaps.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--student-text-dim)', fontStyle: 'italic', margin: '20px 0' }}>
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
                  color: 'var(--student-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--student-surface)';
                  e.currentTarget.style.color = 'var(--student-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--student-text-muted)';
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
          
          {/* Top Title */}
          <div style={{
            width: '100%',
            textAlign: 'center',
            background: 'var(--student-surface)',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '20px'
          }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 800, 
              margin: 0,
              letterSpacing: '-0.01em'
            }}>
              AI-Powered Roadmap Generator
            </h1>
          </div>

          {/* Search & Generate */}
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
              <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--student-text-muted)' }} />
              <input 
                type="text"
                placeholder="Full Stack Developer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateRoadmap()}
                style={{
                  width: '100%',
                  background: 'var(--student-surface)',
                  border: '1px solid var(--student-text-dim)',
                  borderRadius: '10px',
                  padding: '12px 16px 12px 48px',
                  color: 'var(--student-text)',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#a78bfa'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--student-text-dim)'}
              />
            </div>
            <button
              onClick={() => generateRoadmap()}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#a78bfa',
                color: 'var(--student-bg)',
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
            <div style={{ marginTop: '20px' }} />
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <Loader2 size={48} className="animate-spin" style={{ color: '#a78bfa', margin: '0 auto 24px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Building your roadmap...</h2>
              <p style={{ color: 'var(--student-text-muted)', marginTop: '8px' }}>Gemini is curating the best resources for you.</p>
            </div>
          )}

          {/* Roadmap Result */}
          {roadmap && !loading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div style={{ 
                background: 'var(--student-surface)', 
                border: '1px solid var(--student-text-dim)', 
                borderRadius: '16px', 
                padding: '32px',
                marginBottom: '40px'
              }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{roadmap.title}</h1>
                <p style={{ color: 'var(--student-text-muted)', fontSize: '15px', lineHeight: 1.5 }}>{roadmap.description}</p>
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
                        background: '#a78bfa20', 
                        color: '#a78bfa',
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
                            background: 'var(--student-surface)',
                            border: '1px solid #2d2d2d',
                            borderRadius: '12px',
                            padding: '20px',
                            transition: 'border-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--student-text-dim)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--student-border)'}
                        >
                          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{topic.title}</h4>
                          <p style={{ fontSize: '13px', color: 'var(--student-text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
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
