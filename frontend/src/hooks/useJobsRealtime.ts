import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeJobEvent } from '../types'

const WS_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
    .replace(/^http/, 'ws')
    .replace(/\/api\/v1\/?$/, '') + '/api/v1/student/ws/jobs'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseJobsRealtimeOptions {
  onEvent?: (event: RealtimeJobEvent) => void
  enabled?: boolean
}

interface UseJobsRealtimeReturn {
  status: ConnectionStatus
  lastEvent: RealtimeJobEvent | null
  connect: () => void
  disconnect: () => void
}

/**
 * React hook for subscribing to real-time job updates via WebSocket.
 *
 * Usage (Admin / Company side — shows live feed indicator):
 *   const { status, lastEvent } = useJobsRealtime({
 *     onEvent: (e) => queryClient.invalidateQueries({ queryKey: ['company-jobs'] }),
 *   })
 *
 * Usage (Student side — receives live job board updates):
 *   const { lastEvent } = useJobsRealtime({
 *     onEvent: (e) => {
 *       if (e.event === 'job_created') setJobs(prev => [e.job, ...prev])
 *       if (e.event === 'job_deleted') setJobs(prev => prev.filter(j => j.id !== e.job.id))
 *     },
 *   })
 */
export function useJobsRealtime({
  onEvent,
  enabled = true,
}: UseJobsRealtimeOptions = {}): UseJobsRealtimeReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<RealtimeJobEvent | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)
  const mountedRef = useRef(true)

  const clearTimers = () => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    pingIntervalRef.current = null
    reconnectTimeoutRef.current = null
  }

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setStatus('connected')
      reconnectDelay.current = 1000

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 25_000)
    }

    ws.onmessage = (e) => {
      if (!mountedRef.current) return
      if (e.data === 'pong') return
      try {
        const event = JSON.parse(e.data) as RealtimeJobEvent
        setLastEvent(event)
        onEvent?.(event)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      clearTimers()
      setStatus('disconnected')

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000)
        connect()
      }, reconnectDelay.current)
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setStatus('error')
      ws.close()
    }
  }, [enabled, onEvent])

  const disconnect = useCallback(() => {
    clearTimers()
    wsRef.current?.close()
    wsRef.current = null
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (enabled) connect()
    return () => {
      mountedRef.current = false
      clearTimers()
      wsRef.current?.close()
    }
  }, [enabled, connect])

  return { status, lastEvent, connect, disconnect }
}
