import { create } from 'zustand'
import type { Job } from '../types'

interface JobState {
  jobs: Job[]
  selectedJob: Job | null
  totalJobs: number
  currentPage: number
  setJobs: (jobs: Job[], total: number) => void
  setSelectedJob: (job: Job | null) => void
  setPage: (page: number) => void
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  selectedJob: null,
  totalJobs: 0,
  currentPage: 1,
  setJobs: (jobs, total) => set({ jobs, totalJobs: total }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  setPage: (page) => set({ currentPage: page }),
}))
