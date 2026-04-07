import { aiClient } from './client'
import type { ATSResult } from '../types'

export const aiApi = {
  analyseResume: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return aiClient.post<{ success: boolean; data: ATSResult }>(
      '/ai/resume/analyse',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  getInterviewQuestions: (job_title: string, skills: string[], difficulty = 'medium', question_type = 'mcq', num_questions = 10) =>
    aiClient.post('/ai/interview/questions', { job_title, skills, difficulty, question_type, num_questions }),

  getSkillGap: (student_id: string, job_id: string) =>
    aiClient.get(`/ai/skill-gap/${student_id}/${job_id}`),

  getRecommendations: (student_id: string) =>
    aiClient.get(`/ai/recommend/${student_id}`),
}
