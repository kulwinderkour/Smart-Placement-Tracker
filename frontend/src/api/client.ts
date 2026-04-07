import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const AI_URL      = import.meta.env.VITE_AI_URL      || ''
const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:8081/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const aiClient = axios.create({
  baseURL: AI_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const scraperClient = axios.create({
  baseURL: SCRAPER_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}` 
  return config
})

aiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}` 
  return config
})

scraperClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}` 
  return config
})

// Auto logout on 401 — but NOT when the login endpoint itself returns 401
// (wrong credentials): in that case let the form's catch block handle it.
// Also ignore /auth/me 401s so initial load failures gracefully fall back to the landing page instead of forcing a redirect to /login
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
                           error.config?.url?.includes('/auth/register') ||
                           error.config?.url?.includes('/auth/me');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
