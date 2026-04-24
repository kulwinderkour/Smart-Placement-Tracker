import { aiClient, apiClient } from './client'
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

  // Routes through FastAPI backend-api `/questions/generate` which has Upstash Redis caching.
  getInterviewQuestions: (
    job_title: string,
    skills: string[],
    difficulty = 'medium',
    question_type = 'mcq',
    num_questions = 10,
  ) =>
    apiClient.post('/questions/generate', {
      topic: job_title,
      difficulty,
      type: question_type,
      count: num_questions,
      userSkills: skills,
      customQuestion: false,
    }),

  getSkillGap: (student_id: string, job_id: string) =>
    aiClient.get(`/ai/skill-gap/${student_id}/${job_id}`),

  getRecommendations: (student_id: string) =>
    aiClient.get(`/ai/recommend/${student_id}`),
}
