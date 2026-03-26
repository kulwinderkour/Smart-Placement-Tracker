import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface CompanyOnboardingGateProps {
  children: React.ReactNode
}

export default function CompanyOnboardingGate({ children }: CompanyOnboardingGateProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') {
      navigate('/dashboard', { replace: true })
      return
    }

    if (user.is_onboarding_completed) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [navigate, user])

  return <>{children}</>
}
