import { apiClient } from './client'
import type { CompanyProfile, Job, Student, ApiResponse, AdminStats, ApplicationWithStudent, Interview, AnalyticsData, AdminAnalyticsSummary } from '../types'

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

  listApplicants: (jobId?: string, status?: string, page = 1, limit = 100) =>
    apiClient.get<ApiResponse<ApplicationWithStudent[]>>('/admin/applicants', {
      params: { job_id: jobId, status, page, limit }
    }),

  updateApplicationStatus: (applicationId: string, status: string) =>
    apiClient.patch<ApplicationWithStudent>(`/admin/applicants/${applicationId}/status`, { status }),

  listInterviews: (page = 1, limit = 100) =>
    apiClient.get<ApiResponse<Interview[]>>('/admin/interviews', { params: { page, limit } }),

  createInterview: (data: Partial<Interview>) =>
    apiClient.post<Interview>('/admin/interviews', data),

  updateInterview: (id: string, data: Partial<Interview>) =>
    apiClient.patch<Interview>(`/admin/interviews/${id}`, data),

  getAnalytics: () =>
    apiClient.get<AnalyticsData>('/admin/analytics'),

  getAnalyticsSummary: () =>
    apiClient.get<AdminAnalyticsSummary>('/admin/analytics/summary'),
}
