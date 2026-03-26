import { create } from 'zustand'
import type { CompanyProfile, CompanyProfilePayload } from '../types'

interface CompanyProfileState {
  profile: CompanyProfile | null
  draft: Partial<CompanyProfilePayload>
  hasHydrated: boolean
  isLoading: boolean
  isSaving: boolean

  setProfile: (profile: CompanyProfile) => void
  clearProfile: () => void
  updateDraft: (patch: Partial<CompanyProfilePayload>) => void
  resetDraft: () => void
  setHydrated: (v: boolean) => void
  setLoading: (v: boolean) => void
  setSaving: (v: boolean) => void
}

export const useCompanyProfileStore = create<CompanyProfileState>()((set) => ({
  profile: null,
  draft: {},
  hasHydrated: false,
  isLoading: false,
  isSaving: false,

  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null, draft: {}, hasHydrated: false }),
  updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  resetDraft: () => set({ draft: {} }),
  setHydrated: (v) => set({ hasHydrated: v }),
  setLoading: (v) => set({ isLoading: v }),
  setSaving: (v) => set({ isSaving: v }),
}))
