import { apiClient } from './client'
import type { CompanyProfile, Job, Student, ApiResponse, AdminStats } from '../types'

export const adminApi = {
  getStats: () =>
    apiClient.get<AdminStats>('/admin/stats'),

  listCompanies: (page = 1, limit = 20, search?: string) =>
    apiClient.get<ApiResponse<CompanyProfile[]>>('/admin/companies', {
      params: { page, limit, search }
    }),

  getCompanyById: (companyId: string) =>
    apiClient.get<CompanyProfile>(`/admin/companies/${companyId}`),

  triggerScrape: () =>
    apiClient.post<{ message: string }>('/admin/trigger-scrape'),

  listStudents: (page = 1, limit = 20) =>
    apiClient.get<ApiResponse<Student[]>>('/admin/students', {
      params: { page, limit }
    }),

  listJobs: (page = 1, limit = 20) =>
    apiClient.get<ApiResponse<Job[]>>('/admin/jobs', {
      params: { page, limit }
    }),

  updateJobStatus: (jobId: string, is_active: boolean) =>
    apiClient.patch<Job>(`/admin/jobs/${jobId}/status`, { is_active }),
}
