import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Building, 
  Users, 
  Clock, 
  Play,
  User,
  Code,
  Database,
  Cloud,
  TrendingUp,
  MessageSquare,
  Calculator,
  Target,
  Palette
} from 'lucide-react';

interface InterviewConfig {
  role: string;
  customRole: string;
  companyType: string;
  interviewerPersona: string;
  duration: string;
}

export default function InterviewSetup() {
  const navigate = useNavigate();
  
  // Debug logging
  console.log('InterviewSetup rendered');
  const [config, setConfig] = useState<InterviewConfig>({
    role: '',
    customRole: '',
    companyType: '',
    interviewerPersona: '',
    duration: '30'
  });

  const roles = [
    { value: 'frontend-developer', label: 'Frontend Developer', icon: Code },
    { value: 'backend-developer', label: 'Backend Developer', icon: Database },
    { value: 'full-stack', label: 'Full Stack Developer', icon: Code },
    { value: 'data-analyst', label: 'Data Analyst', icon: TrendingUp },
    { value: 'devops', label: 'DevOps Engineer', icon: Cloud },
    { value: 'sde-1', label: 'SDE-1', icon: Briefcase },
    { value: 'sde-2', label: 'SDE-2', icon: Briefcase },
    { value: 'hr', label: 'HR', icon: Users },
    { value: 'finance', label: 'Finance', icon: Calculator },
    { value: 'sales', label: 'Sales', icon: Target },
    { value: 'marketing', label: 'Marketing', icon: Palette }
  ];

  const companyTypes = [
    { value: 'product-based', label: 'Product-based', icon: Building },
    { value: 'service-based', label: 'Service-based', icon: Briefcase },
    { value: 'startup', label: 'Startup', icon: TrendingUp },
    { value: 'faang', label: 'FAANG', icon: Code }
  ];

  const interviewerPersonas = [
    { 
      value: 'friendly-hr', 
      label: 'Friendly HR', 
      icon: Users,
      description: 'Warm, conversational, focuses on cultural fit'
    },
    { 
      value: 'strict-technical', 
      label: 'Strict Technical', 
      icon: Code,
      description: 'Technical depth, problem-solving focused'
    },
    { 
      value: 'behavioral-expert', 
      label: 'Behavioral Expert', 
      icon: MessageSquare,
      description: 'Situational questions, soft skills assessment'
    },
    { 
      value: 'mixed', 
      label: 'Mixed', 
      icon: Briefcase,
      description: 'Balanced approach across all areas'
    }
  ];

  const durations = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '45', label: '45 min' },
    { value: '60', label: '60 min' }
  ];

  const handleStartInterview = () => {
    // Validate all required fields
    const selectedRole = config.customRole || config.role;
    if (!selectedRole) {
      alert('Please select a role or enter your custom role');
      return;
    }
    if (!config.companyType) {
      alert('Please select a company type');
      return;
    }
    if (!config.interviewerPersona) {
      alert('Please select an interviewer persona');
      return;
    }
    if (!config.duration) {
      alert('Please select an interview duration');
      return;
    }

    // Create clean config object
    const cleanConfig = {
      role: config.role,
      customRole: config.customRole,
      companyType: config.companyType,
      interviewerPersona: config.interviewerPersona,
      duration: config.duration
    };

    console.log('Navigating to interview room with config:', cleanConfig);
    
    // Navigate with proper state
    navigate('/student/mock-interviews/room', { 
      state: { config: cleanConfig },
      replace: false // Don't replace history, allow going back
    });
  };

  const getIcon = (IconComponent: any, size = 20) => (
    <IconComponent size={size} style={{ color: '#00e5a0' }} />
  );

  return (
    <div style={{ 
      background: '#0f1117', 
      minHeight: '100vh', 
      color: '#ffffff',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700', 
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #00e5a0, #00c896)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Mock Interview Setup
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>
            Configure your AI-powered mock interview session
          </p>
        </div>

        {/* Role Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '1rem', 
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#00e5a0'
          }}>
            Select Your Role
          </label>
          <select
            value={config.role}
            onChange={(e) => setConfig({ ...config, role: e.target.value, customRole: '' })}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#1a1d29',
              border: '1px solid #2a2d3a',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              marginBottom: '1rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">Choose your role...</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          
          {/* Custom Role Input */}
          <input
            type="text"
            placeholder="Or enter your custom role..."
            value={config.customRole}
            onChange={(e) => setConfig({ ...config, role: '', customRole: e.target.value })}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#1a1d29',
              border: '1px solid #2a2d3a',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Company Type Cards */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '1rem', 
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#00e5a0'
          }}>
            Company Type
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            {companyTypes.map(type => (
              <div
                key={type.value}
                onClick={() => setConfig({ ...config, companyType: type.value })}
                style={{
                  background: config.companyType === type.value ? '#1a3d2e' : '#1a1d29',
                  border: config.companyType === type.value ? '2px solid #00e5a0' : '1px solid #2a2d3a',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  {getIcon(type.icon, 24)}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                  {type.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interviewer Persona Cards */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '1rem', 
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#00e5a0'
          }}>
            Interviewer Persona
          </label>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {interviewerPersonas.map(persona => (
              <div
                key={persona.value}
                onClick={() => setConfig({ ...config, interviewerPersona: persona.value })}
                style={{
                  background: config.interviewerPersona === persona.value ? '#1a3d2e' : '#1a1d29',
                  border: config.interviewerPersona === persona.value ? '2px solid #00e5a0' : '1px solid #2a2d3a',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{ 
                  background: '#0f1117',
                  borderRadius: '50%',
                  padding: '0.75rem'
                }}>
                  {getIcon(persona.icon, 20)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600',
                    marginBottom: '0.25rem'
                  }}>
                    {persona.label}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: '#a0a0a0' 
                  }}>
                    {persona.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '1rem', 
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#00e5a0'
          }}>
            Interview Duration
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {durations.map(duration => (
              <div
                key={duration.value}
                onClick={() => setConfig({ ...config, duration: duration.value })}
                style={{
                  background: config.duration === duration.value ? '#00e5a0' : '#1a1d29',
                  border: config.duration === duration.value ? '2px solid #00e5a0' : '1px solid #2a2d3a',
                  borderRadius: '25px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  color: config.duration === duration.value ? '#0f1117' : '#ffffff',
                  fontWeight: '500'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} />
                  {duration.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Interview Button */}
        <button
          onClick={handleStartInterview}
          style={{
            width: '100%',
            background: '#00e5a0',
            border: 'none',
            borderRadius: '12px',
            padding: '1.25rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#0f1117',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#00c896';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#00e5a0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Play size={20} />
          Start Interview
        </button>
      </div>
    </div>
  );
}
