import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  setUser: (user: User) => set({ user, isAuthenticated: true }),
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