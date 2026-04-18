import { useEffect, useMemo, useRef, useState } from 'react'

type FreepadPage = {
  id: string
  title: string
  body: string
  createdAt: number
  updatedAt: number
}

type FreepadStoreV1 = {
  version: 1
  activePageId: string
  pages: FreepadPage[]
}

const STORAGE_KEY = 'freepad:v1'
const ACCENT = '#1D9E75'
const BG = 'var(--student-bg)'
const SURFACE = 'var(--student-surface)'
const BORDER = 'var(--student-border)'
const MUTED = 'var(--student-text-muted)'
const TEXT = 'var(--student-text)'

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 8)
}

function createDefaultStore(): FreepadStoreV1 {
  const now = Date.now()
  const firstId = uid()
  return {
    version: 1,
    activePageId: firstId,
    pages: [
      {
        id: firstId,
        title: 'Untitled',
        body: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
  }
}

function safeParseStore(raw: string | null): FreepadStoreV1 {
  if (!raw) return createDefaultStore()
  try {
    const parsed = JSON.parse(raw) as Partial<FreepadStoreV1>
    if (parsed.version !== 1 || !Array.isArray(parsed.pages) || typeof parsed.activePageId !== 'string') {
      return createDefaultStore()
    }
    if (parsed.pages.length === 0) return createDefaultStore()
    const activeExists = parsed.pages.some((p) => p.id === parsed.activePageId)
    return {
      version: 1,
      activePageId: activeExists ? parsed.activePageId : parsed.pages[0].id,
      pages: parsed.pages.map((p) => ({
        id: String((p as any).id),
        title: String((p as any).title ?? 'Untitled'),
        body: String((p as any).body ?? ''),
        createdAt: Number((p as any).createdAt ?? Date.now()),
        updatedAt: Number((p as any).updatedAt ?? Date.now()),
      })),
    }
  } catch {
    return createDefaultStore()
  }
}

function insertSnippet(args: {
  textarea: HTMLTextAreaElement
  before: string
  after?: string
  placeholder?: string
  newlinePadding?: boolean
}) {
  const { textarea, before, after = '', placeholder = '', newlinePadding = false } = args
  const value = textarea.value
  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? 0
  const selected = value.slice(start, end) || placeholder

  const wrap = `${before}${selected}${after}`
  const needsNewlines = newlinePadding && value.length > 0
  const prefix = needsNewlines && start > 0 && value[start - 1] !== '\n' ? '\n' : ''
  const suffix = needsNewlines && end < value.length && value[end] !== '\n' ? '\n' : ''

  const next = value.slice(0, start) + prefix + wrap + suffix + value.slice(end)
  textarea.value = next

  const cursorStart = start + prefix.length + before.length
  const cursorEnd = cursorStart + selected.length
  textarea.focus()
  textarea.setSelectionRange(cursorStart, cursorEnd)

  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function Freepad() {
  const [store, setStore] = useState<FreepadStoreV1>(() =>
    safeParseStore(localStorage.getItem(STORAGE_KEY))
  )

  const activePage = useMemo(
    () => store.pages.find((p) => p.id === store.activePageId) ?? store.pages[0],
    [store]
  )

  const [title, setTitle] = useState(activePage.title)
  const [body, setBody] = useState(activePage.body)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number>(activePage.updatedAt)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const saveTimer = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  // Keep editor state in sync when switching pages
  useEffect(() => {
    setTitle(activePage.title)
    setBody(activePage.body)
    setSaveState('saved')
    setLastSavedAt(activePage.updatedAt)
    setRenamingId(null)
  }, [activePage.id]) // intentionally only on page change

  // Debounced autosave
  useEffect(() => {
    setSaveState('unsaved')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      setSaveState('saving')
      const now = Date.now()
      setStore((prev) => {
        const nextPages = prev.pages.map((p) =>
          p.id === prev.activePageId
            ? { ...p, title: title.trim() ? title : 'Untitled', body, updatedAt: now }
            : p
        )
        const next: FreepadStoreV1 = { ...prev, pages: nextPages }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
      setLastSavedAt(now)
      setSaveState('saved')
    }, 500)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [title, body])

  const createPage = () => {
    const now = Date.now()
    const id = uid()
    const page: FreepadPage = { id, title: 'Untitled', body: '', createdAt: now, updatedAt: now }
    setStore((prev) => {
      const next: FreepadStoreV1 = {
        ...prev,
        activePageId: id,
        pages: [page, ...prev.pages],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const deletePage = (id: string) => {
    setStore((prev) => {
      const remaining = prev.pages.filter((p) => p.id !== id)
      const nextPages = remaining.length ? remaining : createDefaultStore().pages
      const nextActive =
        prev.activePageId === id
          ? nextPages[0].id
          : nextPages.some((p) => p.id === prev.activePageId)
            ? prev.activePageId
            : nextPages[0].id
      const next: FreepadStoreV1 = { ...prev, pages: nextPages, activePageId: nextActive }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const selectPage = (id: string) => {
    setStore((prev) => {
      if (prev.activePageId === id) return prev
      const next: FreepadStoreV1 = { ...prev, activePageId: id }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const startRename = (page: FreepadPage) => {
    setRenamingId(page.id)
    setRenameValue(page.title?.trim() ? page.title : 'Untitled')
    window.setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const commitRename = (id: string) => {
    const nextTitle = renameValue.trim() || 'Untitled'
    setStore((prev) => {
      const now = Date.now()
      const nextPages = prev.pages.map((p) => (p.id === id ? { ...p, title: nextTitle, updatedAt: now } : p))
      const next: FreepadStoreV1 = { ...prev, pages: nextPages }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    if (store.activePageId === id) setTitle(nextTitle)
    setRenamingId(null)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'unsaved'
        ? 'Unsaved'
        : `Saved${lastSavedAt ? ` • ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}`

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, display: 'flex' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          borderRight: `1px solid ${BORDER}`,
          background: BG,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: MUTED, textTransform: 'uppercase' }}>
            Freepad
          </div>
          <button
            onClick={createPage}
            style={{
              background: ACCENT,
              color: BG,
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            New
          </button>
        </div>

        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
          Pages are stored locally in your browser.
        </div>

        <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
          {store.pages.map((p) => {
            const active = p.id === store.activePageId
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: active ? SURFACE : 'transparent',
                  border: `1px solid ${active ? BORDER : 'transparent'}`,
                }}
                onClick={() => selectPage(p.id)}
              >
                <div style={{ minWidth: 0 }}>
                  {renamingId === p.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitRename(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitRename(p.id)
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelRename()
                        }
                      }}
                      aria-label="Rename page"
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: '6px 8px',
                        color: TEXT,
                        fontSize: 13,
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: TEXT,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.title?.trim() ? p.title : 'Untitled'}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(p)
                    }}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${BORDER}`,
                      color: MUTED,
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    title="Rename page"
                    aria-label="Rename page"
                  >
                    Ren
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePage(p.id)
                    }}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${BORDER}`,
                      color: MUTED,
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    title="Delete page"
                    aria-label="Delete page"
                  >
                    Del
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Editor */}
      <main style={{ flex: 1, padding: 22, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 980 }}>
          {/* Top bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: saveState === 'saved' ? ACCENT : saveState === 'saving' ? '#58a6ff' : '#d29922',
                  boxShadow: `0 0 12px ${saveState === 'saved' ? ACCENT + '55' : 'transparent'}`,
                }}
              />
              <div style={{ fontSize: 12, color: MUTED }}>{saveLabel}</div>
            </div>

            {/* Toolbar */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 8,
              }}
            >
              <ToolBtn
                label="B"
                title="Bold"
                onClick={() => textareaRef.current && insertSnippet({ textarea: textareaRef.current, before: '**', after: '**', placeholder: 'bold' })}
              />
              <ToolBtn
                label="I"
                title="Italic"
                onClick={() => textareaRef.current && insertSnippet({ textarea: textareaRef.current, before: '*', after: '*', placeholder: 'italic' })}
              />
              <ToolBtn
                label="H"
                title="Heading"
                onClick={() => textareaRef.current && insertSnippet({ textarea: textareaRef.current, before: '# ', placeholder: 'Heading', newlinePadding: true })}
              />
              <ToolBtn
                label="•"
                title="List"
                onClick={() => textareaRef.current && insertSnippet({ textarea: textareaRef.current, before: '- ', placeholder: 'List item', newlinePadding: true })}
              />
              <ToolBtn
                label="❝"
                title="Quote"
                onClick={() => textareaRef.current && insertSnippet({ textarea: textareaRef.current, before: '> ', placeholder: 'Quote', newlinePadding: true })}
              />
              <ToolBtn
                label="—"
                title="Divider"
                onClick={() => textareaRef.current && insertSnippet({ textarea: textareaRef.current, before: '\n---\n', placeholder: '', newlinePadding: true })}
              />
            </div>
          </div>

          {/* Editor surface */}
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: TEXT,
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                padding: '6px 6px 12px',
                fontFamily: 'Sora, system-ui, sans-serif',
              }}
              aria-label="Page title"
            />

            <div style={{ height: 1, background: BORDER, margin: '0 6px 14px' }} />

            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing…"
              style={{
                width: '100%',
                minHeight: '62vh',
                resize: 'vertical',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: TEXT,
                fontSize: 15,
                lineHeight: 1.65,
                padding: 6,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
              aria-label="Page body"
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function ToolBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 34,
        height: 30,
        borderRadius: 10,
        background: 'transparent',
        border: '1px solid #21262d',
        color: 'var(--student-text)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = ACCENT
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--student-bg)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--student-border)'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

