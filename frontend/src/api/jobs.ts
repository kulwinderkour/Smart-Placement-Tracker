import { apiClient } from './client'
import type { Job, ApiResponse } from '../types'

export const jobsApi = {
  list: (page = 1, limit = 20, location?: string) =>
    apiClient.get<ApiResponse<Job[]>>('/jobs', {
      params: { page, limit, location }
    }),

  get: (id: string) =>
    apiClient.get<Job>(`/jobs/${id}`),

  create: (data: Partial<Job>) =>
    apiClient.post<Job>('/jobs', data),

  delete: (id: string) =>
    apiClient.delete(`/jobs/${id}`),
}
