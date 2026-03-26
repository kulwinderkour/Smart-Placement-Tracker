import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface InterviewConfig {
  role: string;
  customRole: string;
  companyType: string;
  interviewerPersona: string;
  duration: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface GeminiPart  { text: string }
interface GeminiTurn  { role: 'user' | 'model'; parts: GeminiPart[] }

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative { transcript: string; confidence: number }

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any }
}

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

function expressionFromConfidence(c: number): string {
  if (c >= 80) return 'Confident';
  if (c >= 60) return 'Neutral';
  if (c >= 40) return 'Engaged';
  return 'Nervous';
}

// ── Inline SVG icon ───────────────────────────────────────────────────────────
function Icon({ d, size = 20, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  mic:       'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8',
  micOff:    'M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8',
  camera:    'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  cameraOff: 'M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10M1 1l22 22',
  send:      'M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z',
  user:      'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  bot:       'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2zM8 13v2M16 13v2',
  clock:     'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  volume:    'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07',
};

export default function InterviewRoom() {
  const location = useLocation();
  const navigate  = useNavigate();
  const config    = location.state?.config as InterviewConfig | undefined;

  // ── Conversation history for Gemini (kept in a ref to avoid re-renders) ──
  const historyRef = useRef<GeminiTurn[]>([]);

  const systemPrompt = config
    ? `You are an interviewer for a ${config.customRole || config.role} position at a ${config.companyType} company. Your persona is ${config.interviewerPersona}. Ask one question at a time. Keep responses concise under 100 words. Start by greeting and asking them to introduce themselves.`
    : '';

  const [messages, setMessages] = useState<Message[]>(() => {
    if (!config) return [];
    return [{
      id: '1',
      text: `Hello! I'm your ${config.interviewerPersona?.replace(/-/g, ' ')} interviewer for the ${config.customRole || config.role} position. Let's start — please introduce yourself.`,
      sender: 'ai',
      timestamp: new Date(),
    }];
  });

  const [inputText, setInputText]         = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const [isListening, setIsListening]     = useState(false);
  const [isMicOn, setIsMicOn]             = useState(false);
  const [isCameraOn, setIsCameraOn]       = useState(false);
  const [confidence, setConfidence]       = useState(75);
  const [expression, setExpression]       = useState('Neutral');
  const [timeRemaining, setTimeRemaining] = useState(parseInt(config?.duration || '30') * 60);
  const [isEnded, setIsEnded]             = useState(false);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Webcam ──
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch {
      setIsCameraOn(false);
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  };

  const toggleCamera = () => (isCameraOn ? stopWebcam() : startWebcam());

  // ── Speech recognition ──
  const initSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-US';
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const cur = e.resultIndex;
      if (e.results[cur].isFinal)
        setInputText(prev => prev + e.results[cur][0].transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
    setIsMicOn(prev => !prev);
  };

  // ── Timer (only interval kept — necessary for countdown) ──
  useEffect(() => {
    const id = setInterval(() => {
      setTimeRemaining(p => {
        if (p <= 1) { setIsEnded(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Init / cleanup ──
  useEffect(() => {
    initSpeech();
    return () => { stopWebcam(); recognitionRef.current?.stop(); };
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender, timestamp: new Date() }]);
  };

  // ── Gemini API call ──
  const callGemini = async (userText: string) => {
    historyRef.current = [
      ...historyRef.current,
      { role: 'user', parts: [{ text: userText }] },
    ];

    setIsTyping(true);
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: historyRef.current,
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      });
      const data = await res.json();
      const reply: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Could you elaborate on that?';

      historyRef.current = [
        ...historyRef.current,
        { role: 'model', parts: [{ text: reply }] },
      ];
      addMessage(reply, 'ai');
    } catch {
      addMessage('Sorry, I had trouble connecting. Please try again.', 'ai');
    } finally {
      setIsTyping(false);
    }
  };

  // ── Update confidence from message length (no blinking interval) ──
  const updateConfidence = (text: string) => {
    setConfidence(prev => {
      let next = prev;
      if (text.length > 100)      next = Math.min(prev + 5, 95);
      else if (text.length < 50)  next = Math.max(prev - 5, 40);
      setExpression(expressionFromConfidence(next));
      return next;
    });
  };

  // ── Send message ──
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || isTyping) return;
    addMessage(text, 'user');
    setInputText('');
    updateConfidence(text);
    callGemini(text);
  };

  const exprColor = (e: string) =>
    e === 'Confident' ? '#00e5a0' : e === 'Nervous' ? '#f85149' : e === 'Engaged' ? '#58a6ff' : '#7d8590';

  // ── No-config fallback ──
  if (!config) {
    return (
      <div style={{ height: '100vh', background: '#0f1117', color: '#e6edf3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '32px', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 18, color: '#e6edf3' }}>No Interview Config</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#7d8590', lineHeight: 1.6 }}>
            Please configure your interview settings before starting.
          </p>
          <button onClick={() => navigate('/student/mock-interviews')}
            style={{ width: '100%', padding: '12px', background: '#00e5a0', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#0f1117', cursor: 'pointer' }}>
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#0f1117', color: '#e6edf3', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── CSS for typing dots — no JS animation ── */}
      <style>{`
        @keyframes ir-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        .ir-dot { width: 7px; height: 7px; border-radius: 50%; background: #00e5a0; display: inline-block; animation: ir-dot-bounce 1.2s infinite ease-in-out; }
        .ir-dot:nth-child(2) { animation-delay: 0.2s; }
        .ir-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* ── Timer badge ── */}
      <div style={{
        position: 'absolute', top: 16, right: 16, zIndex: 10,
        background: timeRemaining < 120 ? '#da363322' : '#161b22',
        border: `1px solid ${timeRemaining < 120 ? '#da3633' : '#21262d'}`,
        padding: '7px 16px', borderRadius: 20,
        fontSize: 13, fontWeight: 600, color: timeRemaining < 120 ? '#f85149' : '#e6edf3',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon d={IC.clock} size={14} />
        {formatTime(timeRemaining)}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Chat panel (60%) ── */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #21262d' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start', gap: 10,
              }}>
                {msg.sender === 'ai' && (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: '#00e5a018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={IC.bot} size={16} color="#00e5a0" />
                  </div>
                )}
                <div style={{ maxWidth: '78%' }}>
                  <div style={{
                    background: msg.sender === 'user' ? '#00e5a0' : '#161b22',
                    color: msg.sender === 'user' ? '#0f1117' : '#e6edf3',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: 13, lineHeight: 1.6,
                    border: msg.sender === 'ai' ? '1px solid #21262d' : 'none',
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 11, color: '#484f58', marginTop: 4, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.sender === 'user' && (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: '#00e5a018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={IC.user} size={16} color="#00e5a0" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: '#00e5a018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={IC.bot} size={16} color="#00e5a0" />
                </div>
                <div style={{ background: '#161b22', border: '1px solid #21262d', padding: '12px 16px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span className="ir-dot" />
                  <span className="ir-dot" />
                  <span className="ir-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #21262d', background: '#0f1117' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={isTyping ? 'Interviewer is typing…' : 'Type your response…'}
                disabled={isTyping}
                style={{
                  flex: 1, padding: '10px 16px',
                  background: '#161b22', border: '1px solid #30363d',
                  borderRadius: 24, color: '#e6edf3', fontSize: 13, outline: 'none',
                  opacity: isTyping ? 0.5 : 1,
                }}
              />
              <button onClick={toggleMic} title={isMicOn ? 'Mute' : 'Unmute'}
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: '1px solid #30363d',
                  background: isMicOn ? '#00e5a020' : '#161b22',
                  color: isMicOn ? '#00e5a0' : '#7d8590', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon d={isListening ? IC.volume : isMicOn ? IC.mic : IC.micOff} size={16} />
              </button>
              <button onClick={sendMessage} disabled={isTyping}
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none',
                  background: isTyping ? '#484f58' : '#00e5a0',
                  cursor: isTyping ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon d={IC.send} size={16} color="#0f1117" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Analysis panel (40%) ── */}
        <div style={{ flex: '0 0 40%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

          {/* Camera feed */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Expression Analysis
            </p>
            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {isCameraOn
                ? <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ textAlign: 'center', color: '#484f58' }}>
                    <Icon d={IC.cameraOff} size={32} color="#484f58" />
                    <div style={{ fontSize: 12, marginTop: 8 }}>Camera off</div>
                  </div>
              }
            </div>
          </div>

          {/* Confidence ring */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Confidence Level
            </p>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
              background: `conic-gradient(#00e5a0 ${confidence * 3.6}deg, #21262d 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.6s ease',
            }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#161b22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#00e5a0' }}>
                {confidence}%
              </div>
            </div>
          </div>

          {/* Expression tags */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Current Expression
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Confident', 'Neutral', 'Engaged', 'Nervous'].map(e => (
                <span key={e} style={{
                  padding: '4px 12px', borderRadius: 12, fontSize: 12,
                  background: expression === e ? `${exprColor(e)}18` : '#0f1117',
                  border: `1px solid ${expression === e ? exprColor(e) : '#30363d'}`,
                  color: expression === e ? exprColor(e) : '#7d8590',
                  fontWeight: expression === e ? 600 : 400,
                  transition: 'all 0.4s',
                }}>{e}</span>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
            <button onClick={toggleMic}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                background: isMicOn ? '#00e5a018' : '#161b22',
                border: `1px solid ${isMicOn ? '#00e5a0' : '#30363d'}`,
                color: isMicOn ? '#00e5a0' : '#7d8590',
                fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon d={isMicOn ? IC.mic : IC.micOff} size={15} />
              {isMicOn ? 'Mute' : 'Unmute'}
            </button>
            <button onClick={toggleCamera}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                background: isCameraOn ? '#00e5a018' : '#161b22',
                border: `1px solid ${isCameraOn ? '#00e5a0' : '#30363d'}`,
                color: isCameraOn ? '#00e5a0' : '#7d8590',
                fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon d={isCameraOn ? IC.camera : IC.cameraOff} size={15} />
              {isCameraOn ? 'Camera On' : 'Camera Off'}
            </button>
          </div>

        </div>
      </div>

      {/* ── End modal ── */}
      {isEnded && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '32px', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 18, color: '#e6edf3' }}>Interview Complete!</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#7d8590', lineHeight: 1.6 }}>
              Great effort! You'll receive a detailed analysis of your performance shortly.
            </p>
            <button onClick={() => navigate('/student/mock-interviews')}
              style={{ width: '100%', padding: '12px', background: '#00e5a0', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#0f1117', cursor: 'pointer' }}>
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
