import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

const Toggle = ({ value, onChange }: { value: boolean, onChange: (val: boolean) => void }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      background: value ? '#7c3aed' : 'var(--student-border)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
      flexShrink: 0
    }}
  >
    <div style={{
      position: 'absolute',
      top: '3px',
      left: value ? '23px' : '3px',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s'
    }} />
  </div>
)

const SettingRow = ({ title, description, control, isLast = false }: any) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: isLast ? 'none' : '1px solid #21262d'
  }}>
    <div>
      <div style={{ color: 'var(--student-text)', fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>
        {title}
      </div>
      <div style={{ color: 'var(--student-text-muted)', fontSize: '12px', margin: 0 }}>
        {description}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {control}
    </div>
  </div>
)

const SectionCard = ({ icon, title, subtitle, children }: any) => (
  <div style={{
    background: 'var(--student-surface)', 
    border: '1px solid #21262d', 
    borderRadius: '10px', 
    padding: '24px', 
    marginBottom: '16px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
      {icon}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', margin: 0 }}>{title}</h2>
    </div>
    <div style={{ fontSize: '12px', color: 'var(--student-text-muted)', marginBottom: '16px', marginLeft: '26px' }}>{subtitle}</div>
    <div>{children}</div>
  </div>
);

export default function Settings() {
  const [notifications, setNotifications] = useState({
    agentActivity: true,
    newJob: true,
    interview: true,
    weekly: false
  });

  const [tfa, setTfa] = useState(false);
  
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [pwStatus, setPwStatus] = useState({ message: '', type: '' });

  const [appearance, setAppearance] = useState({
    language: 'English',
    timezone: 'IST (UTC+5:30)'
  });

  const [saveToastVisible, setSaveToastVisible] = useState(false);

  useEffect(() => {
    try {
      const notifs = localStorage.getItem('notificationPrefs');
      if (notifs) setNotifications(JSON.parse(notifs));
      
      const appPrefs = localStorage.getItem('appearancePrefs');
      if (appPrefs) setAppearance(JSON.parse(appPrefs));
    } catch (e) { console.error('Error loading settings', e) }
  }, []);

  const updateNotif = (key: string, value: boolean) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    localStorage.setItem('notificationPrefs', JSON.stringify(next));
  };

  const handleUpdatePassword = async () => {
    try {
      await apiClient.put('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.new
      });
      setPwStatus({ message: 'Password updated successfully', type: 'success' });
      setPasswords({ current: '', new: '' });
    } catch (e: any) {
      setPwStatus({ message: e.response?.data?.detail || 'Failed to update', type: 'error' });
    }
  };

  const saveAll = () => {
    localStorage.setItem('notificationPrefs', JSON.stringify(notifications));
    localStorage.setItem('appearancePrefs', JSON.stringify(appearance));
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 2000);
  };

  return (
    <div style={{ background: 'var(--student-bg)', minHeight: '100%', width: '100%' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'white', margin: '0 0 4px 0' }}>Settings</h1>
          <div style={{ fontSize: '13px', color: 'var(--student-text-muted)' }}>Manage your preferences</div>
        </div>

        {/* 1. Notifications */}
        <SectionCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>}
          title="Notifications"
          subtitle="Manage how we communicate with you"
        >
          <SettingRow title="Agent activity updates" description="Notify when Auto Apply Agent applies on your behalf" control={<Toggle value={notifications.agentActivity} onChange={(v) => updateNotif('agentActivity', v)} />} />
          <SettingRow title="New job alerts" description="Get notified when admin posts a new job" control={<Toggle value={notifications.newJob} onChange={(v) => updateNotif('newJob', v)} />} />
          <SettingRow title="Interview reminders" description="Receive reminders before interviews" control={<Toggle value={notifications.interview} onChange={(v) => updateNotif('interview', v)} />} />
          <SettingRow title="Weekly digest" description="Get a weekly summary of your activity" isLast control={<Toggle value={notifications.weekly} onChange={(v) => updateNotif('weekly', v)} />} />
        </SectionCard>

        {/* 2. Security */}
        <SectionCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
          title="Security"
          subtitle="Protect your account"
        >
          <SettingRow title="Two-factor authentication" description="Add an extra layer of security" control={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {tfa && <span style={{ fontSize: '11px', background: 'var(--student-border)', color: 'var(--student-text)', padding: '2px 8px', borderRadius: '12px' }}>Coming soon</span>}
              <Toggle value={tfa} onChange={setTfa} />
            </div>
          } />
          
          <div style={{ paddingTop: '14px' }}>
            <div style={{ color: 'var(--student-text)', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Change Password</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="password" 
                placeholder="Current password" 
                value={passwords.current} 
                onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
                style={{ background: 'var(--student-bg)', border: '1px solid #21262d', borderRadius: '6px', color: 'var(--student-text)', padding: '8px 12px', fontSize: '13px', flex: 1, minWidth: '150px' }} 
              />
              <input 
                type="password" 
                placeholder="New password" 
                value={passwords.new} 
                onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                style={{ background: 'var(--student-bg)', border: '1px solid #21262d', borderRadius: '6px', color: 'var(--student-text)', padding: '8px 12px', fontSize: '13px', flex: 1, minWidth: '150px' }} 
              />
              <button 
                onClick={handleUpdatePassword} 
                style={{ background: 'var(--student-border)', color: 'var(--student-text)', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Update
              </button>
            </div>
            {pwStatus.message && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: pwStatus.type === 'success' ? '#a78bfa' : '#f85149' }}>
                {pwStatus.message}
              </div>
            )}
          </div>
        </SectionCard>

        {/* 3. Appearance */}
        <SectionCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>}
          title="Appearance"
          subtitle="Customize your experience"
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--student-text)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Language</label>
              <select 
                value={appearance.language} 
                onChange={e => setAppearance({...appearance, language: e.target.value})}
                style={{ width: '100%', background: 'var(--student-bg)', border: '1px solid #21262d', borderRadius: '6px', color: 'var(--student-text)', padding: '8px 12px', fontSize: '13px' }}
              >
                <option>English</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--student-text)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Timezone</label>
              <select 
                value={appearance.timezone} 
                onChange={e => setAppearance({...appearance, timezone: e.target.value})}
                style={{ width: '100%', background: 'var(--student-bg)', border: '1px solid #21262d', borderRadius: '6px', color: 'var(--student-text)', padding: '8px 12px', fontSize: '13px' }}
              >
                <option>IST (UTC+5:30)</option>
                <option>GMT (UTC+0)</option>
                <option>EST (UTC-5)</option>
                <option>PST (UTC-8)</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            onClick={saveAll} 
            style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
             Save All Settings
          </button>
          <div style={{ color: '#a78bfa', fontSize: '13px', opacity: saveToastVisible ? 1 : 0, transition: 'opacity 0.2s', fontWeight: 500 }}>
             Settings saved
          </div>
        </div>
      </div>
    </div>
  );
}
