import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { Loader2 } from 'lucide-react'

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
    } catch (err: any) {
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Is the backend running?')
      } else {
        setError('Invalid email or password')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@400;600;700;800&display=swap');
        @media (max-width: 768px) {
          .split-right-panel { display: none !important; }
          .split-card-wrapper { maxWidth: 400px !important; }
          .split-left-panel { padding: 32px 24px !important; }
        }
        input::placeholder { color: rgba(255,255,255,0.4); }
      `}} />


      <div className="split-card-wrapper" style={{
        width: '100%',
        maxWidth: 860,
        borderRadius: 16,
        border: '1.5px solid #7c3aed',
        boxShadow: '0 0 40px rgba(124,58,237,0.35), 0 0 80px rgba(124,58,237,0.15), inset 0 0 40px rgba(124,58,237,0.05)',
        display: 'flex',
        overflow: 'hidden',
        minHeight: 420,
        position: 'relative'
      }}>
        
        {/* LEFT PANEL — FORM SIDE */}
        <div className="split-left-panel" style={{
          flex: 1,
          background: '#0d0d14',
          padding: '48px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <h1 style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 32,
            marginTop: 0,
            textAlign: 'center'
          }}>Login</h1>

          <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
            {/* Email Field */}
            <div style={{ position: 'relative', marginBottom: 20, borderBottom: '1.5px solid rgba(255,255,255,0.2)' }}>
              <input
                {...register('email')}
                type="email"
                placeholder="Email Address"
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 0',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.parentElement!.style.borderBottom = '1.5px solid #7c3aed'; }}
                onBlur={(e) => { e.currentTarget.parentElement!.style.borderBottom = '1.5px solid rgba(255,255,255,0.2)'; }}
              />
              <svg style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)', width:16, height:16, pointerEvents:'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>
                {errors.email.message}
              </p>
            )}

            {/* Password Field */}
            <div style={{ position: 'relative', marginBottom: 20, borderBottom: '1.5px solid rgba(255,255,255,0.2)' }}>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 0',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.parentElement!.style.borderBottom = '1.5px solid #7c3aed'; }}
                onBlur={(e) => { e.currentTarget.parentElement!.style.borderBottom = '1.5px solid rgba(255,255,255,0.2)'; }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}
                title="Toggle password visibility"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>
                {errors.password.message}
              </p>
            )}

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', boxSizing: 'border-box' }}>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626'}}></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '13px',
                background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'Sora, sans-serif',
                border: 'none',
                borderRadius: 30,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginTop: 12,
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSubmitting ? 0.8 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #5b21b6, #6d28d9)';
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(124,58,237,0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #6d28d9, #7c3aed)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:20 }}>
            Don't have an account? <Link to="/register" style={{ color:'#a78bfa', fontWeight:600, cursor:'pointer', textDecoration: 'none' }}>Sign Up</Link>
          </div>
        </div>

        {/* RIGHT PANEL — WELCOME SIDE */}
        <div className="split-right-panel" style={{
          width: 260,
          flexShrink: 0,
          background: 'linear-gradient(160deg, #4c1d95 0%, #6d28d9 40%, #7c3aed 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          position: 'relative',
          clipPath: 'polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)'
        }}>
          <div style={{ textAlign:'center', paddingLeft: 20 }}>
            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 32,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              marginTop: 0
            }}>
              WELCOME<br/>BACK!
            </h2>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.65,
              maxWidth: 160,
              margin: '0 auto'
            }}>
              Your AI-powered placement companion awaits you.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
