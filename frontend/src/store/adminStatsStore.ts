import { create } from 'zustand'
import { adminApi } from '../api/admin'
import type { AdminStats } from '../types'

interface AdminStatsState {
  stats: AdminStats | null
  loading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

export const useAdminStatsStore = create<AdminStatsState>()((set) => ({
  stats: null,
  loading: false,
  error: null,
  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      const response = await adminApi.getStats()
      set({ stats: response.data, loading: false })
    } catch (error: any) {
      set({
        loading: false,
        error: error?.response?.data?.detail ?? 'Failed to load admin stats',
      })
    }
  },
}))
