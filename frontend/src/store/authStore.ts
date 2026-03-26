import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  updateUser: (patch: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  setUser: (user: User) => set({ user, isAuthenticated: true }),
  updateUser: (patch: Partial<User>) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    // Clean up legacy key + any user-scoped onboarding keys
    localStorage.removeItem('onboardingComplete')
    Object.keys(localStorage)
      .filter(k => k.startsWith('onboardingComplete_'))
      .forEach(k => localStorage.removeItem(k))
    set({ user: null, isAuthenticated: false })
  },
}))