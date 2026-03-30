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

// --- Constants & Color System (Teal Theme) ---

const COLORS = {
  bg: '#0d1117', // Match DashboardLayout
  surface: '#161b22', 
  border: '#21262d',
  borderHover: '#30363d',
  primary: '#e6edf3',
  secondary: '#8b949e',
  muted: '#7d8590',
  accent: '#20c997', // Teal from Dashboard
  accentHover: '#28a745',
  accentTint: '#20c99712',
  completedText: '#484f58',
  divider: '#21262d',
  rowBorder: '#21262d44',
  categories: {
    DSA: '#58a6ff', // Blue
    Development: '#20c997', // Teal
    'Core Subjects': '#d29922', // Yellow/Orange
    'Soft Skills': '#bc8cff', // Purple
    'System Design': '#7c3aed', // Violet
  } as Record<string, string>,
};

const PRIORITY_STYLES = {
  High: { bg: '#2d1b1b', text: '#f85149' }, // Red tint
  Medium: { bg: '#2d2208', text: '#d29922' }, // Yellow tint
  Low: { bg: '#1f2d3d', text: '#58a6ff' }, // Blue tint
};

// --- Mock Data (Cleared for Clean Page) ---

const INITIAL_CATEGORIES: Category[] = [];

// --- Components ---

const Checkbox = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    style={{
      width: 17, height: 17, borderRadius: 4, background: checked ? COLORS.accent : 'transparent',
      border: `1.5px solid ${checked ? COLORS.accent : '#30363d'}`,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
      padding: 0, flexShrink: 0
    }}
  >
    <AnimatePresence>
      {checked && (
        <motion.svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }} transition={{ duration: 0.2 }}
        >
          <path d="M2 5L4.5 7.5L8.5 2.5" />
        </motion.svg>
      )}
    </AnimatePresence>
  </button>
);

const TaskRow = ({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const pStyle = PRIORITY_STYLES[task.priority];

  return (
    <motion.div
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      exit={{ height: 0, opacity: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
        borderBottom: `1px solid ${COLORS.rowBorder}`,
        transition: 'all 0.2s'
      }}
    >
      <Checkbox checked={task.completed} onToggle={onToggle} />
      
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          fontWeight: 500, fontSize: 13,
          color: task.completed ? COLORS.completedText : COLORS.primary,
          textDecoration: task.completed ? 'line-through' : 'none',
          transition: 'color 0.2s'
        }}>
          {task.title}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: pStyle.text, background: pStyle.bg,
          padding: '2px 6px', borderRadius: 4, letterSpacing: '0.2px', textTransform: 'uppercase',
          border: `1px solid ${pStyle.text}22`
        }}>
          {task.priority}
        </div>
        
        <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>
          {task.dueDate}
        </div>

        <motion.button
          onClick={onDelete}
          animate={{ opacity: hovered ? 1 : 0 }}
          style={{
            background: 'transparent', border: 'none', color: '#f85149',
            fontSize: 16, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryColor, setSelectedCategoryColor] = useState(Object.values(COLORS.categories)[0]);

  // --- Derived Stats ---
  const allTasks = categories.flatMap(c => c.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const dueTodayCount = allTasks.filter(t => !t.completed && t.dueDate === today).length;
  const inProgressCount = allTasks.filter(t => !t.completed).length;
  const overdueCount = allTasks.filter(t => !t.completed && t.dueDate < today).length;

  const filters = ['All', ...categories.map(c => c.name)];

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

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: `cat-${Math.random().toString(36).substr(2, 9)}`,
      name: newCategoryName,
      color: selectedCategoryColor,
      tasks: []
    };
    setCategories(prev => [...prev, newCat]);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  return (
    <div style={{
      width: '100%', minHeight: '100vh', padding: '40px 28px',
      fontFamily: '"Inter", sans-serif', color: COLORS.primary,
      background: 'transparent' // Inherit from DashboardLayout
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main content container - No centered column partition */}
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0' }}>
        
        {/* --- Header --- */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
            <h1 style={{ fontWeight: 600, fontSize: 24, margin: 0 }}>Task Board</h1>
            <span style={{ fontSize: 13, color: COLORS.muted }}>{completedTasks} / {totalTasks} tasks complete</span>
          </div>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: '0 0 24px' }}>Track everything left before placement season</p>
          
          <div style={{ height: 6, width: '100%', background: '#21262d', borderRadius: 3, overflow: 'hidden', marginBottom: 24 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ height: '100%', background: COLORS.accent, borderRadius: 3 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{dueTodayCount}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', fontWeight: 500 }}>Due Today</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.categories.DSA }}>{inProgressCount}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', fontWeight: 500 }}>In Progress</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.categories.Development }}>{completedTasks}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', fontWeight: 500 }}>Completed</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.categories['Core Subjects'] }}>{overdueCount}</span>
              <span style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', fontWeight: 500 }}>Overdue</span>
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
                  padding: '5px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${isActive ? COLORS.accent : '#21262d'}`,
                  background: isActive ? '#20c99712' : '#161b22',
                  color: isActive ? COLORS.accent : COLORS.secondary,
                  fontWeight: 500,
                  transition: 'all 0.15s ease', outline: 'none'
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* --- Groups Grid (matching Dashboard vibe) --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 20 }}>
          {filteredCategories.map(cat => {
            const isCollapsed = collapsed[cat.id];
            const tasks = cat.tasks;
            const completed = tasks.filter(t => t.completed).length;

            return (
              <motion.div
                layout
                key={cat.id}
                style={{
                  background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}`,
                  overflow: 'hidden', height: 'fit-content'
                }}
              >
                <div
                  onClick={() => setCollapsed(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  style={{
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{completed} / {tasks.length}</div>
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
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {tasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTask(cat.id, task.id)}
                            onDelete={() => deleteTask(cat.id, task.id)}
                          />
                        ))}
                        
                        {/* Add Task Inline */}
                        <div style={{ padding: '4px 20px 16px' }}>
                          <AnimatePresence mode='wait'>
                            {isAddingTask === cat.id ? (
                              <motion.div
                                key="add-form"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                style={{ paddingTop: 12 }}
                              >
                                <input
                                  autoFocus
                                  value={newTaskName}
                                  onChange={e => setNewTaskName(e.target.value)}
                                  placeholder="What needs to be done?"
                                  style={{
                                    width: '100%', background: 'transparent', border: 'none',
                                    borderBottom: `1px solid ${COLORS.divider}`, color: COLORS.primary,
                                    fontSize: 13, padding: '6px 0', outline: 'none', marginBottom: 12
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {(['High', 'Medium', 'Low'] as const).map(p => (
                                      <button
                                        key={p}
                                        onClick={() => setNewTaskPriority(p)}
                                        style={{
                                          padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                                          textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                                          background: newTaskPriority === p ? PRIORITY_STYLES[p].text + '22' : '#21262d',
                                          color: newTaskPriority === p ? PRIORITY_STYLES[p].text : COLORS.muted
                                        }}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setIsAddingTask(null)} style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={() => addTask(cat.id)} style={{ background: COLORS.accent, color: '#0d1117', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <button
                                key="add-btn"
                                onClick={() => setIsAddingTask(cat.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 0',
                                  background: 'transparent', border: 'none', color: COLORS.accent,
                                  fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: 0.8
                                }}
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
          <AnimatePresence>
            {isAddingCategory ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                style={{
                  background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}`,
                  padding: '24px', height: 'fit-content'
                }}
              >
                <div style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Create New Group</div>
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Group Name (e.g. Internships)"
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${COLORS.divider}`, color: COLORS.primary,
                    fontSize: 14, padding: '8px 0', outline: 'none', marginBottom: 20
                  }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {Object.values(COLORS.categories).map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedCategoryColor(color)}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', background: color, border: 'none',
                          cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                          border: selectedCategoryColor === color ? '2px solid white' : `2px solid transparent`
                        }}
                      />
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setIsAddingCategory(false)} style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={addCategory} style={{ background: COLORS.accent, color: '#0d1117', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Create</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setIsAddingCategory(true)}
                style={{
                  padding: '24px', borderRadius: 10, border: `1px dashed #21262d`,
                  background: 'transparent', color: COLORS.muted, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s ease', height: '100%'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = COLORS.muted; }}
              >
                + New Category
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
