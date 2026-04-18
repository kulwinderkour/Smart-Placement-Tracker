import { useState } from 'react';
import { aiClient } from '../api/client';

const AgentPanel = ({ userId }) => {
  const [prompt, setPrompt] = useState('');
  const [resumePath, setResumePath] = useState('resume.pdf');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult('');
    setError('');

    try {
      const response = await aiClient.post('/agent/run', {
        prompt: prompt.trim(),
        user_id: userId || 'anonymous',
        resume_path: resumePath || 'resume.pdf',
      });
      setResult(response.data.result || 'Agent completed with no output.');
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleRun();
    }
  };

  return (
    <div
      style={{
        background: 'var(--student-surface)',
        border: '1px solid #21262d',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #a78bfa22 0%, #58a6ff22 100%)',
            border: '1px solid #a78bfa40',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          ✦
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--student-text)' }}>
            AI Placement Agent
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--student-text-muted)' }}>
            Powered by Gemini · Auto-applies to jobs matching your criteria
          </p>
        </div>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="e.g. Apply to all jobs above 20 LPA with my resume"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--student-bg)',
            border: `1px solid ${loading ? 'var(--student-border)' : 'var(--student-border)'}`,
            borderRadius: '8px',
            color: 'var(--student-text)',
            fontSize: '13px',
            outline: 'none',
            opacity: loading ? 0.6 : 1,
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { if (!loading) e.target.style.borderColor = '#a78bfa'; }}
          onBlur={(e) => { e.target.style.borderColor = loading ? 'var(--student-border)' : 'var(--student-border)'; }}
        />
        <input
          type="text"
          placeholder="resume.pdf"
          value={resumePath}
          onChange={(e) => setResumePath(e.target.value)}
          disabled={loading}
          title="Resume filename or path"
          style={{
            width: '120px',
            padding: '10px 12px',
            background: 'var(--student-bg)',
            border: '1px solid #21262d',
            borderRadius: '8px',
            color: 'var(--student-text-muted)',
            fontSize: '12px',
            outline: 'none',
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleRun}
          disabled={loading || !prompt.trim()}
          style={{
            padding: '10px 20px',
            background: loading || !prompt.trim() ? 'var(--student-border)' : '#a78bfa',
            color: loading || !prompt.trim() ? 'var(--student-text-muted)' : 'var(--student-bg)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid #7d8590',
                  borderTopColor: 'var(--student-text)',
                  borderRadius: '50%',
                  animation: 'agentSpin 0.7s linear infinite',
                }}
              />
              Running…
            </>
          ) : (
            'Run Agent'
          )}
        </button>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'var(--student-text-dim)' }}>
        Tip: Press Ctrl+Enter to run · The agent will fetch jobs, apply, and return a summary.
      </p>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            background: 'var(--student-bg)',
            border: '1px solid #21262d',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '18px',
              height: '18px',
              border: '2px solid #21262d',
              borderTopColor: '#a78bfa',
              borderRadius: '50%',
              animation: 'agentSpin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--student-text-muted)', fontSize: '13px' }}>
            Agent is working — fetching jobs, filtering, and submitting applications…
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          style={{
            background: '#2d1b1b',
            border: '1px solid #da363333',
            borderRadius: '8px',
            padding: '14px 16px',
            color: '#f85149',
            fontSize: '13px',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div
          style={{
            background: 'var(--student-bg)',
            border: '1px solid #1a2e22',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <span style={{ color: '#3fb950', fontSize: '13px', fontWeight: 600 }}>
              ✓ Agent finished
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              color: 'var(--student-text)',
              fontSize: '13px',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
            }}
          >
            {result}
          </pre>
        </div>
      )}

      {/* Spinner keyframe injected once */}
      <style>{`
        @keyframes agentSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AgentPanel;
