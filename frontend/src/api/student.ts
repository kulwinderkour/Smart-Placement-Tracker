import { apiClient } from './client'
import type { StudentProfile } from '../types'

export const studentApi = {
  getProfile: () => 
    apiClient.get<StudentProfile>('/student/profile'),
  
  updateProfile: (data: Partial<StudentProfile>) => 
    apiClient.patch<StudentProfile>('/student/profile', data),
}
