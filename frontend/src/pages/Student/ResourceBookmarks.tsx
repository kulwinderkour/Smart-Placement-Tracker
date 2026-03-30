import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

type ResourceType = 'Video' | 'Article' | 'Practice' | 'Note';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  tags: string[];
  notes?: string;
  dateAdded: string;
  bookmarked: boolean;
}

// --- Constants ---

const COLORS = {
  bg: '#0d0d0d',
  surface: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.07)',
  borderHover: 'rgba(255, 255, 255, 0.13)',
  primary: '#ece8e1',
  secondary: 'rgba(255, 255, 255, 0.45)',
  muted: 'rgba(255, 255, 255, 0.28)',
  accent: '#3a6fd4',
  accentHover: '#2f5ab8',
  accentTint: 'rgba(58, 111, 212, 0.08)',
  tags: {
    DSA: '#4a7ab5',
    Development: '#4e8f65',
    'System Design': '#4a7a8a',
    'Core Subjects': '#8a5848',
    'Soft Skills': '#6a5a9a',
    'Interview Prep': '#7a6a4a',
    General: '#6a6a6a',
  } as Record<string, string>,
};

const TYPE_STYLES: Record<ResourceType, { bg: string; text: string }> = {
  Video: { bg: 'rgba(80, 100, 180, 0.15)', text: '#7a9ed4' },
  Article: { bg: 'rgba(80, 140, 100, 0.15)', text: '#6aae7a' },
  Practice: { bg: 'rgba(160, 120, 60, 0.15)', text: '#c0a060' },
  Note: { bg: 'rgba(120, 100, 160, 0.15)', text: '#a090d0' },
};

const ALL_TAGS = ['DSA', 'Development', 'System Design', 'Core Subjects', 'Soft Skills', 'Interview Prep', 'General'];

const INITIAL_DATA: Bookmark[] = [
  { id: '1', title: 'Dynamic Programming Patterns for Interviews', url: 'https://youtube.com/watch?v=dp-pattern', type: 'Video', tags: ['DSA'], dateAdded: '2026-03-25', bookmarked: true },
  { id: '2', title: 'Binary Search Tree - Boundary Traversal', url: 'https://leetcode.com/problems/boundary-traversal', type: 'Practice', tags: ['DSA'], dateAdded: '2026-03-26', bookmarked: false },
  { id: '3', title: 'Scaling Microservices with Kafka', url: 'https://medium.com/system-design/kafka-scaling', type: 'Article', tags: ['System Design'], dateAdded: '2026-03-27', bookmarked: true },
  { id: '4', title: 'Operating Systems - Process Scheduling', url: 'https://geeksforgeeks.org/os-scheduling', type: 'Article', tags: ['Core Subjects'], dateAdded: '2026-03-28', bookmarked: false },
  { id: '5', title: 'Star Framework for Behavioral Interviews', url: 'https://dev.to/behavioral-prep', type: 'Article', tags: ['Soft Skills', 'Interview Prep'], dateAdded: '2026-03-24', bookmarked: true },
  { id: '6', title: 'React Performance Optimization Guide', url: 'https://react.dev/optimization', type: 'Article', tags: ['Development'], dateAdded: '2026-03-23', bookmarked: false },
  { id: '7', title: 'Grokking System Design Interviews', url: 'https://youtube.com/watch?v=sd-intro', type: 'Video', tags: ['System Design', 'Interview Prep'], dateAdded: '2026-03-22', bookmarked: true },
  { id: '8', title: 'DBMS Indexing - Why and How?', url: 'https://substack.com/dbms-indexing', type: 'Article', tags: ['Core Subjects'], dateAdded: '2026-03-21', bookmarked: false },
  { id: '9', title: 'LeetCode 75 - Essential Problems', url: 'https://leetcode.com/study-plan/75', type: 'Practice', tags: ['DSA'], dateAdded: '2026-03-20', bookmarked: true },
  { id: '10', title: 'System Design: Load Balancers 101', url: 'https://youtube.com/watch?v=lb-basics', type: 'Video', tags: ['System Design'], dateAdded: '2026-03-19', bookmarked: false },
  { id: '11', title: 'Top 50 Java Interview Questions', url: 'https://interviewbit.com/java-prep', type: 'Practice', tags: ['Interview Prep'], dateAdded: '2026-03-18', bookmarked: true },
  { id: '12', title: 'Effective Communication for Devs', url: 'https://dev.to/soft-skills', type: 'Article', tags: ['Soft Skills'], dateAdded: '2026-03-17', bookmarked: false },
];

// --- Components ---

const BookmarkIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? COLORS.accent : 'none'} stroke={active ? COLORS.accent : 'currentColor'} strokeWidth="1.5">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default function ResourceBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [activeType, setActiveType] = useState('All Types');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<ResourceType>('Article');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('sp_bookmarks');
    if (saved) {
      try { setBookmarks(JSON.parse(saved)); } catch (e) { setBookmarks(INITIAL_DATA); }
    } else {
      setBookmarks(INITIAL_DATA);
      localStorage.setItem('sp_bookmarks', JSON.stringify(INITIAL_DATA));
    }
  }, []);

  const saveToLocal = (data: Bookmark[]) => {
    setBookmarks(data);
    localStorage.setItem('sp_bookmarks', JSON.stringify(data));
  };

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
                          b.url.toLowerCase().includes(search.toLowerCase()) ||
                          b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchesTag = activeTag === 'All' || b.tags.includes(activeTag);
      const matchesType = activeType === 'All Types' || b.type === activeType;
      return matchesSearch && matchesTag && matchesType;
    });
  }, [bookmarks, search, activeTag, activeType]);

  const handleUrlBlur = () => {
    const url = newUrl.toLowerCase();
    if (url.includes('youtube.com') || url.includes('youtu.be')) setNewType('Video');
    else if (url.includes('leetcode.com')) setNewType('Practice');
    else if (url.includes('medium.com') || url.includes('dev.to') || url.includes('substack.com')) setNewType('Article');
  };

  const toggleBookmark = (id: string) => {
    saveToLocal(bookmarks.map(b => b.id === id ? { ...b, bookmarked: !b.bookmarked } : b));
  };

  const deleteBookmark = (id: string) => {
    saveToLocal(bookmarks.filter(b => b.id !== id));
  };

  const saveResource = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const item: Bookmark = {
      id: Date.now().toString(),
      title: newTitle,
      url: newUrl,
      type: newType,
      tags: newTags,
      notes: newNotes,
      dateAdded: new Date().toISOString(),
      bookmarked: true,
    };
    saveToLocal([item, ...bookmarks]);
    setIsDrawerOpen(false);
    // Reset
    setNewTitle(''); setNewUrl(''); setNewType('Article'); setNewTags([]); setNewNotes('');
  };

  return (
    <div style={{
      background: COLORS.bg, minHeight: '100vh', padding: '60px 20px',
      fontFamily: '"DM Sans", sans-serif', color: COLORS.primary
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* --- Header --- */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', margin: 0 }}>Resource Bookmarks</h1>
            <span style={{ fontSize: 14, color: COLORS.muted }}>{bookmarks.length} saved</span>
          </div>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: '0 0 20px' }}>Your personal library for placement preparation</p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              height: 4, width: '100%', 
              background: `linear-gradient(90deg, ${COLORS.accent}66 0%, transparent 100%)`, 
              borderRadius: 99, marginBottom: 32 
            }}
          />
        </div>

        {/* --- Top Action Row --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resources..."
              style={{
                width: '100%', background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: '9px 14px', fontSize: 13, color: COLORS.primary,
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(58, 111, 212, 0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = COLORS.border}
            />
          </div>

          <div className="no-scrollbar" style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
            {['All', ...ALL_TAGS].map(tag => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  style={{
                    padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                    border: isActive ? 'none' : `1px solid ${COLORS.border}`,
                    background: isActive ? COLORS.accent : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#fff' : COLORS.secondary,
                    fontWeight: isActive ? 600 : 500,
                    position: 'relative', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    outline: 'none'
                  }}
                >
                  {isActive && <motion.div layoutId="tagPill" style={{ position: 'absolute', inset: 0, background: COLORS.accent, borderRadius: 99, zIndex: -1 }} />}
                  {tag}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 10,
              padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.accentHover}
            onMouseLeave={e => e.currentTarget.style.background = COLORS.accent}
          >
            + Add Resource
          </button>
        </div>

        {/* --- Resource Type Tabs --- */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: `1px solid ${COLORS.border}` }}>
          {['All Types', 'Video', 'Article', 'Practice'].map(type => {
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                style={{
                  background: 'none', border: 'none', padding: '0 0 12px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', color: isActive ? COLORS.primary : COLORS.muted,
                  position: 'relative', outline: 'none'
                }}
              >
                {type}
                {isActive && (
                  <motion.div
                    layoutId="tabUnderline"
                    style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: COLORS.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* --- Bookmark Grid --- */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 16, marginBottom: 80 
        }}>
          <AnimatePresence>
            {filteredBookmarks.length > 0 ? filteredBookmarks.map((b, i) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.01 }}
                style={{
                  background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: 14, padding: 18, cursor: 'pointer', position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = COLORS.borderHover;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = COLORS.surface;
                  e.currentTarget.style.borderColor = COLORS.border;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 99, ...TYPE_STYLES[b.type]
                  }}>
                    {b.type}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(b.id); }}
                    style={{ background: 'none', border: 'none', color: b.bookmarked ? COLORS.accent : COLORS.muted, cursor: 'pointer', padding: 0 }}
                  >
                    <BookmarkIcon active={b.bookmarked} />
                  </motion.button>
                </div>

                <div onClick={() => window.open(b.url, '_blank')}>
                  <h3 style={{ 
                    margin: '0 0 4px', fontSize: 14, fontWeight: 700, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>{b.title}</h3>
                  
                  <div style={{ 
                    fontSize: 11, color: COLORS.muted, marginBottom: 14, 
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}>{b.url}</div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {b.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                        background: `${COLORS.tags[t] || '#6a6a6a'}1f`, color: COLORS.tags[t] || '#6a6a6a'
                      }}>{t}</span>
                    ))}
                  </div>

                  <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    fontSize: 11, color: COLORS.muted 
                  }}>
                    <span>Saved {new Date(b.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <motion.button
                      className="delete-btn"
                      onClick={(e) => { e.stopPropagation(); deleteBookmark(b.id); }}
                      style={{ 
                        opacity: 0, background: 'none', border: 'none', color: COLORS.muted, 
                        cursor: 'pointer', fontSize: 14, padding: 4 
                      }}
                    >
                      ×
                    </motion.button>
                  </div>
                </div>
                <style>{`.delete-btn { transition: opacity 0.2s; } div:hover .delete-btn { opacity: 1 !important; }`}</style>
              </motion.div>
            )) : (
              <div style={{ gridColumn: '1 / -1', padding: '80px 0', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, color: COLORS.secondary }}>{bookmarks.length === 0 ? "No resources saved yet" : "Nothing found"}</h3>
                <p style={{ margin: 0, fontSize: 14, color: COLORS.muted }}>{bookmarks.length === 0 ? "Add your first resource to get started" : "Try a different search or tag"}</p>
                {bookmarks.length === 0 && (
                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    style={{
                      background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      marginTop: 20
                    }}
                  >
                    + Add First Resource
                  </button>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* --- Add Resource Drawer --- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
                background: '#131316', borderLeft: `1px solid ${COLORS.border}`,
                zIndex: 1001, display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Resource</h2>
                <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer' }}>
                  <CloseIcon />
                </button>
              </div>
              <div style={{ height: 1, background: COLORS.border }} />

              <div className="no-scrollbar" style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.1em', marginBottom: 8 }}>TITLE</label>
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Master DP Patterns"
                    style={{
                      width: '100%', background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${COLORS.border}`,
                      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: COLORS.primary,
                      outline: 'none'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(58, 111, 212, 0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = COLORS.border}
                  />
                </div>

                {/* URL */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.1em', marginBottom: 8 }}>URL</label>
                  <input
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://..."
                    style={{
                      width: '100%', background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${COLORS.border}`,
                      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: COLORS.primary,
                      outline: 'none'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(58, 111, 212, 0.5)'}
                  />
                </div>

                {/* Type */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.1em', marginBottom: 12 }}>TYPE</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['Video', 'Article', 'Practice', 'Note'] as ResourceType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setNewType(type)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', border: 'none',
                          background: newType === type ? COLORS.accent : 'rgba(255, 255, 255, 0.04)',
                          color: newType === type ? '#fff' : COLORS.muted
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.1em', marginBottom: 12 }}>TAGS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ALL_TAGS.map(tag => {
                      const selected = newTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            if (selected) setNewTags(newTags.filter(t => t !== tag));
                            else setNewTags([...newTags, tag]);
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', border: `1px solid ${selected ? COLORS.accent : COLORS.border}`,
                            background: selected ? COLORS.accentTint : 'transparent',
                            color: selected ? COLORS.accent : COLORS.muted,
                            transition: 'all 0.2s'
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: COLORS.muted, letterSpacing: '0.1em', marginBottom: 8 }}>NOTES</label>
                  <textarea
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Why are you saving this? What to focus on?"
                    rows={3}
                    style={{
                      width: '100%', background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${COLORS.border}`,
                      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: COLORS.primary,
                      outline: 'none', resize: 'none'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(58, 111, 212, 0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = COLORS.border}
                  />
                </div>
              </div>

              <div style={{ padding: 24, borderTop: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={saveResource}
                  disabled={!newTitle.trim() || !newUrl.trim()}
                  style={{
                    background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 10,
                    padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    opacity: (!newTitle.trim() || !newUrl.trim()) ? 0.5 : 1
                  }}
                >
                  Save Resource
                </button>
                <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
