import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  User, 
  Bot,
  Clock,
  Volume2
} from 'lucide-react';

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
  type?: 'text' | 'multiple-choice';
  options?: string[];
}

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

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function InterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state?.config as InterviewConfig;

  // Debug logging
  console.log('InterviewRoom rendered:', {
    hasConfig: !!config,
    state: location.state,
    pathname: location.pathname
  });

  // Safe state handling - no immediate redirect
  if (!config) {
    console.log('No config found, showing fallback UI');
    return (
      <div style={{ 
        height: '100vh', 
        background: '#0f1117', 
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div style={{
          background: '#1a1d29',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ 
            marginBottom: '1rem', 
            color: '#00e5a0',
            fontSize: '1.5rem'
          }}>
            No Interview Configuration
          </h2>
          <p style={{ 
            marginBottom: '2rem', 
            color: '#a0a0a0',
            lineHeight: '1.5'
          }}>
            Please configure your interview settings first before starting the session.
          </p>
          <button
            onClick={() => {
              console.log('Navigating back to setup');
              navigate('/student/mock-interviews');
            }}
            style={{
              background: '#00e5a0',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#0f1117',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I'm your ${config?.interviewerPersona?.replace('-', ' ')} interviewer for the ${config?.customRole || config?.role} position. Let's start with a brief introduction about yourself.`,
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [confidence, setConfidence] = useState(75);
  const [expression, setExpression] = useState('Neutral');
  const [timeRemaining, setTimeRemaining] = useState(parseInt(config?.duration || '30') * 60);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize webcam
  const initializeWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      setIsCameraOn(false);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  // Toggle camera
  const toggleCamera = () => {
    if (isCameraOn) {
      stopWebcam();
    } else {
      initializeWebcam();
    }
  };

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        if (event.results[current].isFinal) {
          setInputText(prev => prev + transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  // Toggle microphone
  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
    setIsMicOn(!isMicOn);
  };

  // Simulate confidence and expression updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update confidence (random walk between 60-95)
      setConfidence(prev => {
        const change = (Math.random() - 0.5) * 10;
        const newConfidence = Math.max(60, Math.min(95, prev + change));
        return Math.round(newConfidence);
      });

      // Update expression
      const expressions = ['Confident', 'Nervous', 'Neutral', 'Engaged'];
      setExpression(expressions[Math.floor(Math.random() * expressions.length)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsInterviewEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Send message
  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(inputText),
        sender: 'ai',
        timestamp: new Date(),
        type: Math.random() > 0.7 ? 'multiple-choice' : 'text',
        options: Math.random() > 0.7 ? [
          'Strongly Agree',
          'Agree', 
          'Neutral',
          'Disagree',
          'Strongly Disagree'
        ] : undefined
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1500);
  };

  // Generate AI response (placeholder)
  const generateAIResponse = (userInput: string) => {
    // Use the userInput parameter to avoid warning
    console.log('User input:', userInput);
    
    const responses = [
      "That's interesting! Can you elaborate more on that experience?",
      "Great answer! How did you handle the challenges in that situation?",
      "Tell me more about your thought process behind that decision.",
      "Excellent! Can you provide a specific example of when you applied this skill?",
      "That's a good point. How would you approach this differently in the future?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize on mount
  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      stopWebcam();
      recognitionRef.current?.stop();
    };
  }, []);

  // Handle multiple choice selection
  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `Selected: ${option}`,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(option),
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1500);
  };

  const getExpressionColor = (expr: string) => {
    switch (expr) {
      case 'Confident': return '#00e5a0';
      case 'Nervous': return '#ff6b6b';
      case 'Engaged': return '#4ecdc4';
      default: return '#a0a0a0';
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      background: '#0f1117', 
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Timer in top right */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: timeRemaining < 120 ? '#ff6b6b' : '#1a1d29',
        padding: '0.75rem 1.5rem',
        borderRadius: '25px',
        fontSize: '1.1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 10
      }}>
        <Clock size={18} />
        {formatTime(timeRemaining)}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Chat (60%) */}
        <div style={{ 
          flex: '0 0 60%', 
          background: '#1a1d29',
          borderRight: '1px solid #2a2d3a',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Chat Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: '0.75rem',
                  maxWidth: '80%'
                }}
              >
                {message.sender === 'ai' && (
                  <div style={{
                    background: '#00e5a0',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Bot size={20} style={{ color: '#0f1117' }} />
                  </div>
                )}
                
                <div style={{
                  background: message.sender === 'user' ? '#00e5a0' : '#2a2d3a',
                  color: message.sender === 'user' ? '#0f1117' : '#ffffff',
                  padding: '1rem 1.25rem',
                  borderRadius: '18px',
                  maxWidth: '100%'
                }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {message.text}
                  </div>
                  
                  {/* Multiple Choice Options */}
                  {message.type === 'multiple-choice' && message.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      {message.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleOptionSelect(option)}
                          style={{
                            background: '#3a3d4a',
                            border: '1px solid #4a4d5a',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            color: '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#4a4d5a';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#3a3d4a';
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '0.75rem', 
                    opacity: 0.7,
                    marginTop: '0.5rem'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.sender === 'user' && (
                  <div style={{
                    background: '#00e5a0',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={20} style={{ color: '#0f1117' }} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '1.5rem', 
            borderTop: '1px solid #2a2d3a',
            background: '#1a1d29'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your response..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#2a2d3a',
                    border: '1px solid #3a3d4a',
                    borderRadius: '25px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
              
              <button
                onClick={toggleMic}
                style={{
                  background: isMicOn ? '#00e5a0' : '#2a2d3a',
                  border: '1px solid #3a3d4a',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isMicOn ? '#0f1117' : '#ffffff'
                }}
              >
                {isListening ? <Volume2 size={20} /> : <Mic size={20} />}
              </button>
              
              <button
                onClick={sendMessage}
                style={{
                  background: '#00e5a0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#0f1117'
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Analysis (40%) */}
        <div style={{ 
          flex: '0 0 40%', 
          background: '#1a1d29',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {/* Webcam Feed */}
          <div>
            <h3 style={{ 
              marginBottom: '1rem', 
              fontSize: '1.1rem',
              color: '#00e5a0'
            }}>
              Expression Analysis
            </h3>
            <div style={{
              background: '#0f1117',
              borderRadius: '12px',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#a0a0a0' }}>
                  <CameraOff size={48} style={{ marginBottom: '1rem' }} />
                  <div>Camera Off</div>
                </div>
              )}
            </div>
          </div>

          {/* Confidence Meter */}
          <div>
            <h3 style={{ 
              marginBottom: '1rem', 
              fontSize: '1.1rem',
              color: '#00e5a0'
            }}>
              Confidence Level
            </h3>
            <div style={{
              background: '#0f1117',
              borderRadius: '12px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(#00e5a0 ${confidence * 3.6}deg, #2a2d3a 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: '#0f1117',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  {confidence}%
                </div>
              </div>
            </div>
          </div>

          {/* Expression Tags */}
          <div>
            <h3 style={{ 
              marginBottom: '1rem', 
              fontSize: '1.1rem',
              color: '#00e5a0'
            }}>
              Current Expression
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Confident', 'Nervous', 'Neutral', 'Engaged'].map((expr) => (
                <div
                  key={expr}
                  style={{
                    background: expression === expr ? `${getExpressionColor(expr)}20` : '#2a2d3a',
                    border: expression === expr ? `2px solid ${getExpressionColor(expr)}` : '1px solid #3a3d4a',
                    borderRadius: '20px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    color: expression === expr ? getExpressionColor(expr) : '#a0a0a0',
                    fontWeight: expression === expr ? '600' : '400'
                  }}
                >
                  {expr}
                </div>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            marginTop: 'auto'
          }}>
            <button
              onClick={toggleMic}
              style={{
                flex: 1,
                background: isMicOn ? '#00e5a0' : '#2a2d3a',
                border: '1px solid #3a3d4a',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: isMicOn ? '#0f1117' : '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              {isMicOn ? <MicOff size={18} /> : <Mic size={18} />}
              {isMicOn ? 'Mic On' : 'Mic Off'}
            </button>
            
            <button
              onClick={toggleCamera}
              style={{
                flex: 1,
                background: isCameraOn ? '#00e5a0' : '#2a2d3a',
                border: '1px solid #3a3d4a',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: isCameraOn ? '#0f1117' : '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              {isCameraOn ? <CameraOff size={18} /> : <Camera size={18} />}
              {isCameraOn ? 'Camera Off' : 'Camera On'}
            </button>
          </div>
        </div>
      </div>

      {/* Interview End Modal */}
      {isInterviewEnded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1d29',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#00e5a0' }}>
              Interview Completed!
            </h2>
            <p style={{ marginBottom: '2rem', color: '#a0a0a0' }}>
              Great job! Your mock interview session has ended. You'll receive a detailed analysis of your performance.
            </p>
            <button
              onClick={() => navigate('/student/mock-interviews')}
              style={{
                background: '#00e5a0',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#0f1117',
                cursor: 'pointer'
              }}
            >
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
