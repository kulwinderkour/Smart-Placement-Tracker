export interface User {
  id: string
  email: string
  role: 'student' | 'admin'
  is_active: boolean
  is_onboarding_completed: boolean
  created_at: string
}

export interface Student {
  id: string
  user_id: string
  full_name: string
  phone?: string
  college?: string
  branch?: string
  graduation_year?: number
  cgpa?: number
  job_type?: string
  resume_url?: string
  resume_base64?: string
  resume_name?: string
  skills?: string[]
  ats_score?: number
  linkedin_url?: string
  github_url?: string
  created_at: string
}

export type StudentProfile = Student

export interface Job {
  id: string
  company_name: string
  company_profile_id?: string
  role_title: string
  location?: string
  salary_min?: number
  salary_max?: number
  experience_min?: number
  experience_max?: number
  job_type?: 'full_time' | 'intern' | 'contract'
  description?: string
  deadline?: string
  is_active: boolean
  application_count?: number
  created_at: string
  updated_at?: string
}

export interface CompanyJobCreate {
  role_title: string
  location?: string
  salary_min?: number
  salary_max?: number
  experience_min?: number
  experience_max?: number
  job_type?: 'full_time' | 'intern' | 'contract'
  description?: string
  deadline?: string
}

export interface CompanyStats {
  company_name: string
  company_id: string
  total_jobs: number
  active_jobs: number
  total_applications: number
  status_breakdown: Record<string, number>
  offer_count: number
  offer_rate: number
  recent_jobs: Job[]
  recent_applications: {
    id: string
    student_name: string
    role_title: string
    status: string
    applied_at: string
  }[]
}

export interface RealtimeJobEvent {
  event: 'job_created' | 'job_updated' | 'job_deleted' | 'job_activated' | 'job_deactivated'
  job: Partial<Job> & { id: string }
}

export interface Application {
  id: string
  student_id: string
  job_id: string
  status: 'applied' | 'online_test' | 'technical_round' | 'hr_round' | 'offer' | 'rejected'
  applied_at: string
  notes?: string
  next_step_date?: string
  offer_ctc?: number
  job?: Job
}

export interface Skill {
  name: string
  category: string
}

export interface ATSResult {
  ats_score: number
  breakdown: {
    keyword_match: number
    sections: number
    formatting: number
    achievements: number
    length: number
  }
  suggestions: string[]
  skills: Skill[]
  word_count: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginResponse extends TokenResponse {
  role: string
  is_onboarding_completed: boolean
}

export interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  website?: string
  company_email?: string
  hr_contact_number?: string
  address?: string
  description?: string
  industry_type?: string
  company_size?: string
  logo_url?: string
  linkedin_url?: string
  location?: string
  founded_year?: number
  is_draft: boolean
  created_at: string
  updated_at: string
}

export interface CompanyProfilePayload {
  company_name: string
  website?: string
  company_email?: string
  hr_contact_number?: string
  address?: string
  description?: string
  industry_type?: string
  company_size?: string
  logo_url?: string
  linkedin_url?: string
  location?: string
  founded_year?: number
  submit: boolean
}

export interface AdminRecentJob {
  id: string
  company_name: string
  role_title: string
  is_active: boolean
  created_at: string
}

export interface AdminRecentApplication {
  id: string
  student_name: string
  company_name: string
  role_title: string
  status: Application['status']
  applied_at: string
}

export interface IndustryDistributionItem {
  industry_type: string
  count: number
}

export interface CompanyGrowthItem {
  month: string
  count: number
}

export interface AdminStats {
  total_students: number
  total_companies: number
  total_jobs: number
  total_applications: number
  recent_companies: CompanyProfile[]
  recent_jobs: AdminRecentJob[]
  recent_applications: AdminRecentApplication[]
  industry_distribution: IndustryDistributionItem[]
  company_growth: CompanyGrowthItem[]
}

export interface JobCreatePayload {
  company_name: string
  role_title: string
  location?: string
  salary_min?: number
  salary_max?: number
  job_type?: 'full_time' | 'intern' | 'contract'
  description?: string
  deadline?: string
}

export interface ApplicationWithStudent {
  id: string
  student_id: string
  job_id: string
  student_name: string
  college?: string
  branch?: string
  graduation_year?: number
  cgpa?: number
  ats_score?: number
  phone?: string
  resume_url?: string
  linkedin_url?: string
  role_title: string
  company_name: string
  status: 'applied' | 'online_test' | 'technical_round' | 'hr_round' | 'offer' | 'rejected'
  applied_at: string
  notes?: string
}

export interface Interview {
  id: string
  student_id: string
  job_id: string
  student_name: string
  role_title: string
  scheduled_at: string
  mode: 'google_meet' | 'zoom' | 'offline'
  meeting_link?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
  feedback_rating?: number
  feedback_comment?: string
  created_at: string
}

export interface AnalyticsData {
  applications_over_time: { date: string; count: number }[]
  placement_funnel: { status: string; count: number }[]
  top_colleges: { college: string; count: number }[]
  offer_rate: number
  shortlist_rate: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    page: number
    limit: number
    total: number
  }
}
