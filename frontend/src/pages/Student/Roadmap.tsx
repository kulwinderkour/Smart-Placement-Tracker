import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  type Node,
  type Edge,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Loader2, Sparkles, BookOpen, ChevronRight, History } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
interface Topic {
  id: string;
  title: string;
  description: string;
  resources: string[];
}

interface Section {
  id: string;
  title: string;
  level: string;
  topics: Topic[];
}

interface RoadmapData {
  title: string;
  description: string;
  sections: Section[];
}

// ── Constants ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_SCRAPER_URL || 'http://localhost:8081/api';

// ── Component ─────────────────────────────────────────────────────────────
export default function Roadmap() {
  const [field, setField] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [cachedList, setCachedList] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  // ── Fetch Server Cached List ───────────────────────────────────────────
  const fetchServerCached = async () => {
    try {
      const res = await fetch(`${API_BASE}/roadmap/cached`);
      const json = await res.json();
      setCachedList(json.roadmaps || []);
    } catch (err) {
      console.error('Failed to fetch cached roadmaps:', err);
    }
  };

  useEffect(() => {
    fetchServerCached();
  }, []);

  // ── Generate Roadmap ───────────────────────────────────────────────────
  const generateRoadmap = async (targetField: string) => {
    if (!targetField.trim()) return;
    setLoading(true);
    setCacheHit(null);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/roadmap/generate?field=${encodeURIComponent(targetField)}`
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();
      setCacheHit(result.fromCache === true);

      const data: RoadmapData = result.data;
      setRoadmap(data);
      buildGraph(data);

      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem('savedRoadmaps') || '[]');
      const exists = saved.find((r: RoadmapData) => r.title === data.title);
      if (!exists) {
        saved.unshift({ ...data, savedAt: new Date().toISOString() });
        localStorage.setItem('savedRoadmaps', JSON.stringify(saved.slice(0, 15)));
      }

      fetchServerCached();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate roadmap: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Build React Flow Graph ─────────────────────────────────────────────
  const buildGraph = (data: RoadmapData) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const SECTION_SPACING = 340;

    let currentY = 0;
    data.sections.forEach((section, sIdx) => {
      // Section header node
      newNodes.push({
        id: section.id,
        type: 'default',
        position: { x: 380, y: currentY },
        style: {
          background: '#161b22',
          border: '2px solid #20c997',
          borderRadius: '8px',
          width: 240,
          color: '#e6edf3',
          padding: '10px 14px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
        },
        data: {
          label: (
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7d8590', marginBottom: 4 }}>
                {section.level}
              </div>
              <div style={{ fontWeight: 600 }}>{section.title}</div>
            </div>
          ),
        },
      });

      // Animation edge from previous section
      if (sIdx > 0) {
        newEdges.push({
          id: `e-${data.sections[sIdx - 1].id}-${section.id}`,
          source: data.sections[sIdx - 1].id,
          target: section.id,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#20c997' },
          style: { stroke: '#20c997', strokeWidth: 2 },
        });
      }

      // Topic nodes — alternating left/right
      section.topics.forEach((topic, tIdx) => {
        const xPos = tIdx % 2 === 0 ? 80 : 680;
        const topicY = currentY + (tIdx + 1) * 80;

        newNodes.push({
          id: topic.id,
          position: { x: xPos, y: topicY - 26 },
          style: {
            background: '#0d1117',
            border: '1px solid #21262d',
            borderRadius: '6px',
            width: 200,
            color: '#e6edf3',
            padding: '8px 10px',
            fontSize: '11px',
          },
          data: {
            label: (
              <div>
                <div style={{ fontWeight: 600, color: '#20c997', marginBottom: 2 }}>{topic.title}</div>
                <div style={{ fontSize: '10px', color: '#7d8590', lineHeight: 1.4 }}>{topic.description}</div>
              </div>
            ),
          },
        });

        newEdges.push({
          id: `et-${section.id}-${topic.id}`,
          source: section.id,
          target: topic.id,
          style: { stroke: '#21262d', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.Arrow, color: '#484f58' },
        });
      });

      currentY += SECTION_SPACING + section.topics.length * 20;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117', color: '#e6edf3', overflow: 'hidden' }}>

      {/* Top Bar */}
      <header style={{
        padding: '12px 20px', borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0d1117', zIndex: 20, flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#161b22', border: '1px solid #21262d', borderRadius: 8,
            padding: '8px 12px', flex: 1, maxWidth: 420
          }}>
            <Search size={16} color="#484f58" />
            <input
              type="text"
              placeholder="e.g. Node.js Developer, Data Scientist..."
              value={field}
              onChange={(e) => setField(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateRoadmap(field)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#e6edf3', fontSize: 13, flex: 1
              }}
            />
          </div>
          <button
            onClick={() => generateRoadmap(field)}
            disabled={loading || !field.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: loading || !field.trim() ? '#21262d' : '#20c997',
              color: loading || !field.trim() ? '#484f58' : '#0d1117',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: loading || !field.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Roadmap title + cache badge */}
        {roadmap && (
          <div style={{ marginLeft: 20, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{roadmap.title}</div>
              <div style={{ fontSize: 12, color: '#7d8590' }}>{roadmap.description}</div>
            </div>
            {cacheHit !== null && (
              cacheHit ? (
                <span style={{ background: '#1f2d3d', color: '#58a6ff', border: '1px solid #1f6feb33', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  ⚡ Cached
                </span>
              ) : (
                <span style={{ background: '#1a2e22', color: '#3fb950', border: '1px solid #23863633', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  ✦ AI Generated
                </span>
              )
            )}
          </div>
        )}
      </header>

      {/* Body = Sidebar + Canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, borderRight: '1px solid #21262d',
          padding: 16, overflowY: 'auto', background: '#0d1117', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#7d8590' }}>
            <History size={14} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Roadmaps</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cachedList.length === 0 ? (
              <p style={{ fontSize: 12, color: '#484f58', textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>
                No roadmaps yet.
              </p>
            ) : cachedList.map((name) => (
              <button key={name} onClick={() => { setField(name); generateRoadmap(name); }} style={{
                background: 'none', border: '1px solid transparent', borderRadius: 6,
                color: '#7d8590', fontSize: 13, padding: '8px 10px', cursor: 'pointer',
                textAlign: 'left', textTransform: 'capitalize',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.1s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.borderColor = '#21262d'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#7d8590'; e.currentTarget.style.borderColor = 'transparent'; }}>
                <span>{name}</span>
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        </aside>

        {/* Flow Canvas */}
        <main style={{ flex: 1, position: 'relative' }}>
          {error && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 30, background: '#2d1b1b', border: '1px solid #da363333',
              color: '#f85149', padding: '8px 16px', borderRadius: 8, fontSize: 13
            }}>
              {error}
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            colorMode="dark"
            style={{ background: '#0d1117' }}
          >
            <Background color="#161b22" gap={20} />
            <Controls />
            <Panel position="bottom-right">
              <div style={{
                background: '#161b22', border: '1px solid #21262d',
                borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 12,
                fontSize: 11, color: '#7d8590', alignItems: 'center'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#20c997', display: 'inline-block' }} />
                  Section
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#21262d', border: '1px solid #484f58', display: 'inline-block' }} />
                  Topic
                </span>
              </div>
            </Panel>
          </ReactFlow>

          {/* Empty State */}
          {!roadmap && !loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', background: '#0d1117', zIndex: 20, textAlign: 'center', padding: 32
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, background: '#20c99718', color: '#20c997',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <BookOpen size={28} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>AI-Powered Roadmap Generator</h2>
              <p style={{ fontSize: 13, color: '#7d8590', maxWidth: 340, lineHeight: 1.6, margin: '0 0 24px' }}>
                Type any role or technology above and press Enter to get an interactive, fully-personalized learning path generated by Gemini.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Full Stack Developer', 'Cloud Architect', 'Cybersecurity', 'ML Engineer'].map(opt => (
                  <button key={opt} onClick={() => { setField(opt); generateRoadmap(opt); }} style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid #21262d',
                    background: 'none', color: '#7d8590', fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#20c997'; e.currentTarget.style.color = '#e6edf3'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#7d8590'; }}>
                    + {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
