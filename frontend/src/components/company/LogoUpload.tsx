import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface LogoUploadProps {
  value: string
  onChange: (url: string) => void
}

export default function LogoUpload({ value, onChange }: LogoUploadProps) {
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
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) processFile(files[0])
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-300 py-12
          ${dragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-white/15 bg-white/3 hover:border-indigo-500/40 hover:bg-white/5'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          id="logo-file-input"
        />

        {value ? (
          <img
            src={value}
            alt="Company logo preview"
            className="max-h-28 max-w-[200px] object-contain rounded-xl"
          />
        ) : (
          <>
            <ImagePlus className="w-10 h-10 text-white/20" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white/60">
                Drag & drop or{' '}
                <span className="text-indigo-400">click to upload</span>
              </p>
              <p className="text-[11px] text-white/30 mt-1">PNG, JPG, SVG · Max 2 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Remove button */}
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange('') }}
          className="flex items-center gap-1.5 self-center text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Remove logo
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
