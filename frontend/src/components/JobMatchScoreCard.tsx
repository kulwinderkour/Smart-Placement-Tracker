import { useEffect, useState } from 'react'

interface JobMatchScoreCardProps {
  matchScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
  skillMatchPercent?: number
}

function getMatchLabel(score: number): string {
  if (score >= 80) return 'PERFECT MATCH'
  if (score >= 60) return 'GOOD MATCH'
  if (score >= 40) return 'AVERAGE MATCH'
  return 'LOW MATCH'
}

function getProgressBarColor(pct: number): string {
  if (pct >= 70) return '#22c55e'
  if (pct >= 45) return '#f59e0b'
  return '#ef4444'
}

function CircularProgress({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0)
  const SIZE = 160
  const STROKE = 10
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const offset = CIRC - (animated / 100) * CIRC

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimated(score)
    }, 100)
    return () => clearTimeout(timeout)
  }, [score])

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="white"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-white font-bold" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {score}%
        </span>
      </div>
    </div>
  )
}

function AnimatedBar({ pct }: { pct: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="w-full h-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
      <div
        className="h-2.5 rounded-full"
        style={{
          width: `${width}%`,
          background: getProgressBarColor(pct),
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  )
}

export default function JobMatchScoreCard({
  matchScore = 82,
  matchedSkills = ['Node.js', 'Express.js'],
  missingSkills = ['NestJS', 'Full Stack Development', 'Open-source work', 'Remote work'],
  skillMatchPercent,
}: JobMatchScoreCardProps) {
  const totalSkills = matchedSkills.length + missingSkills.length
  const skillPct = skillMatchPercent !== undefined
    ? skillMatchPercent
    : totalSkills > 0 ? Math.round((matchedSkills.length / totalSkills) * 100) : 0

  const matchLabel = getMatchLabel(matchScore)

  return (
    <div className="flex flex-col gap-4 w-full" style={{ maxWidth: 760, margin: '0 auto', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>

      {/* ── Top: Score Card ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #0a2626 0%, #0d3d3d 30%, #0891b2 75%, #06b6d4 100%)',
          padding: '44px 32px 40px',
          boxShadow: '0 20px 60px rgba(6,182,212,0.2), 0 4px 20px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 28px 70px rgba(6,182,212,0.28), 0 6px 24px rgba(0,0,0,0.35)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 60px rgba(6,182,212,0.2), 0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        {/* Decorative blur blobs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div className="relative flex flex-col items-center gap-5">
          {/* Title */}
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, fontWeight: 600, letterSpacing: '0.04em', margin: 0, textAlign: 'center' }}>
            Job Match Score
          </p>

          {/* Ring */}
          <CircularProgress score={matchScore} />

          {/* Labels */}
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {matchLabel}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 400 }}>
              Based on your resume
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom: Skill Match Analysis ── */}
      <div
        className="rounded-2xl bg-white"
        style={{
          padding: '28px 28px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-3 mb-5">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: 'var(--student-surface)' }}>Skill Match Analysis</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--student-text-dim)', fontWeight: 400 }}>
              {skillPct}% match ({matchedSkills.length} of {totalSkills} skills)
            </p>
          </div>
        </div>

        {/* Helper note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>💡</span>
          <p style={{ margin: 0, fontSize: 12.5, color: '#92400e', lineHeight: 1.55 }}>
            This is keyword matching for reference only. Your actual match score uses AI semantic analysis.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--student-text-dim)' }}>Needs Improvement</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--student-border)' }}>{skillPct}%</span>
          </div>
          <AnimatedBar pct={skillPct} />
        </div>

        <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: 20 }} />

        {/* Skills You Have */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: 'var(--student-surface)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✅</span> Skills You Have ({matchedSkills.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {matchedSkills.map(skill => (
              <span
                key={skill}
                style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 50, padding: '5px 14px', fontSize: 13, fontWeight: 500 }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Skills to Learn */}
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: 'var(--student-surface)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️</span> Skills to Learn ({missingSkills.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {missingSkills.map(skill => (
              <span
                key={skill}
                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 50, padding: '5px 14px', fontSize: 13, fontWeight: 500 }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
