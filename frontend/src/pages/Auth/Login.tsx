import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DotGrid } from '../../components/common/DotGrid'

export default function Login() {
  const navigate = useNavigate()

  const features = [
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>, 
      text: "Access thousands of top-tier companies" 
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>, 
      text: "Track your application status in real-time" 
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>, 
      text: "Secure and verified placement opportunities" 
    },
  ]

  return (
    <div className="flex flex-col min-h-screen w-full font-sans bg-slate-900 overflow-hidden selection:bg-blue-500/20">
      <div className="w-full min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-8 sm:p-12">
        
        {/* Get Started Button - Top Right */}
        <button 
          onClick={() => navigate('/login-form')}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 border-[1.5px] border-white/25 text-white rounded-full px-6 py-2.5 text-sm font-semibold backdrop-blur-md bg-white/10 hover:bg-white/20 hover:scale-105 transition-all outline-none focus:ring-2 focus:ring-white/50 z-30"
        >
          Get Started
        </button>

        {/* Animated DotGrid Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <DotGrid
              dotSize={5}
              gap={15}
              baseColor="#271E37"
              activeColor="#5227FF"
              proximity={120}
              speedTrigger={100}
              shockRadius={250}
              shockStrength={5}
              maxSpeed={5000}
              resistance={750}
              returnDuration={1.5}
            />
          </div>
        </div>

        {/* Foreground Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-2xl w-full text-center mt-[-5vh]"
        >
          <div className="mb-12 flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-2xl backdrop-blur-md mb-8 border border-white/10 shadow-2xl"
            >
              <span className="text-3xl">🎓</span>
            </motion.div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.15] text-white/95 truncate pb-2">
              Land Your Dream Job
            </h1>
            <p className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-xl mx-auto font-medium">
              Your personalized AI-driven placement companion. Connect with recruiters and stand out.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 mt-10 w-full justify-center">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 + idx * 0.1, ease: "easeOut" }}
                className="flex items-center space-x-4 bg-white/[0.03] p-5 sm:p-6 rounded-2xl border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.08] w-full max-w-[320px] mx-auto sm:mx-0 text-left"
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-purple-300 bg-black/20 rounded-xl shadow-inner border border-white/[0.05]">
                  {feature.icon}
                </div>
                <span className="font-medium text-white/80 text-[15px]">{feature.text}</span>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            className="mt-16 inline-block"
          >
            <button 
              onClick={() => navigate('/login-form')}
              className="bg-white text-slate-900 rounded-full px-10 py-4 text-lg font-bold shadow-[0_4px_24px_rgba(255,255,255,0.2)] hover:scale-105 hover:bg-gray-100 transition-all outline-none focus:ring-4 focus:ring-white/30 z-30"
            >
              Start using Smart Placement
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
