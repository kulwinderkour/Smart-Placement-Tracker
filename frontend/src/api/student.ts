import { apiClient } from './client'
import type { StudentProfile, Interview, ApiResponse } from '../types'

export const studentApi = {
  getProfile: () => 
    apiClient.get<StudentProfile>('/student/profile'),
  
  updateProfile: (data: Partial<StudentProfile>) => 
    apiClient.patch<StudentProfile>('/student/profile', data),

  /** Admin-scheduled interviews visible to the logged-in student. */
  getMyInterviews: () =>
    apiClient.get<ApiResponse<Interview[]>>('/student/my-interviews'),
}

