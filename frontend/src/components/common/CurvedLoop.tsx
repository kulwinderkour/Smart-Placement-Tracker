import { useEffect, useRef, useState } from 'react'

interface CurvedLoopProps {
  marqueeText?: string
  speed?: number
  curveAmount?: number
  direction?: 'left' | 'right'
  interactive?: boolean
  className?: string
  fontSize?: number
  color?: string
  gradientColors?: [string, string]
}

export default function CurvedLoop({
  marqueeText = 'Welcome to SmartPlacement ✦',
  speed = 1,
  curveAmount = 300,
  direction = 'left',
  interactive = false,
  className = '',
  fontSize = 32,
  color,
  gradientColors,
}: CurvedLoopProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [offset, setOffset] = useState(0)
  const [dragSpeed, setDragSpeed] = useState(0)
  const isDragging = useRef(false)
  const lastX = useRef(0)

  // Repeat text enough to fill the curve
  const repeatedText = `${marqueeText}   `.repeat(8)

  useEffect(() => {
    let animId: number
    const animate = () => {
      setOffset(prev => {
        const dir = direction === 'left' ? 1 : -1
        const effectiveSpeed = speed + dragSpeed
        return (prev + dir * effectiveSpeed * 0.5) % 2000
      })
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [speed, direction, dragSpeed])

  // Gradually decay drag speed
  useEffect(() => {
    if (!interactive) return
    const decay = setInterval(() => {
      setDragSpeed(prev => {
        if (Math.abs(prev) < 0.05) return 0
        return prev * 0.95
      })
    }, 16)
    return () => clearInterval(decay)
  }, [interactive])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return
    isDragging.current = true
    lastX.current = e.clientX
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive || !isDragging.current) return
    const dx = e.clientX - lastX.current
    setDragSpeed(dx * 0.08)
    lastX.current = e.clientX
  }

  const handlePointerUp = () => {
    isDragging.current = false
  }

  // Build SVG path — full-width curve spanning entire container
  const viewBoxW = 1200
  const viewBoxH = curveAmount + 60
  const startY = 10
  const peakY = curveAmount
  // Path extends beyond viewBox on both sides so text starts at the very left edge
  const path = `M -600,${startY} Q ${viewBoxW / 2},${peakY} ${viewBoxW + 600},${startY}`

  const gradientId = useRef('curvedloop-grad-' + Math.random().toString(36).slice(2, 8)).current

  return (
    <div
      className={className}
      style={{
        width: '100%',
        overflow: 'hidden',
        cursor: interactive ? 'grab' : 'default',
        userSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        {gradientColors && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
        )}

        <path id="curvedPath" d={path} fill="none" stroke="none" />

        <text
          fontSize={fontSize}
          fontWeight={700}
          fontFamily="Sora, DM Sans, sans-serif"
          letterSpacing="0.06em"
          fill={gradientColors ? `url(#${gradientId})` : color || 'rgba(255,255,255,0.15)'}
        >
          <textPath
            href="#curvedPath"
            startOffset={`${-offset}px`}
          >
            {repeatedText}
          </textPath>
        </text>
      </svg>
    </div>
  )
}
