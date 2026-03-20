import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      const res = await authApi.login(data.email, data.password)
      localStorage.setItem('access_token', res.data.access_token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      const meRes = await authApi.me()
      setUser(meRes.data)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans"
      style={{ background: 'linear-gradient(135deg, #4169e1 0%, #5b4fcf 40%, #8b5cf6 70%, #9b59b6 100%)' }}
    >
      {/* Background soft circle */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '-100px', 
          right: '-100px', 
          width: '500px', 
          height: '500px', 
          borderRadius: '50%', 
          background: 'rgba(255,255,255,0.07)', 
          pointerEvents: 'none' 
        }} 
      />

      {/* Back Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 sm:top-8 sm:left-8 text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-sm z-20 flex items-center justify-center cursor-pointer"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Form Card */}
      <div 
        className="relative z-10 w-[90%] max-w-[420px] bg-white mx-auto flex flex-col box-border"
        style={{ 
          borderRadius: '20px', 
          padding: '48px 44px', 
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 480px) {
            .mobile-card-padding {
              padding: 32px 20px !important;
            }
          }
        `}} />
        <div className="mobile-card-padding">
          <h1 
            style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: '#1a1a2e', 
              fontFamily: 'Sora, sans-serif',
              margin: '0 0 4px 0'
            }}
          >
            Welcome back
          </h1>
          <p 
            style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              marginBottom: '28px' 
            }}
          >
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
            {/* Email Field */}
            <div style={{ marginBottom: '16px', width: '100%' }}>
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#374151', 
                  marginBottom: '6px' 
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@domain.com"
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    padding: '13px 16px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: '#fff',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4169e1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(65,105,225,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              {errors.email && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '8px', width: '100%' }}>
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#374151', 
                  marginBottom: '6px' 
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    padding: '13px 40px 13px 16px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: '#fff',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4169e1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(65,105,225,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Link */}
            <Link 
              to="#" 
              style={{ 
                textAlign: 'right', 
                display: 'block', 
                marginTop: '6px', 
                fontSize: '13px', 
                color: '#4169e1',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              Forgot?
            </Link>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626'}}></div>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                padding: '14px',
                marginTop: '20px',
                background: '#3b5fe2',
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'Sora, sans-serif',
                borderRadius: '10px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSubmitting ? 0.8 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#2d4fd6';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,95,226,0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#3b5fe2';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div 
            style={{ 
              textAlign: 'center', 
              marginTop: '20px', 
              fontSize: '13px', 
              color: '#6b7280' 
            }}
          >
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ 
                color: '#4169e1', 
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
