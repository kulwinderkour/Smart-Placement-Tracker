import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'

// ─── Constants & Types ───────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'Resume', label: 'Resumes', icon: '📄' },
  { id: 'Academic', label: 'Academic', icon: '🎓' },
  { id: 'ID', label: 'ID Proofs', icon: '🆔' },
  { id: 'Offer', label: 'Offers', icon: '💼' },
  { id: 'Certificate', label: 'Certificates', icon: '🏆' },
  { id: 'Other', label: 'Others', icon: '📦' },
]

interface Document {
  id: string
  filename: string
  category: string
  url: string
  uploadDate: string
  size: number
  isPrimary?: boolean
  mimeType: string
}

const API_BASE = 'http://localhost:8081/api/documents'

// ─── Styled Components ───────────────────────────────────────────────────────

const COLORS = {
  bg: '#0d1117',
  cardBg: '#161b22',
  border: '#21262d',
  borderHover: '#30363d',
  text: '#e6edf3',
  textMuted: '#7d8590',
  primary: '#20c997',
  danger: '#f85149',
}

const Panel = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, ...style }}>
    {children}
  </div>
)

export default function DocumentVault() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeTab, setActiveTab] = useState('Resume')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch documents on load
  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}?userId=${user?.id}`)
      const data = await res.json()
      if (data.success) {
        setDocuments(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
  }

  const handleUpload = async (file: File, category: string) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('document', file)
    formData.append('userId', user?.id || '')
    formData.append('category', category)

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setDocuments(prev => [data.data, ...prev])
      } else {
        alert(data.message || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      const res = await fetch(`${API_BASE}/${id}?userId=${user?.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleTogglePrimary = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/primary?userId=${user?.id}`, {
        method: 'PATCH',
      })
      const data = await res.json()
      if (data.success) {
        setDocuments(prev => prev.map(d => ({
          ...d,
          isPrimary: d.category === 'Resume' ? d.id === id : d.isPrimary
        })))
      }
    } catch (err) {
      console.error('Update primary error:', err)
    }
  }

  const filteredDocs = documents.filter(d => 
    d.category === activeTab && 
    d.filename.toLowerCase().includes(search.toLowerCase())
  )

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleUpload(f, activeTab)
  }, [activeTab])

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, position: 'relative' }}>
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/dashboard')}
        style={{
          position: 'absolute', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(33, 38, 45, 0.5)', border: '1px solid #30363d', borderRadius: 8,
          padding: '8px 14px', color: COLORS.textMuted, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', transition: 'all 0.2s', zIndex: 30, backdropFilter: 'blur(8px)'
        }}
        onMouseOver={e => (e.currentTarget.style.background = '#30363d', e.currentTarget.style.color = '#e6edf3')}
        onMouseOut={e => (e.currentTarget.style.background = 'rgba(33, 38, 45, 0.5)', e.currentTarget.style.color = COLORS.textMuted)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </button>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 20px 40px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Document Vault</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Securely store and manage all your academic and career documents.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10,
                border: `1px solid ${activeTab === cat.id ? COLORS.primary : COLORS.border}`,
                background: activeTab === cat.id ? `${COLORS.primary}12` : 'transparent',
                color: activeTab === cat.id ? COLORS.primary : COLORS.textMuted,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          
          {/* List Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder={`Search in ${activeTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}`,
                  borderRadius: 10, padding: '12px 14px 12px 40px', color: COLORS.text, fontSize: 13, outline: 'none'
                }}
              />
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
            </div>

            {/* Document List */}
            <AnimatePresence mode="popLayout">
              {filteredDocs.length > 0 ? filteredDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Panel style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 44, height: 44, borderRadius: 10, background: '#ef444412', border: '1px solid #ef444422',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                    }}>
                      {doc.mimeType === 'application/pdf' ? '📕' : '🖼️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</h4>
                        {doc.isPrimary && <span style={{ background: '#20c99722', color: COLORS.primary, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>Primary</span>}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: COLORS.textMuted }}>{(doc.size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {activeTab === 'Resume' && !doc.isPrimary && (
                        <button onClick={() => handleTogglePrimary(doc.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: COLORS.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Mark Primary</button>
                      )}
                      <a href={`${API_BASE}/${doc.id}/download?userId=${user?.id}`} download style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid #30363d', color: COLORS.textMuted, cursor: 'pointer' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="9" x2="12" y2="15"/></svg>
                      </a>
                      <button onClick={() => handleDelete(doc.id)} style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(248,81,73,0.05)', border: '1px solid rgba(248,81,73,0.2)', color: COLORS.danger, cursor: 'pointer' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </Panel>
                </motion.div>
              )) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
                  <p style={{ margin: 0, fontSize: 14 }}>No documents found in {activeTab}</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Side Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Upload Area */}
            <div
              className={`upload-zone ${isDragging ? 'active' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? COLORS.primary : COLORS.border}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s', background: isDragging ? `${COLORS.primary}05` : 'transparent'
              }}
            >
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], activeTab) }} />
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: COLORS.primary }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{uploading ? 'Uploading...' : `Upload to ${activeTab}`}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: COLORS.textMuted }}>PDF, JPG, PNG up to 5MB</p>
            </div>

            {/* Storage Info */}
            <Panel>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600 }}>Storage Usage</h4>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ width: `${(documents.reduce((acc, curr) => acc + curr.size, 0) / (50 * 1024 * 1024)) * 100}%`, height: '100%', background: COLORS.primary }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textMuted }}>
                <span>{(documents.reduce((acc, curr) => acc + curr.size, 0) / 1024 / 1024).toFixed(1)} MB used</span>
                <span>50 MB limit</span>
              </div>
            </Panel>

            <Panel style={{ borderColor: 'rgba(32, 201, 151, 0.2)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                  Documents in your vault are encrypted and only accessible by you.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <style>{`
        .upload-zone:hover { border-color: ${COLORS.primary} !important; background: ${COLORS.primary}05 !important; }
        .upload-zone.active { border-color: ${COLORS.primary} !important; background: ${COLORS.primary}10 !important; }
      `}</style>
    </div>
  )
}
