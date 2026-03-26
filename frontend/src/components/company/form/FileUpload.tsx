import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface FileUploadProps {
  value: string
  onChange: (url: string) => void
}

export default function FileUpload({ value, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const processFile = (file: File) => {
    setError('')
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB')
      return
    }

    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPG, SVG or WebP allowed')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => onChange((e.target?.result as string) || '')
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id="company-logo-file-input"
        type="file"
        accept="image/*"
        className="sr-only"
        title="Upload company logo"
        aria-label="Upload company logo"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            processFile(e.target.files[0])
          }
        }}
      />

      <label
        htmlFor="company-logo-file-input"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0])
          }
        }}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-300 py-10
          ${dragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-white/15 bg-white/3 hover:border-cyan-400/40 hover:bg-white/5'
          }
        `}
      >

        {value ? (
          <img
            src={value}
            alt="Company logo preview"
            className="max-h-28 max-w-50 object-contain rounded-xl"
          />
        ) : (
          <>
            <ImagePlus className="w-10 h-10 text-white/20" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white/60">
                Drag and drop or <span className="text-cyan-300">click to upload</span>
              </p>
              <p className="text-[11px] text-white/30 mt-1">PNG, JPG, SVG, WebP - Max 2 MB</p>
            </div>
          </>
        )}
      </label>

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex items-center gap-1.5 self-center text-xs text-red-300 hover:text-red-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Remove logo
        </button>
      )}

      {error && <p className="text-xs text-red-300 text-center">{error}</p>}
    </div>
  )
}
