import { create } from 'zustand'
import { adminApi } from '../api/admin'
import type { CompanyProfile } from '../types'

interface CompanyState {
  company: CompanyProfile | null
  loading: boolean
  error: string | null
  fetchCompanyById: (companyId: string) => Promise<void>
  clearCompany: () => void
}

export const useCompanyStore = create<CompanyState>()((set) => ({
  company: null,
  loading: false,
  error: null,
  fetchCompanyById: async (companyId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await adminApi.getCompanyById(companyId)
      set({ company: response.data, loading: false })
    } catch (error: any) {
      set({
        loading: false,
        error: error?.response?.data?.detail ?? 'Failed to load company profile',
      })
    }
  },
  clearCompany: () => set({ company: null, error: null }),
}))
