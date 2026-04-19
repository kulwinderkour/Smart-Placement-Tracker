import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { applicationsApi, type TrackedApplication } from '../../api/applications'

// ── Match score types & cache helpers ────────────────────────────────────────

const AI_ENGINE = 'http://localhost:8002'
const SCORE_CACHE_PREFIX = 'match_score_v1_'
const SCORE_CACHE_TTL = 24 * 60 * 60 * 1000

interface MatchData {
  score: number
  label: string
  matched: string[]
  gaps: string[]
  features: Record<string, number>
  cachedAt: number
}

function getCached(appId: string): MatchData | null {
  try {
    const raw = localStorage.getItem(SCORE_CACHE_PREFIX + appId)
    if (!raw) return null
    const d: MatchData = JSON.parse(raw)
    if (Date.now() - d.cachedAt > SCORE_CACHE_TTL) {
      localStorage.removeItem(SCORE_CACHE_PREFIX + appId)
      return null
    }
    return d
  } catch { return null }
}

function setCached(appId: string, d: MatchData) {
  try { localStorage.setItem(SCORE_CACHE_PREFIX + appId, JSON.stringify(d)) } catch {}
}

const FEATURE_LABELS: Record<string, string> = {
  skill_match_ratio:      'Skill Overlap',
  role_keyword_match:     'Role Alignment',
  semantic_sim:           'Profile Similarity',
  matched_skill_count_n:  'Matched Ratio',
  profile_skill_density:  'Skill Depth',
}

function scoreMeta(score: number) {
  if (score >= 70) return { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' }
  if (score >= 40) return { color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)' }
  return             { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' }
}

function plainExplain(ms: MatchData): string {
  const total = ms.matched.length + ms.gaps.length
  if (total === 0) return 'No required skills listed — match based on semantic profile similarity.'
  if (ms.gaps.length === 0) return `You match all ${ms.matched.length} required skill${ms.matched.length > 1 ? 's' : ''}!`
  const gapHint = ms.gaps.slice(0, 2).join(', ')
  return `You match ${ms.matched.length} of ${total} required skills — still need: ${gapHint}${ms.gaps.length > 2 ? ` +${ms.gaps.length - 2} more` : ''}.`
}

// ── MatchBadge ───────────────────────────────────────────────────────────────

function MatchBadge({ ms }: { ms: MatchData | 'loading' | undefined | null }) {
  if (!ms) return null
  if (ms === 'loading') return (
    <span style={{ fontSize: 9, color: 'var(--student-text-muted)', whiteSpace: 'nowrap' }}>scoring…</span>
  )
  const m = scoreMeta(ms.score)
  return (
    <span style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 700,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {ms.score}%
    </span>
  )
}

// ── MatchBreakdown ────────────────────────────────────────────────────────────

function MatchBreakdown({ ms }: { ms: MatchData | 'loading' | undefined | null }) {
  if (!ms || ms === 'loading') return null
  const m = scoreMeta(ms.score)
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
      {/* Score + label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: m.bg, border: `2px solid ${m.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: m.color,
        }}>{ms.score}%</div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--student-surface)' }}>{ms.label}</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--student-text-dim)', lineHeight: 1.4 }}>{plainExplain(ms)}</p>
        </div>
      </div>

      {/* Skill pills */}
      {(ms.matched.length > 0 || ms.gaps.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {ms.matched.map(s => (
            <span key={s} style={{
              background: 'rgba(34,197,94,0.10)', color: '#15803d',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 600,
            }}>{s}</span>
          ))}
          {ms.gaps.map(s => (
            <span key={s} style={{
              background: 'rgba(239,68,68,0.08)', color: '#b91c1c',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 600,
            }}>−{s}</span>
          ))}
        </div>
      )}

      {/* Feature bars */}
      {Object.keys(ms.features).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(ms.features)
            .filter(([k]) => k !== 'matched_skill_count_n')
            .map(([key, val]) => {
              const pct = Math.min(100, Math.round(val * 100))
              const label = FEATURE_LABELS[key] || key
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--student-text-dim)' }}>{label}</span>
                    <span style={{ fontSize: 9, color: 'var(--student-border)', fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: '#f3f4f6', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${pct}%`,
                      background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )
            })
          }
        </div>
      )}
    </div>
  )
}

const COLUMNS = [
  { id: 'applied',          label: 'Applied',          color: 'blue'   },
  { id: 'online_test',      label: 'Online Test',       color: 'yellow' },
  { id: 'technical_round',  label: 'Technical Round',   color: 'purple' },
  { id: 'hr_round',         label: 'HR Round',          color: 'purple' },
  { id: 'offer',            label: 'Offer 🎉',          color: 'green'  },
  { id: 'rejected',         label: 'Rejected',          color: 'red'    },
] as const

export default function Tracker() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      applicationsApi.update(id, { status: status as 'applied' | 'online_test' | 'technical_round' | 'hr_round' | 'offer' | 'rejected' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-applications'] }),
  })

  const applications: TrackedApplication[] = (data?.data ?? []) as TrackedApplication[]

  const [matchScores, setMatchScores] = useState<Record<string, MatchData | 'loading'>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!applications.length) return
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
    const studentPayload = {
      fullName: profile.fullName || profile.full_name || '',
      college: profile.college || '',
      branch: profile.branch || '',
      cgpa: parseFloat((profile.cgpa || '0').toString()) || 0,
      graduationYear: parseInt((profile.graduationYear || profile.graduation_year || '2025').toString()) || 0,
      skills: profile.skills || [],
      mockInterviewScore: 0,
      aptitudeStreak: 0,
      previousCompanies: [],
    }

    applications.forEach(async (app) => {
      if (!app.job_id) return
      const cached = getCached(app.id)
      if (cached) {
        setMatchScores(prev => ({ ...prev, [app.id]: cached }))
        return
      }
      setMatchScores(prev => ({ ...prev, [app.id]: 'loading' }))
      try {
        const res = await fetch(`${AI_ENGINE}/api/matcher/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student: studentPayload,
            job: {
              id: app.job_id || '',
              title: (app as TrackedApplication).role || '',
              company: (app as TrackedApplication).company || '',
              location: '',
              package_lpa: 0,
              required_skills: [],
              min_cgpa: 0,
              job_type: '',
              company_type: '',
            },
          }),
        })
        if (!res.ok) throw new Error('Score API error')
        const d = await res.json()
        const ms: MatchData = {
          score: d.match_score,
          label: d.match_label,
          matched: d.matched_skills || [],
          gaps: d.gap_skills || [],
          features: d.feature_values || {},
          cachedAt: Date.now(),
        }
        setCached(app.id, ms)
        setMatchScores(prev => ({ ...prev, [app.id]: ms }))
      } catch {
        setMatchScores(prev => { const n = { ...prev }; delete n[app.id]; return n })
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications.length])

  const getColumnApps = (status: string) =>
    applications.filter(app => app.status === status)

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    updateMutation.mutate({ id: draggableId, status: destination.droppableId })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  )

  return (
    <>
      <div className="max-w-full px-4 py-8">
        <div className="mb-8" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: 'var(--student-text-dim)',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
              e.currentTarget.style.color = 'var(--student-border)';
              e.currentTarget.style.borderColor = 'var(--student-text-muted)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = 'var(--student-text-dim)';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Tracker</h1>
            <p className="text-gray-600 mt-1">Track your job application progress</p>
            <p className="text-gray-500 mt-1">Drag cards to update your application status</p>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {getColumnApps(col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-32 rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {getColumnApps(col.id).map((app, index) => (
                      <Draggable key={app.id} draggableId={app.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-3 mb-2 rounded-lg shadow-sm border transition-all cursor-move ${
                              snapshot.isDragging ? 'shadow-lg border-blue-300' : 'border-gray-200'
                            }`}
                          >
                            {/* Title row + score badge */}
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-medium text-sm text-gray-900 flex-1 pr-1 leading-tight">
                                {(app as TrackedApplication).role || 'Unknown Role'}
                              </h4>
                              <MatchBadge ms={matchScores[app.id]} />
                            </div>
                            <p className="text-xs text-gray-600 mb-0.5">{(app as TrackedApplication).company || ''}</p>
                            {/* AI Applied badge */}
                            {(app as TrackedApplication).agent_applied && (
                              <span style={{
                                display: 'inline-block', fontSize: 9, fontWeight: 700,
                                background: 'rgba(32,201,151,0.12)', color: '#20c997',
                                border: '1px solid rgba(32,201,151,0.28)',
                                borderRadius: 4, padding: '1px 6px', marginBottom: 4,
                              }}>⚡ AI Applied</span>
                            )}
                            {/* Cover letter snippet */}
                            {(app as TrackedApplication).cover_letter && (
                              <p className="text-xs text-gray-400 mb-1 line-clamp-2" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                                "{(app as TrackedApplication).cover_letter?.slice(0, 80)}…"
                              </p>
                            )}
                            {app.next_step_date && (
                              <p className="text-xs text-gray-400">
                                Applied: {new Date(app.next_step_date).toLocaleDateString()}
                              </p>
                            )}
                            {app.offer_ctc && (
                              <p className="text-green-600 text-xs mt-1 font-medium">
                                ₹{app.offer_ctc.toLocaleString()}/mo
                              </p>
                            )}
                            {/* Expand toggle — only if we have a score */}
                            {matchScores[app.id] && matchScores[app.id] !== 'loading' && (
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === app.id ? null : app.id) }}
                                style={{
                                  marginTop: 6, fontSize: 10, color: '#6366f1',
                                  background: 'none', border: 'none', padding: 0,
                                  cursor: 'pointer', fontWeight: 600,
                                }}
                              >
                                {expandedId === app.id ? '▲ Hide breakdown' : '▼ View match'}
                              </button>
                            )}
                            {/* Full breakdown */}
                            {expandedId === app.id && (
                              <MatchBreakdown ms={matchScores[app.id]} />
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  )
}
