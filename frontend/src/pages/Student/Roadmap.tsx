import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  Loader2,
  Sparkles,
  Search,
  ChevronRight,
  History,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Popular Roadmap Catalogue ————————————————————————————————————————————————

const POPULAR_ROADMAPS = [
  { name: 'Frontend',              emoji: '🎨' },
  { name: 'Backend',               emoji: '⚙️' },
  { name: 'Full Stack',            emoji: '🚀' },
  { name: 'DevOps',                emoji: '🛠️' },
  { name: 'DevSecOps',             emoji: '🔐' },
  { name: 'Data Analyst',          emoji: '📊' },
  { name: 'AI Engineer',           emoji: '🤖' },
  { name: 'AI and Data Scientist', emoji: '🧠' },
  { name: 'Data Engineer',         emoji: '🗄️' },
  { name: 'Android',               emoji: '📱' },
  { name: 'Machine Learning',      emoji: '📈' },
  { name: 'PostgreSQL',            emoji: '🐘' },
  { name: 'iOS',                   emoji: '🍎' },
  { name: 'Blockchain',            emoji: '⛓️' },
  { name: 'QA',                    emoji: '✅' },
  { name: 'Software Architect',    emoji: '🏗️' },
  { name: 'Cyber Security',        emoji: '🛡️' },
  { name: 'UX Design',             emoji: '✏️' },
  { name: 'Technical Writer',      emoji: '📝' },
  { name: 'Game Developer',        emoji: '🎮' },
  { name: 'MLOps',                 emoji: '⚗️' },
  { name: 'Product Manager',       emoji: '📋' },
  { name: 'Engineering Manager',   emoji: '👷' },
  { name: 'Developer Relations',   emoji: '🤝' },
];

// ─── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'roadmap_cache_';

function cacheKey(name: string) {
  return CACHE_PREFIX + name.toLowerCase().replace(/\s+/g, '_');
}

function readCache(name: string): RoadmapData | null {
  try {
    const raw = localStorage.getItem(cacheKey(name));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(name: string, data: RoadmapData) {
  try {
    localStorage.setItem(cacheKey(name), JSON.stringify(data));
  } catch {
    // storage full — skip caching silently
  }
}

// ─── Transform raw API response → RoadmapData ─────────────────────────────────

function transformResponse(raw: any, fallbackTitle: string): RoadmapData {
  const weeks: any[] = raw?.weeks ?? raw?.sections ?? [];
  return {
    title: raw?.title ?? fallbackTitle,
    description: raw?.description ?? '',
    sections: weeks.map((w: any) => ({
      id: String(w.week ?? w.id ?? Math.random()),
      title: w.title ?? `Week ${w.week}`,
      level: (w.difficulty ?? w.level ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced',
      topics: (w.topics ?? []).map((t: any, i: number) => ({
        id: `${w.week ?? i}-${i}`,
        title: typeof t === 'string' ? t : t.title,
        description: typeof t === 'object' ? (t.description ?? '') : '',
        resources: typeof t === 'object' ? (t.resources ?? w.resources ?? []) : (w.resources ?? []),
      })),
    })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Roadmap() {
  const [searchTerm, setSearchTerm]     = useState('');
  const [loading, setLoading]           = useState(false);
  const [loadingCard, setLoadingCard]   = useState<string | null>(null);
  const [roadmap, setRoadmap]           = useState<RoadmapData | null>(null);
  const [error, setError]               = useState('');
  const [recentRoadmaps, setRecentRoadmaps] = useState<string[]>([]);

  // Load user's saved roadmaps from backend
  const loadRecentRoadmaps = async () => {
    try {
      const res = await apiClient.get('/roadmap/my');
      const names: string[] = (res.data || []).map((r: any) => r.role).filter(Boolean);
      setRecentRoadmaps(names);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => { loadRecentRoadmaps(); }, []);

  // Core generation (with cache check)
  const fetchAndDisplay = async (targetField: string) => {
    setError('');

    // 1️⃣ Check localStorage cache first
    const cached = readCache(targetField);
    if (cached) {
      setRoadmap(cached);
      addToRecent(targetField);
      return;
    }

    // 2️⃣ Hit the API
    try {
      const res = await apiClient.post('/roadmap/generate', { role: targetField, skills: [] });
      const raw = res.data?.roadmap_data ?? res.data?.data ?? res.data;
      const transformed = transformResponse(raw, targetField);
      writeCache(targetField, transformed);           // cache for next time
      setRoadmap(transformed);
      addToRecent(targetField);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Unknown error';
      setError(`Failed to generate roadmap: ${detail}`);
    }
  };

  const addToRecent = (name: string) => {
    setRecentRoadmaps(prev =>
      prev.includes(name) ? prev : [name, ...prev.slice(0, 9)]
    );
  };

  // Search bar + Generate button handler
  const generateRoadmap = async (field?: string) => {
    const targetField = (field ?? searchTerm).trim();
    if (!targetField) { setError('Please enter a role or technology'); return; }
    setLoading(true);
    await fetchAndDisplay(targetField);
    setLoading(false);
  };

  // Popular card click handler
  const handleCardClick = async (name: string) => {
    setSearchTerm(name);
    setLoadingCard(name);
    await fetchAndDisplay(name);
    setLoadingCard(null);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':     return '#3fb950';
      case 'intermediate': return '#f1a732';
      case 'advanced':     return '#f85149';
      default:             return 'var(--student-text-muted)';
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 64px)',
      background: 'var(--student-bg)',
      color: 'var(--student-text)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside style={{
        width: '240px',
        background: 'var(--student-bg)',
        borderRight: '1px solid var(--student-border)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        flexShrink: 0,
      }}>
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={15} style={{ color: '#2f81f7', flexShrink: 0 }} />
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--student-text)',
          }}>
            Recent Roadmaps
          </span>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentRoadmaps.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--student-text-muted)', fontStyle: 'italic', margin: '8px 0' }}>
              No roadmaps yet.
            </p>
          ) : (
            recentRoadmaps.map((name, index) => (
              <button
                key={index}
                onClick={() => { setSearchTerm(name); handleCardClick(name); }}
                style={{
                  textAlign: 'left',
                  background: 'var(--student-surface)',
                  border: '1px solid var(--student-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--student-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(47,129,247,0.5)';
                  e.currentTarget.style.color = '#2f81f7';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--student-border)';
                  e.currentTarget.style.color = 'var(--student-text)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {name}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* Title */}
          <div style={{
            width: '100%',
            textAlign: 'center',
            background: 'var(--student-surface)',
            border: '1px solid var(--student-border)',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '20px',
          }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              AI-Powered Roadmap Generator
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--student-text-muted)' }}>
              Pick a role below or search any topic to generate your personalised learning path
            </p>
          </div>

          {/* Search & Generate */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', color: 'var(--student-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Full Stack Developer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateRoadmap()}
                style={{
                  width: '100%',
                  background: 'var(--student-surface)',
                  border: '1px solid var(--student-border)',
                  borderRadius: '10px',
                  padding: '11px 14px 11px 42px',
                  color: 'var(--student-text)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#2f81f7')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--student-border)')}
              />
            </div>
            <button
              onClick={() => generateRoadmap()}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#1f6feb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0 22px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                opacity: loading ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#388bfd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1f6feb'; }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generate
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.35)',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '28px',
              color: '#f85149',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state (search bar) */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 size={40} className="animate-spin" style={{ color: '#2f81f7', margin: '0 auto 20px' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Building your roadmap…</h2>
              <p style={{ color: 'var(--student-text-muted)', marginTop: '6px', fontSize: '13px' }}>
                Gemini is curating the best resources for you.
              </p>
            </div>
          )}

          {/* ── Empty state: Popular Roadmap Grid ───────────────────────────── */}
          {!roadmap && !loading && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BookOpen size={15} style={{ color: 'var(--student-text-muted)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--student-text-muted)' }}>
                  Popular Roadmaps
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
              }}>
                {POPULAR_ROADMAPS.map((item) => {
                  const isCached = !!readCache(item.name);
                  const isLoadingThis = loadingCard === item.name;

                  return (
                    <button
                      key={item.name}
                      onClick={() => handleCardClick(item.name)}
                      disabled={!!loadingCard}
                      style={{
                        textAlign: 'left',
                        background: 'var(--student-surface)',
                        border: '1px solid var(--student-border)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: loadingCard ? (isLoadingThis ? 'wait' : 'not-allowed') : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                        opacity: loadingCard && !isLoadingThis ? 0.55 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loadingCard) {
                          e.currentTarget.style.borderColor = 'rgba(47,129,247,0.5)';
                          e.currentTarget.style.background = 'rgba(47,129,247,0.06)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--student-border)';
                        e.currentTarget.style.background = 'var(--student-surface)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.emoji}</span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isLoadingThis ? '#2f81f7' : 'var(--student-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isCached && !isLoadingThis && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#3fb950',
                            background: 'rgba(63,185,80,0.1)',
                            border: '1px solid rgba(63,185,80,0.25)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                          }}>
                            cached
                          </span>
                        )}
                        {isLoadingThis
                          ? <Loader2 size={14} className="animate-spin" style={{ color: '#2f81f7' }} />
                          : <span style={{ fontSize: '14px', color: 'var(--student-text-dim)', opacity: 0.5 }}>›</span>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Roadmap Result ───────────────────────────────────────────────── */}
          {roadmap && !loading && (
            <div>
              {/* Back to grid */}
              <button
                onClick={() => setRoadmap(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--student-text-muted)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--student-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--student-text-muted)')}
              >
                ← Browse all roadmaps
              </button>

              {/* Header card */}
              <div style={{
                background: 'var(--student-surface)',
                border: '1px solid var(--student-border)',
                borderRadius: '14px',
                padding: '28px 32px',
                marginBottom: '36px',
              }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{roadmap.title}</h1>
                <p style={{ color: 'var(--student-text-muted)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {roadmap.description}
                </p>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
                {roadmap.sections.map((section, sIdx) => (
                  <div key={section.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{
                        width: '28px', height: '28px',
                        background: 'rgba(47,129,247,0.12)',
                        color: '#2f81f7',
                        borderRadius: '7px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, flexShrink: 0,
                      }}>
                        {sIdx + 1}
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{section.title}</h3>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        padding: '3px 8px',
                        background: `${getLevelColor(section.level)}18`,
                        color: getLevelColor(section.level),
                        borderRadius: '5px', letterSpacing: '0.05em', flexShrink: 0,
                      }}>
                        {section.level}
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: '16px',
                    }}>
                      {section.topics.map((topic) => (
                        <div
                          key={topic.id}
                          style={{
                            background: 'var(--student-surface)',
                            border: '1px solid var(--student-border)',
                            borderRadius: '10px',
                            padding: '18px',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(47,129,247,0.4)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--student-border)')}
                        >
                          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>{topic.title}</h4>
                          <p style={{ fontSize: '12px', color: 'var(--student-text-muted)', lineHeight: 1.55, marginBottom: '14px', marginTop: 0 }}>
                            {topic.description}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {topic.resources.map((res, rIdx) => (
                              <div key={rIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2f81f7' }}>
                                <ChevronRight size={11} style={{ flexShrink: 0 }} />
                                <span
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  {res}
                                </span>
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
