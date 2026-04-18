import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

interface InterviewEntry {
  id: string;
  company: string;
  roundType: string;
  date: string;
  rating: number;
  questions: string;
  notes?: string;
}

// --- Constants ---

const COLORS = {
  bg: 'var(--student-bg)',
  surface: 'var(--student-surface)', 
  border: 'var(--student-border)',
  borderHover: 'var(--student-border)',
  primary: 'var(--student-text)',
  secondary: 'var(--student-text-muted)',
  muted: 'var(--student-text-muted)',
  accent: '#a78bfa', // Brand purple (matches admin)
  accentHover: '#7c3aed',
  accentTint: '#a78bfa12',
  stars: '#d29922', // Yellow/Orange
  divider: 'var(--student-border)',
};

const ROUND_TYPES = ['Online Assessment', 'Technical Round 1', 'Technical Round 2', 'System Design', 'Managerial', 'HR Round'];

const INITIAL_LOGS: InterviewEntry[] = [
  { id: '1', company: 'Google', roundType: 'Technical Round 1', date: '2026-03-20', rating: 4, questions: '1. Topological Sort problem. 2. Virtual Memory internals.', notes: 'Went well, could have optimized the graph traversal faster.' },
  { id: '2', company: 'Amazon', roundType: 'OA', date: '2026-03-22', rating: 5, questions: '1. Two Sum variant. 2. LRU Cache implementation.', notes: 'Passed all test cases.' },
  { id: '3', company: 'TCS', roundType: 'Technical Round 2', date: '2026-03-25', rating: 2, questions: '1. DBMS Normalization. 2. Java Collections framework.', notes: 'Struggled with BCNF explanation.' },
];

// --- Components ---

const StarRating = ({ rating, setRating, interactive = false }: { rating: number; setRating?: (r: number) => void; interactive?: boolean }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        onClick={() => interactive && setRating && setRating(star)}
        style={{
          background: 'none', border: 'none', cursor: interactive ? 'pointer' : 'default', padding: 0,
          color: star <= rating ? COLORS.stars : 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    ))}
  </div>
);

export default function InterviewLog() {
  const [entries, setEntries] = useState<InterviewEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [company, setCompany] = useState('');
  const [roundType, setRoundType] = useState(ROUND_TYPES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(3);
  const [questions, setQuestions] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('sp_interview_logs');
    if (saved) {
      try { setEntries(JSON.parse(saved)); } catch (e) { setEntries(INITIAL_LOGS); }
    } else {
      setEntries(INITIAL_LOGS);
      localStorage.setItem('sp_interview_logs', JSON.stringify(INITIAL_LOGS));
    }
  }, []);

  const saveEntries = (data: InterviewEntry[]) => {
    setEntries(data);
    localStorage.setItem('sp_interview_logs', JSON.stringify(data));
  };

  const handleAddEntry = () => {
    if (!company.trim() || !questions.trim()) return;
    const newEntry: InterviewEntry = {
      id: Date.now().toString(),
      company, roundType, date, rating, questions, notes
    };
    saveEntries([newEntry, ...entries]);
    setIsAdding(false);
    // Reset
    setCompany(''); setQuestions(''); setNotes(''); setRating(3);
  };

  const deleteEntry = (id: string) => {
    saveEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div style={{
      width: '100%', minHeight: '100vh', padding: '40px 28px',
      fontFamily: '"Inter", sans-serif', color: COLORS.primary,
      background: 'transparent'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* --- Header --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: '-0.5px' }}>Interview Replay Log</h1>
            <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Build your personal question bank for future preparation</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAdding(!isAdding)}
            style={{
              background: COLORS.accent, color: 'var(--student-bg)', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            {isAdding ? 'Cancel' : '+ Log Interview'}
          </motion.button>
        </div>

        {/* --- Add Form (Collapsible) --- */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 40 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Company</label>
                    <input
                      value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. Microsoft"
                      style={{
                        width: '100%', background: 'var(--student-bg)', border: `1px solid ${COLORS.border}`,
                        borderRadius: 6, padding: '10px 14px', color: COLORS.primary, fontSize: 13, outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Round Type</label>
                    <select
                      value={roundType} onChange={e => setRoundType(e.target.value)}
                      style={{
                        width: '100%', background: 'var(--student-bg)', border: `1px solid ${COLORS.border}`,
                        borderRadius: 6, padding: '10px 14px', color: COLORS.primary, fontSize: 13, outline: 'none'
                      }}
                    >
                      {ROUND_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Date</label>
                      <input
                        type="date" value={date} onChange={e => setDate(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--student-bg)', border: `1px solid ${COLORS.border}`,
                          borderRadius: 6, padding: '10px 14px', color: COLORS.primary, fontSize: 13, outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Rating</label>
                      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
                        <StarRating rating={rating} setRating={setRating} interactive />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Questions Asked</label>
                    <textarea
                      value={questions} onChange={e => setQuestions(e.target.value)}
                      placeholder="List the technical and behavioral questions..."
                      rows={4}
                      style={{
                        width: '100%', background: 'var(--student-bg)', border: `1px solid ${COLORS.border}`,
                        borderRadius: 6, padding: '10px 14px', color: COLORS.primary, fontSize: 13, outline: 'none', resize: 'none'
                      }}
                    />
                  </div>
                  <motion.button
                    whileHover={{ background: COLORS.accentHover }}
                    onClick={handleAddEntry}
                    style={{
                      background: COLORS.accent, color: 'var(--student-bg)', border: 'none', borderRadius: 8,
                      padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto'
                    }}
                  >
                    Save Entry
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Entries List --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {entries.length > 0 ? entries.map((entry, idx) => (
            <motion.div
              layout
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{entry.company}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 500 }}>{entry.roundType}</span>
                    <span style={{ color: COLORS.muted }}>•</span>
                    <span style={{ fontSize: 12, color: COLORS.muted }}>{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <StarRating rating={entry.rating} />
              </div>

              <div style={{ height: 1, background: COLORS.divider, margin: '12px 0' }} />

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Questions Asked</label>
                <p style={{ margin: 0, fontSize: 14, color: COLORS.primary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.questions}</p>
              </div>

              {entry.notes && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Notes & Reflections</label>
                  <p style={{ margin: 0, fontSize: 13, color: COLORS.secondary, fontStyle: 'italic' }}>{entry.notes}</p>
                </div>
              )}

              <button
                onClick={() => deleteEntry(entry.id)}
                style={{
                  position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                  color: COLORS.muted, cursor: 'pointer', fontSize: 18, opacity: 0.3
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.3'}
              >
                ×
              </button>
            </motion.div>
          )) : (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: 48, opacity: 0.1, marginBottom: 16 }}>📝</div>
              <h3 style={{ fontSize: 18, color: COLORS.muted }}>No entries yet</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>Complete an interview and log your experience here!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
