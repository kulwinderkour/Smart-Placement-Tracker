import { apiClient } from './client'
import type { Application } from '../types'

export const applicationsApi = {
  apply: (job_id: string, notes?: string) =>
    apiClient.post<Application>('/applications', { job_id, notes }),

  myApplications: () =>
    apiClient.get<Application[]>('/applications/my'),

  update: (id: string, data: Partial<Application>) =>
    apiClient.patch<Application>(`/applications/${id}`, data),
}
