import { apiClient } from './client'
import type { User, TokenResponse } from '../types'

export const authApi = {
  register: (email: string, password: string, role = 'student') =>
    apiClient.post<User>('/auth/register', { email, password, role }),

  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>('/auth/login', { email, password }),

  me: () => apiClient.get<User>('/auth/me'),
}
