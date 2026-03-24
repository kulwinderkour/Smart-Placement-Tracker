import { apiClient } from './client'
import type { CompanyProfile, CompanyProfilePayload } from '../types'

export const companyApi = {
  /** Fetch the authenticated admin onboarding profile */
  getProfile: () => apiClient.get<CompanyProfile>('/company/profile'),

  /** Create onboarding profile for admin account. */
  createProfile: (data: CompanyProfilePayload) =>
    apiClient.post<CompanyProfile>('/company/profile', data),

  /** Update onboarding profile for admin account. */
  updateProfile: (data: Partial<CompanyProfilePayload>) =>
    apiClient.put<CompanyProfile>('/company/profile', data),
}
