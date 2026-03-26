import { create } from 'zustand'
import { adminApi } from '../api/admin'
import type { CompanyProfile } from '../types'

interface AdminCompanyState {
  companies: CompanyProfile[]
  total: number
  page: number
  limit: number
  search: string
  loading: boolean
  error: string | null
  fetchCompanies: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>
}

export const useAdminCompanyStore = create<AdminCompanyState>()((set, get) => ({
  companies: [],
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  loading: false,
  error: null,
  fetchCompanies: async (params) => {
    const page = params?.page ?? get().page
    const limit = params?.limit ?? get().limit
    const search = params?.search ?? get().search

    set({ loading: true, error: null, page, limit, search })
    try {
      const response = await adminApi.listCompanies(page, limit, search || undefined)
      set({
        companies: response.data.data,
        total: response.data.meta?.total ?? response.data.data.length,
        loading: false,
      })
    } catch (error: any) {
      set({
        loading: false,
        error: error?.response?.data?.detail ?? 'Failed to load companies',
      })
    }
  },
}))
