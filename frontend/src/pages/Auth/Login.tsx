import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GradientBlinds } from '../../components/common/GradientBlinds'

// --- Animated Counter for Stats ---
function AnimatedCounter({ end, label, prefix = '', suffix = '' }: { end: number, label: string, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let start = 0
    const duration = 2000
    const increment = end / (duration / 16)
    
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [end])

  return (
    <div className="flex flex-col items-center text-center">
      <h3 className="text-4xl font-bold text-white font-['Sora'] mb-2 tracking-tight">
        {prefix}{count.toLocaleString()}{suffix}
      </h3>
      <p className="text-sm font-medium text-white/50">{label}</p>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    // Enable smooth scrolling on HTML
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, []);

  const features = [
    { 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>, 
      text: "Access thousands of top-tier companies" 
    },
    { 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>, 
      text: "Track your application status in real-time" 
    },
    { 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>, 
      text: "Secure and verified placement opportunities" 
    },
  ]

  const featureGrid = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>, title: "AI Job Matching", desc: "Our algorithm finds the perfect roles based on your skills.", color: "text-purple-400 bg-purple-400/10" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>, title: "Resume Builder", desc: "Create ATS-friendly resumes that get you noticed instantly.", color: "text-blue-400 bg-blue-400/10" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>, title: "Application Tracker", desc: "Monitor all your applications in one centralized dashboard.", color: "text-teal-400 bg-teal-400/10" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>, title: "Interview Prep", desc: "Practice with AI-driven mock interviews and feedback.", color: "text-pink-400 bg-pink-400/10" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: "Recruiter Connect", desc: "Message directly with recruiters actively looking to hire.", color: "text-indigo-400 bg-indigo-400/10" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>, title: "Real-time Alerts", desc: "Get instantly notified when top companies post new jobs.", color: "text-orange-400 bg-orange-400/10" }
  ]

  const testimonials = [
    { quote: "SmartPlacement got me into my dream company! The AI resume tips completely transformed how I applied. Absolute lifesaver for passing ATS scans.", name: "Rahul S.", role: "Software Engineer at Google", rating: 5, color: "bg-blue-500" },
    { quote: "I was struggling to keep track of my 50+ applications. The application tracker simplified my entire final year placement process seamlessly.", name: "Priya M.", role: "Data Scientist at Amazon", rating: 5, color: "bg-purple-500" },
    { quote: "The interview prep feature was incredibly realistic. I felt 100x more confident walking into my final technical rounds.", name: "Amit K.", role: "Product Manager at Microsoft", rating: 5, color: "bg-teal-500" },
  ]

  return (
    <div className="flex flex-col w-full font-['DM_Sans',sans-serif] bg-[#070b18] text-white overflow-hidden selection:bg-blue-500/30">
      
      {/* 1. HERO SECTION */}
      <section className="w-full min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Get Started Button - Top Right */}
        <button 
          onClick={() => navigate('/login-form')}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 border-[1.5px] border-white/25 text-white rounded-full px-5 py-2 text-sm font-medium backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-colors z-30"
        >
          Get Started
        </button>

        {/* Animated GradientBlinds Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <GradientBlinds
              gradientColors={["#FF9FFC","#5227FF"]}
              angle={20}
              noise={0.5}
              blindCount={16}
              blindMinWidth={60}
              mouseDampening={0.15}
              mirrorGradient={false}
              spotlightRadius={0.5}
              spotlightSoftness={1}
              spotlightOpacity={1}
              distortAmount={0}
              shineDirection="left"
            />
            <div className="absolute inset-0 bg-[#070b18]/70 mix-blend-multiply pointer-events-none" /> {/* Darken overlay for better text readability */}
          </div>
        </div>

        {/* Foreground Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center mt-8 sm:mt-0"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-2xl backdrop-blur-md mb-8 border border-white/10 shadow-2xl text-white"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </motion.div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.15] text-white font-['Sora'] drop-shadow-lg">
            Land Your Dream Job
          </h1>
          
          <p className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto font-medium mb-12 drop-shadow-md">
            Your personalized AI-driven placement companion. Connect with recruiters and stand out from the crowd.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-center w-full max-w-3xl mb-12">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 + idx * 0.1, ease: "easeOut" }}
                className="flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3 text-left shadow-lg"
              >
                <div className="flex-shrink-0 text-white/70">
                  {feature.icon}
                </div>
                <span className="font-medium text-white/80 text-[13px] leading-tight">{feature.text}</span>
              </motion.div>
            ))}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login-form')}
            className="bg-white text-[#1a1a2e] font-semibold px-8 py-3 rounded-full text-sm hover:bg-blue-50 shadow-xl transition-colors focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            Start using Smart Placement
          </motion.button>
        </motion.div>
      </section>

      {/* 2. STATS / SOCIAL PROOF */}
      <section className="w-full bg-[#070b18] py-16 px-6 relative z-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="md:border-r border-white/10">
            <AnimatedCounter end={10000} label="Active Students" suffix="+" />
          </motion.div>
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: 0.1 }} className="md:border-r border-white/10">
            <AnimatedCounter end={500} label="Partner Companies" suffix="+" />
          </motion.div>
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: 0.2 }} className="md:border-r border-white/10">
            <AnimatedCounter end={94} label="Placement Rate" suffix="%" />
          </motion.div>
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: 0.3 }}>
            <AnimatedCounter end={4.9} label="Average Rating" suffix="★" />
          </motion.div>
        </div>
      </section>

      {/* 3. ABOUT / DESCRIPTION */}
      <section className="w-full bg-[#0a0f1e] py-24 px-6 relative z-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Text */}
          <motion.div initial={{ opacity:0, x:-30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration: 0.8 }}>
            <span className="inline-block py-1.5 px-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase mb-6">
              Why SmartPlacement?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-['Sora'] leading-tight mb-6">
              The smarter way to land your next role
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Navigate the complex landscape of placements with an unfair advantage. We combine AI-driven networking, automatic ATS resume optimization, and real-time application tracking.
            </p>
            <button className="text-blue-400 font-semibold hover:text-blue-300 transition-colors flex items-center group">
              Learn More 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </motion.div>

          {/* Right Cards Stack */}
          <motion.div initial={{ opacity:0, x:30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration: 0.8 }} className="relative h-[300px] w-full flex items-center justify-center">
            {/* Card 1 */}
            <div className="absolute w-[80%] max-w-[340px] bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl transform rotate-2 z-10 left-1/2 -ml-[40%] top-8">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white">AI Resume Matcher</h4>
                  <p className="text-xs text-white/50">Google SWE Role</p>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 mb-2">
                <div className="bg-green-400 h-2 rounded-full w-[92%]"></div>
              </div>
              <p className="text-xs text-green-400 font-medium text-right">92% Match Score</p>
            </div>

            {/* Card 2 */}
            <div className="absolute w-[80%] max-w-[340px] bg-[#12182b] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl transform -rotate-2 z-20 top-24 left-1/2 -ml-[35%]">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Interview Scheduler</h4>
                  <p className="text-sm text-blue-400 mt-1">3 interviews this week</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section className="w-full bg-[#070b18] py-24 px-6 relative z-20">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-3xl md:text-5xl font-bold font-['Sora'] mb-4">
            Everything you need to get hired
          </motion.h2>
          <motion.p initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: 0.1 }} className="text-white/60 text-lg">
            Powerful tools designed exclusively for students and fresh graduates.
          </motion.p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureGrid.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity:0, y:30 }}
              whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${feat.color}`}>
                {feat.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feat.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="w-full bg-[#0a0f1e] py-24 px-6 relative z-20">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-3xl md:text-5xl font-bold font-['Sora']">
            Get hired in 4 simple steps
          </motion.h2>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-6 left-12 right-12 border-t-2 border-dashed border-blue-500/30 z-0"></div>
          
          <div className="flex flex-col md:flex-row justify-between relative z-10 space-y-12 md:space-y-0">
            {[
              { num: 1, title: "Create Profile", desc: "Fill out your details securely and upload your best resume." },
              { num: 2, title: "AI Matching", desc: "Our powerful AI accurately matches you with the best roles." },
              { num: 3, title: "Apply & Track", desc: "One-click apply and seamlessly track all applications." },
              { num: 4, title: "Get Hired", desc: "Receive multiple offers and joyfully accept your dream job." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity:0, y:30 }} 
                whileInView={{ opacity:1, y:0 }} 
                viewport={{ once:true }}
                transition={{ delay: i * 0.2 }}
                className="flex flex-col items-center text-center md:w-1/4 px-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-[#0a0f1e] text-white flex items-center justify-center font-bold text-lg mb-6 shadow-xl">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/60">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="w-full bg-[#070b18] py-24 px-6 relative z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center mb-16 relative z-10">
          <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-3xl md:text-5xl font-bold font-['Sora']">
            Loved by students across India
          </motion.h2>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {testimonials.map((test, i) => (
            <motion.div 
              key={i}
              initial={{ opacity:0, y:30 }} 
              whileInView={{ opacity:1, y:0 }} 
              viewport={{ once:true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex space-x-1 mb-4 text-yellow-400">
                  {[...Array(test.rating)].map((_, j) => (
                    <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                </div>
                <p className="text-white/80 leading-relaxed mb-8 italic">"{test.quote}"</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${test.color} flex items-center justify-center font-bold text-white text-sm`}>
                  {test.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">{test.name}</h4>
                  <p className="text-xs text-white/50">{test.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 7. CTA SECTION */}
      <section className="w-full bg-[#0a0f1e] pb-24 pt-12 px-6 relative z-20 flex justify-center">
        <motion.div 
          initial={{ opacity:0, scale:0.95 }} 
          whileInView={{ opacity:1, scale:1 }} 
          viewport={{ once:true }}
          className="w-full max-w-5xl rounded-[32px] p-12 md:p-24 relative overflow-hidden flex flex-col items-center text-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)' }}
        >
          {/* Subtle background GradientBlinds for CTA */}
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen overflow-hidden pointer-events-none">
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: '0', left: '0' }}>
              <GradientBlinds
                gradientColors={["#1e3a8a", "#7c3aed"]}
                angle={45}
                noise={0.8}
                blindCount={12}
                blindMinWidth={80}
                spotlightRadius={0.8}
                distortAmount={0}
              />
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold font-['Sora'] text-white mb-6 tracking-tight drop-shadow-md">
              Ready to land your dream job?
            </h2>
            <p className="text-xl text-white/80 font-medium mb-10 drop-shadow-sm">
              Join 10,000+ students already using SmartPlacement
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/login-form')}
                className="bg-white text-slate-900 font-bold px-8 py-4 rounded-full hover:scale-105 hover:shadow-xl transition-all"
              >
                Get Started Free
              </button>
              <button className="bg-transparent border border-white/50 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all">
                Watch Demo
              </button>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
