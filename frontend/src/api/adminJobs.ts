import { scraperClient } from './client'

export interface AdminJob {
  id: string
  title: string
  company: string
  location?: string
  package_lpa?: number
  job_type?: string
  required_skills?: string[]
  min_cgpa?: number
  application_deadline?: string
  apply_link?: string
  company_logo?: string
  openings?: number
  is_active: boolean
  description?: string
  posted_by?: string
  created_at: string
}

export const adminJobsApi = {
  /** Get all active jobs for students. */
  getActiveJobs: () =>
    scraperClient.get<{ jobs: AdminJob[] }>('/admin-jobs/active'),

  /** Get a single active job. */
  getActiveJob: (id: string) =>
    scraperClient.get<AdminJob>(`/admin-jobs/active/${id}`),

  /** Create a new admin job posting. */
  create: (data: Partial<AdminJob>) =>
    scraperClient.post<AdminJob>('/admin-jobs', data),
}
