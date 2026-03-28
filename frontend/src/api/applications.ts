import { apiClient } from './client'
import type { Application } from '../types'

export interface TrackedApplication {
  company: string
  role: string
  package_lpa: number | null
  status: string
  applied_at: string
}

export const applicationsApi = {
  apply: (job_id: string, notes?: string) =>
    apiClient.post<Application>('/applications', { job_id, notes }),

  myApplications: () =>
    apiClient.get<Application[]>('/applications/my'),

  update: (id: string, data: Partial<Application>) =>
    apiClient.patch<Application>(`/applications/${id}`, data),

  trackJobBoardApplication: async (
    userId: string,
    job: { applyUrl: string; title: string; company: string; salary?: string; description?: string }
  ): Promise<string> => {
    const upsertRes = await apiClient.post<{ id: string }>('/internal/agent/upsert-job', {
      source_url: job.applyUrl,
      company_name: job.company,
      role_title: job.title,
      description: job.description?.substring(0, 300) ?? '',
    })
    const jobId = upsertRes.data.id
    await apiClient.post('/internal/agent/apply', {
      job_id: jobId,
      user_id: userId,
      resume_path: 'resume.pdf',
    })
    return jobId
  },

  getMyApplications: (userId: string) =>
    apiClient.get<TrackedApplication[]>(`/internal/agent/applications/${userId}`),
}
