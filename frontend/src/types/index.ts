export interface User {
  id: string
  email: string
  role: 'student' | 'admin' | 'provider'
  is_active: boolean
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
  resume_url?: string
  ats_score?: number
  linkedin_url?: string
  github_url?: string
}

export interface Job {
  id: string
  company_name: string
  role_title: string
  location?: string
  salary_min?: number
  salary_max?: number
  job_type?: 'full_time' | 'intern' | 'contract'
  description?: string
  deadline?: string
  is_active: boolean
  created_at: string
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
