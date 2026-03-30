import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- System Types ---

interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  completed: boolean;
  category: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

// --- Constants & Color System ---

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
  completedText: 'rgba(255, 255, 255, 0.2)',
  divider: 'rgba(255, 255, 255, 0.06)',
  rowBorder: 'rgba(255, 255, 255, 0.04)',
  categories: {
    DSA: '#4a7ab5',
    Development: '#4e8f65',
    'Core Subjects': '#8a5848',
    'Soft Skills': '#6a5a9a',
    'System Design': '#4a7a8a',
  } as Record<string, string>,
};

const PRIORITY_STYLES = {
  High: { bg: 'rgba(160, 80, 80, 0.18)', text: '#c07878' },
  Medium: { bg: 'rgba(80, 110, 180, 0.18)', text: '#7a9ed4' },
  Low: { bg: 'rgba(80, 100, 140, 0.18)', text: '#7a9ec0' },
};

// --- Mock Data ---

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-dsa',
    name: 'DSA',
    color: COLORS.categories.DSA,
    tasks: [
      { id: 't1', title: 'Dynamic Programming - 1D Revision', priority: 'High', dueDate: '2026-03-31', completed: false, category: 'DSA' },
      { id: 't2', title: 'Binary Trees - Inorder/Postorder traversal', priority: 'Medium', dueDate: '2026-03-30', completed: true, category: 'DSA' },
      { id: 't3', title: 'Linked List - Reverse & Detect Cycle', priority: 'High', dueDate: '2026-03-28', completed: false, category: 'DSA' },
    ],
  },
  {
    id: 'cat-dev',
    name: 'Development',
    color: COLORS.categories.Development,
    tasks: [
      { id: 't4', title: 'Optimize Frontend Bundle Size', priority: 'Medium', dueDate: '2026-04-05', completed: false, category: 'Development' },
      { id: 't5', title: 'Implement Redis Caching in Backend', priority: 'High', dueDate: '2026-03-29', completed: true, category: 'Development' },
      { id: 't6', title: 'Write Unit Tests for Auth Flow', priority: 'Low', dueDate: '2026-04-02', completed: false, category: 'Development' },
    ],
  },
  {
    id: 'cat-core',
    name: 'Core Subjects',
    color: COLORS.categories['Core Subjects'],
    tasks: [
      { id: 't7', title: 'Virtual Memory & Demand Paging', priority: 'High', dueDate: '2026-03-30', completed: false, category: 'Core Subjects' },
      { id: 't8', title: 'SQL Joins & Indexing Performance', priority: 'Medium', dueDate: '2026-04-01', completed: true, category: 'Core Subjects' },
      { id: 't9', title: 'Deadlock Prevention Algorithms', priority: 'Low', dueDate: '2026-03-27', completed: false, category: 'Core Subjects' },
    ],
  },
  {
    id: 'cat-soft',
    name: 'Soft Skills',
    color: COLORS.categories['Soft Skills'],
    tasks: [
      { id: 't10', title: 'Prepare STAR Framework Responses', priority: 'High', dueDate: '2026-03-31', completed: false, category: 'Soft Skills' },
      { id: 't11', title: 'Body Language & Virtual Interview Ettiquette', priority: 'Medium', dueDate: '2026-03-25', completed: true, category: 'Soft Skills' },
    ],
  },
  {
    id: 'cat-sd',
    name: 'System Design',
    color: COLORS.categories['System Design'],
    tasks: [
      { id: 't12', title: 'Load Balancing Strategies (Nginx vs L7)', priority: 'Medium', dueDate: '2026-04-08', completed: false, category: 'System Design' },
      { id: 't13', title: 'CAP Theorem & NoSQL tradeoff analysis', priority: 'Medium', dueDate: '2026-04-10', completed: false, category: 'System Design' },
    ],
  },
];

// --- Components ---

const Checkbox = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    style={{
      width: 17, height: 17, borderRadius: 5, background: checked ? COLORS.accent : 'transparent',
      border: `1.5px solid ${checked ? COLORS.accent : 'rgba(255, 255, 255, 0.18)'}`,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
      padding: 0, flexShrink: 0
    }}
  >
    <AnimatePresence>
      {checked && (
        <motion.svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }} transition={{ duration: 0.25 }}
        >
          <path d="M2 5L4.5 7.5L8.5 2.5" />
        </motion.svg>
      )}
    </AnimatePresence>
  </button>
);

const TaskRow = ({ task, isOverdue, onToggle, onDelete }: { task: Task; isOverdue: boolean; onToggle: () => void; onDelete: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const pStyle = PRIORITY_STYLES[task.priority];

  return (
    <motion.div
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      exit={{ height: 0, opacity: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
        borderBottom: `1px solid ${COLORS.rowBorder}`,
        opacity: task.completed ? 0.5 : 1,
        transition: 'opacity 0.3s'
      }}
    >
      <Checkbox checked={task.completed} onToggle={onToggle} />
      
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          fontWeight: 500, fontSize: 14,
          color: task.completed ? COLORS.completedText : COLORS.primary,
          textDecoration: task.completed ? 'line-through' : 'none',
          transition: 'color 0.3s'
        }}>
          {task.title}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: pStyle.text, background: pStyle.bg,
          padding: '3px 8px', borderRadius: 99, letterSpacing: '0.5px', textTransform: 'uppercase'
        }}>
          {task.priority}
        </div>
        
        <div style={{ fontSize: 12, color: isOverdue ? COLORS.categories['Core Subjects'] : COLORS.muted, fontWeight: 500 }}>
          {task.dueDate}
        </div>

        <motion.button
          onClick={onDelete}
          animate={{ opacity: hovered ? 1 : 0 }}
          style={{
            background: 'transparent', border: 'none', color: COLORS.muted,
            fontSize: 14, cursor: 'pointer', padding: '4px'
          }}
        >
          ×
        </motion.button>
      </div>
    </motion.div>
  );
};

export default function PrepChecklist() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [activeFilter, setActiveFilter] = useState('All');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Derived Stats ---
  const allTasks = categories.flatMap(c => c.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const dueTodayCount = allTasks.filter(t => !t.completed && t.dueDate === today).length;
  const inProgressCount = allTasks.filter(t => !t.completed).length;
  const overdueCount = allTasks.filter(t => !t.completed && t.dueDate < today).length;

  const filters = ['All', 'DSA', 'Development', 'Core Subjects', 'Soft Skills', 'System Design'];

  const filteredCategories = categories.filter(c => activeFilter === 'All' || c.name === activeFilter);

  const toggleTask = (catId: string, taskId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        tasks: c.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      };
    }));
  };

  const deleteTask = (catId: string, taskId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return { ...c, tasks: c.tasks.filter(t => t.id !== taskId) };
    }));
  };

  const addTask = (catId: string) => {
    if (!newTaskName.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskName,
      priority: newTaskPriority,
      dueDate: newTaskDate,
      completed: false,
      category: categories.find(c => c.id === catId)?.name || ''
    };
    setCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return { ...c, tasks: [...c.tasks, newTask] };
    }));
    setNewTaskName('');
    setIsAddingTask(null);
  };

  return (
    <div style={{
      background: COLORS.bg, minHeight: '100vh', padding: '60px 20px',
      fontFamily: '"DM Sans", sans-serif', color: COLORS.primary
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        
        {/* --- Header --- */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', margin: 0 }}>Prep Checklist</h1>
            <span style={{ fontSize: 14, color: COLORS.muted }}>{completedTasks} / {totalTasks} tasks</span>
          </div>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: '0 0 20px' }}>Track everything left before placement season</p>
          
          <div style={{ height: 4, width: '100%', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ height: '100%', background: COLORS.accent, borderRadius: 99 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{dueTodayCount}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase' }}>Due Today</span>
            </div>
            <div style={{ width: 1, height: 24, background: COLORS.divider }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.categories.DSA }}>{inProgressCount}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase' }}>In Progress</span>
            </div>
            <div style={{ width: 1, height: 24, background: COLORS.divider }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.categories.Development }}>{completedTasks}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase' }}>Completed</span>
            </div>
            <div style={{ width: 1, height: 24, background: COLORS.divider }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.categories['Core Subjects'] }}>{overdueCount}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase' }}>Overdue</span>
            </div>
          </div>
        </div>

        {/* --- Filters --- */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {filters.map(f => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                  border: isActive ? 'none' : `1px solid rgba(255, 255, 255, 0.08)`,
                  background: isActive ? 'transparent' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#ffffff' : COLORS.secondary,
                  fontWeight: isActive ? 700 : 600,
                  position: 'relative', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  outline: 'none'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFilterBg"
                    style={{
                      position: 'absolute', inset: 0, background: COLORS.accent,
                      borderRadius: 99, zIndex: -1
                    }}
                  />
                )}
                {f}
              </button>
            );
          })}
        </div>

        {/* --- Groups --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filteredCategories.map(cat => {
            const isCollapsed = collapsed[cat.id];
            const tasks = cat.tasks;
            const completed = tasks.filter(t => t.completed).length;

            return (
              <motion.div
                layout
                key={cat.id}
                style={{
                  background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`,
                  overflow: 'hidden'
                }}
              >
                <div
                  onClick={() => setCollapsed(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  style={{
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color }} />
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 13, color: COLORS.muted }}>{completed} / {tasks.length}</div>
                  <motion.svg
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.muted} strokeWidth="2.5"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </motion.svg>
                </div>
                
                <div style={{ height: 1, background: COLORS.divider, width: '100%' }} />

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ maxHeight: 0, opacity: 0 }}
                      animate={{ maxHeight: 1000, opacity: 1 }}
                      exit={{ maxHeight: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div>
                        {tasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            isOverdue={!task.completed && task.dueDate < today}
                            onToggle={() => toggleTask(cat.id, task.id)}
                            onDelete={() => deleteTask(cat.id, task.id)}
                          />
                        ))}
                        
                        {/* Add Task Inline */}
                        <div style={{ padding: '0 20px 16px' }}>
                          <AnimatePresence mode='wait'>
                            {isAddingTask === cat.id ? (
                              <motion.div
                                key="add-form"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                style={{ paddingTop: 13 }}
                              >
                                <input
                                  autoFocus
                                  value={newTaskName}
                                  onChange={e => setNewTaskName(e.target.value)}
                                  placeholder="What needs to be done?"
                                  style={{
                                    width: '100%', background: 'transparent', border: 'none',
                                    borderBottom: `1.5px solid ${COLORS.divider}`, color: COLORS.primary,
                                    fontSize: 14, padding: '8px 0', outline: 'none', marginBottom: 12
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {(['High', 'Medium', 'Low'] as const).map(p => (
                                      <button
                                        key={p}
                                        onClick={() => setNewTaskPriority(p)}
                                        style={{
                                          padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                                          textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                                          background: newTaskPriority === p ? PRIORITY_STYLES[p].bg : 'rgba(255,255,255,0.03)',
                                          color: newTaskPriority === p ? PRIORITY_STYLES[p].text : COLORS.muted
                                        }}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                    <input
                                      type="date"
                                      value={newTaskDate}
                                      onChange={e => setNewTaskDate(e.target.value)}
                                      style={{
                                        background: 'transparent', border: 'none', color: COLORS.muted,
                                        fontSize: 11, outline: 'none', cursor: 'pointer', marginLeft: 8
                                      }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={() => setIsAddingTask(null)} style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={() => addTask(cat.id)} style={{ background: COLORS.accent, color: '#ffffff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <button
                                key="add-btn"
                                onClick={() => setIsAddingTask(cat.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, padding: '13px 0 0',
                                  background: 'transparent', border: 'none', color: COLORS.muted,
                                  fontSize: 13, cursor: 'pointer', transition: 'color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = COLORS.secondary}
                                onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
                              >
                                + Add a task
                              </button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Add Category */}
          <button
            style={{
              padding: '20px', borderRadius: 14, border: `1px dashed rgba(255, 255, 255, 0.1)`,
              background: 'transparent', color: COLORS.muted, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', marginTop: 12, outline: 'none'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.background = 'transparent'; }}
          >
            + New Category
          </button>
        </div>

      </div>
    </div>
  );
}
