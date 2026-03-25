import { apiClient } from './client'
import type { Job, CompanyJobCreate, CompanyStats, ApiResponse, ApplicationWithStudent } from '../types'

export const companyJobsApi = {
  /** List all jobs belonging to THIS company (isolated by company_profile_id). */
  list: (page = 1, limit = 20, is_active?: boolean) =>
    apiClient.get<ApiResponse<Job[]>>('/company/jobs', {
      params: { page, limit, ...(is_active !== undefined ? { is_active } : {}) },
    }),

  /** Get a single company-owned job. */
  get: (jobId: string) =>
    apiClient.get<{ success: boolean; data: Job }>(`/company/jobs/${jobId}`),

  /** Create a new job. Company name is auto-filled from the company profile. */
  create: (data: CompanyJobCreate) =>
    apiClient.post<{ success: boolean; data: Job }>('/company/jobs', data),

  /** Full update of a company-owned job. */
  update: (jobId: string, data: Partial<CompanyJobCreate>) =>
    apiClient.put<{ success: boolean; data: Job }>(`/company/jobs/${jobId}`, data),

  /** Toggle active / inactive status. */
  setStatus: (jobId: string, is_active: boolean) =>
    apiClient.patch<{ success: boolean; data: Job }>(`/company/jobs/${jobId}/status`, { is_active }),

  /** Soft-delete a job (marks inactive, preserves application history). */
  delete: (jobId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/company/jobs/${jobId}`),

  /** Get applicants for a specific company-owned job. */
  getApplicants: (jobId: string, status?: string, page = 1, limit = 50) =>
    apiClient.get<ApiResponse<ApplicationWithStudent[]>>(
      `/company/jobs/${jobId}/applicants`,
      { params: { status, page, limit } },
    ),

  /**
   * List ALL applicants across ALL of this company's jobs.
   * Company-isolated: never returns other companies' applicant data.
   */
  listApplicants: (jobId?: string, status?: string, page = 1, limit = 50) =>
    apiClient.get<ApiResponse<ApplicationWithStudent[]>>('/company/applicants', {
      params: { job_id: jobId, status, page, limit },
    }),

  /** Update an applicant's status (only allowed for this company's jobs). */
  updateApplicantStatus: (applicationId: string, status: string) =>
    apiClient.patch<{ id: string; status: string }>(
      `/company/applicants/${applicationId}/status`,
      { status },
    ),

  /** Company-scoped dashboard statistics. */
  getStats: () =>
    apiClient.get<{ success: boolean; data: CompanyStats }>('/company/stats'),
}
