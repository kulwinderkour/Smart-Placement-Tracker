import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'admin']),
})
type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [searchParams] = useSearchParams()
  const googleError = searchParams.get('error')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' }
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await authApi.register(data.email, data.password, data.role)

      const loginRes = await authApi.login(data.email, data.password)
      const loginData = loginRes.data
      localStorage.setItem('access_token', loginData.access_token)
      localStorage.setItem('refresh_token', loginData.refresh_token)

      const meRes = await authApi.me()
      setUser(meRes.data)

      navigate('/onboarding')
    } catch (err: any) {
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Is the backend running?')
      } else {
        setError('Registration failed. Email may already be in use.')
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

      <button onClick={() => navigate(-1)} title="Go back" aria-label="Go back" style={{
        position: 'fixed',
        top: 20, left: 20,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '50%',
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#fff',
        backdropFilter: 'blur(8px)',
        zIndex: 100
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

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
          }}>Create Account</h1>

          {googleError && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mb-4" style={{ marginBottom: '16px' }}>
              Google sign-in failed. Please try again.
            </p>
          )}

          {/* Google OAuth Button */}
          <a
            href="http://localhost:8000/api/v1/auth/google"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              color: '#ffffff',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
              marginBottom: '24px',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = '#7c3aed';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(124, 58, 237, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              style={{ width: '18px', height: '18px' }}
            />
            Sign up with Google
          </a>

          {/* Divider */}
          <div style={{ position: 'relative', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ 
              padding: '0 16px', 
              color: 'rgba(255, 255, 255, 0.4)', 
              fontSize: '13px', 
              fontFamily: 'DM Sans, sans-serif' 
            }}>
              or register with email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

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

            {/* Role Dropdown */}
            <label style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4, display:'block', fontFamily: 'DM Sans, sans-serif' }}>I am a</label>
            <div style={{ position: 'relative', marginBottom: 20, borderBottom: '1.5px solid rgba(255,255,255,0.2)' }}>
              <select
                {...register('role')}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 0',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  appearance: 'none'
                }}
                onFocus={(e) => { e.currentTarget.parentElement!.style.borderBottom = '1.5px solid #7c3aed'; }}
                onBlur={(e) => { e.currentTarget.parentElement!.style.borderBottom = '1.5px solid rgba(255,255,255,0.2)'; }}
              >
                <option value="student" style={{ background: '#0d0d14', color: '#fff' }}>Student</option>
                <option value="admin" style={{ background: '#0d0d14', color: '#fff' }}>Admin / Placement Officer</option>
              </select>
              <svg style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'rgba(255,255,255,0.4)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {errors.role && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>
                {errors.role.message}
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
                marginTop: 4,
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
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:20 }}>
            Already have an account? <Link to="/login-form" style={{ color:'#a78bfa', fontWeight:600, cursor:'pointer', textDecoration: 'none' }}>Sign In</Link>
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
              JOIN US<br/>TODAY!
            </h2>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.65,
              maxWidth: 160,
              margin: '0 auto'
            }}>
              Start your journey to land your dream job today.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
