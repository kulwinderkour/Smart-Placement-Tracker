import { apiClient } from './client'
import type { User, LoginResponse } from '../types'

export const authApi = {
  register: (email: string, password: string, role = 'student') =>
    apiClient.post<User>('/auth/register', { email, password, role }),

  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }),

  firebaseAuth: (idToken: string, role?: string, email?: string) =>
    apiClient.post<LoginResponse>('/auth/firebase', { id_token: idToken, role, email }),

  me: () => apiClient.get<User>('/auth/me'),

  completeOnboarding: () => apiClient.patch<User>('/auth/complete-onboarding'),
}
