import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { Loader2 } from 'lucide-react';

export default function GoogleCallback() {
  // Make sure this is the FIRST line inside your component function
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Here we parse potential token params sent by the backend in the redirect URL
        const params = new URLSearchParams(location.search);
        const accessToken = params.get('access_token') || params.get('token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          localStorage.setItem('access_token', accessToken);
        }
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }

        // Fetch the user data using the new token or session cookies
        const meRes = await authApi.me();
        
        // This setUser is safe to call inside the effect because we extracted 
        // the function itself at the top level of the component 
        setUser(meRes.data);
        
        const userId = meRes.data.id
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${userId}`);
        if (onboardingComplete === 'true') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }

      } catch (err) {
        console.error('Google Auth Error:', err);
        navigate('/login-form', { replace: true });
      }
    };

    handleGoogleCallback();
  }, [location, navigate, setUser]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: '#fff'
    }}>
      <Loader2 className="w-12 h-12 mb-4 animate-spin text-purple-500" />
      <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px' }}>
        Verifying Google Login...
      </h2>
    </div>
  );
}