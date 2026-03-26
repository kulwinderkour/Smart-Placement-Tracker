import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GradientBlinds } from '../../components/common/GradientBlinds'
import CurvedLoop from '../../components/common/CurvedLoop'
import MagicBento from './MagicBentoSimple'

function AnimatedCounter({ end, label, prefix = '', suffix = '' }: { end: number, label: string, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => {
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
      }}
      className="flex flex-col items-center text-center"
    >
      <h3 className="text-6xl font-bold text-white font-['Sora'] mb-3 tracking-tight">
        {prefix}{count.toLocaleString()}{suffix}
      </h3>
      <p className="text-base font-medium text-white/50">{label}</p>
    </motion.div>
  )
}

const Divider = () => (
  <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
)

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8 }
}

export default function Login() {
  const navigate = useNavigate()

  // NAVBAR REFS AND STATE
  const [activeNav, setActiveNav] = useState('about')
  const [menuOpen, setMenuOpen] = useState(false)

  const aboutRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const howItWorksRef = useRef<HTMLElement>(null)
  const testimonialsRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  const scrollTo = (ref: React.RefObject<HTMLElement | null>, name: string) => {
    setActiveNav(name)
    setMenuOpen(false)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navLinks: { label: string, ref: React.RefObject<HTMLElement | null>, key: string }[] = [
    { label: 'About', ref: aboutRef, key: 'about' },
    { label: 'Features', ref: featuresRef, key: 'features' },
    { label: 'How it Works', ref: howItWorksRef, key: 'howitworks' },
    { label: 'Testimonials', ref: testimonialsRef, key: 'testimonials' },
    { label: 'Contact', ref: ctaRef, key: 'contact' },
  ]

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, []);

  // Intersection Observer for Scroll Highlights
  useEffect(() => {
    const sections = [
      { key: 'about', ref: aboutRef },
      { key: 'features', ref: featuresRef },
      { key: 'howitworks', ref: howItWorksRef },
      { key: 'testimonials', ref: testimonialsRef },
      { key: 'contact', ref: ctaRef },
    ]

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const found = sections.find(s => s.ref.current === entry.target)
            if (found) setActiveNav(found.key)
          }
        })
      },
      { threshold: 0.4 }
    )

    sections.forEach(s => {
      if (s.ref.current) observer.observe(s.ref.current)
    })

    return () => observer.disconnect()
  }, [])



  const testimonials = [
    { quote: "SmartPlacement got me into my dream company! The AI resume tips completely transformed how I applied. Absolute lifesaver for passing ATS scans.", name: "Rahul S.", role: "Software Engineer at Google", rating: 5, color: "bg-blue-500" },
    { quote: "I was struggling to keep track of my 50+ applications. The application tracker simplified my entire final year placement process seamlessly.", name: "Priya M.", role: "Data Scientist at Amazon", rating: 5, color: "bg-purple-500" },
    { quote: "The interview prep feature was incredibly realistic. I felt 100x more confident walking into my final technical rounds.", name: "Amit K.", role: "Product Manager at Microsoft", rating: 5, color: "bg-teal-500" },
  ]

  return (
    <div className="flex flex-col w-full font-['DM_Sans',sans-serif] bg-[#070b18] text-white overflow-hidden selection:bg-blue-500/30">

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .nav-center-links { display: none !important; }
          .nav-wrapper { width: calc(100% - 24px) !important; padding: 10px 16px !important; }
          .mobile-menu-btn { display: flex !important; }
          .curved-loop-wrap { margin-top: 24px !important; }
          .curved-loop-wrap svg text { font-size: 28px !important; }
          .curved-marquee-title { font-size: 20px !important; padding: 8px 20px !important; margin-bottom: -15px !important; }
        }
        @media (max-width: 480px) {
          .curved-loop-wrap { margin-top: 16px !important; }
          .curved-loop-wrap svg text { font-size: 22px !important; }
          .curved-marquee-title { font-size: 16px !important; padding: 6px 16px !important; margin-bottom: -10px !important; }
        }
        .mobile-menu-btn { display: none; }
      `}} />

      {/* NEW STICKY NAVBAR */}
      <nav className="nav-wrapper" style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: 1100,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px 10px 16px',
        borderRadius: 100,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.25)'
      }}>
        {/* LEFT — LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6d28d9, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
          </div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.01em' }}>SmartPlacement</span>
        </div>

        {/* CENTER — NAV LINKS */}
        <div className="nav-center-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map(link => (
            <button
              key={link.key}
              onClick={() => scrollTo(link.ref, link.key)}
              style={{
                padding: '7px 16px',
                borderRadius: 100,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeNav === link.key ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif',
                color: activeNav === link.key ? '#1a0a2e' : 'rgba(255,255,255,0.75)',
                background: activeNav === link.key
                  ? 'rgba(255,255,255,0.92)'
                  : 'transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => {
                if (activeNav !== link.key)
                  (e.target as HTMLButtonElement).style.color = '#fff'
              }}
              onMouseLeave={e => {
                if (activeNav !== link.key)
                  (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile menu trigger + right CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
              padding: 0
            }}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            )}
          </button>

          {/* RIGHT — "LET'S TALK" BUTTON */}
          <button
            onClick={() => navigate('/login-form')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px 9px 20px',
              borderRadius: 100,
              border: 'none',
              background: '#0f0f0f',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Sora, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2e')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0f0f0f')}
          >
            Get Started
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </div>
          </button>
        </div>
      </nav>

      {/* MOBILE OVERLAY MENU */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7,11,24,0.98)', zIndex: 90,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          backdropFilter: 'blur(10px)'
        }}>
          {navLinks.map(link => (
            <button
              key={link.key}
              onClick={() => scrollTo(link.ref, link.key)}
              style={{
                background: 'none', border: 'none', color: '#fff',
                fontSize: 24, fontWeight: 700, fontFamily: 'Sora, sans-serif',
                cursor: 'pointer'
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      {/* SECTION 1 — HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#070b18] px-6 py-[120px]">
        {/* Animated GradientBlinds Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <GradientBlinds
              gradientColors={["#FF9FFC", "#5227FF"]}
              angle={20}
              noise={0.5}
              blindCount={16}
              blindMinWidth={60}
              spotlightRadius={0.5}
            />
            <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'rgba(7,11,24,0.75)' }} />
          </div>
        </div>

        <motion.div
          className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col items-center justify-center text-center"
          {...fadeUp}
        >
          {/* Logo icon box */}
          <div className="flex items-center justify-center w-16 h-16 bg-white/5 rounded-2xl mb-8 border border-white/10 shadow-2xl text-white backdrop-blur-md">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
          </div>

          <h1 className="font-['Sora'] font-bold text-white mb-6 leading-[1.1]" style={{ fontSize: 'clamp(32px, 7vw, 80px)' }}>
            Land Your Dream Job
          </h1>

          <p className="text-white/65 text-lg leading-relaxed max-w-[560px] mx-auto mb-12">
            Your personalized AI-driven placement companion. Connect with recruiters and stand out from the crowd.
          </p>

          <style dangerouslySetInnerHTML={{
            __html: `
            @media (max-width: 640px) {
              .hero-features-row { flex-direction: column !important; gap: 24px !important; }
            }
          `}} />
          <div className="hero-features-row" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            marginTop: 48,
            marginBottom: 40,
            width: '100%',
            maxWidth: 1000
          }}>
            {[
              {
                num: '01',
                title: 'Top Companies',
                desc: 'Access thousands of verified top-tier companies actively hiring fresh graduates and students.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              },
              {
                num: '02',
                title: 'Track Applications',
                desc: 'Monitor every application status in real-time from one clean, centralized dashboard.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
              },
              {
                num: '03',
                title: 'Verified Placements',
                desc: 'Every opportunity is thoroughly verified and secured — no spam, no fake listings, ever.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
              }
            ].map((card, i) => (
              <div
                key={i}
                className="hero-feature-card"
                style={{
                  flex: '1 1 240px',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  transition: 'background 0.2s',
                  cursor: 'default',
                  textAlign: 'left'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                {/* Number */}
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.12em',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                  {card.num}
                </span>

                {/* Title */}
                <h3 style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}>
                  {card.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  flex: 1
                }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <Divider />

      {/* SECTION 2 — STATS */}
      <section ref={aboutRef} style={{
        minHeight: '100vh',
        width: '100%',
        background: '#070b18',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Left glow */}
        <div style={{
          position: 'absolute', left: '-10%', top: '30%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(40px)'
        }} />
        {/* Right glow */}
        <div style={{
          position: 'absolute', right: '-10%', top: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(40px)'
        }} />
        {/* Center subtle glow */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 800, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 20 }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 100,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
            color: '#818cf8', textTransform: 'uppercase',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'inline-block', boxShadow: '0 0 8px #818cf8' }} />
            Trusted Worldwide
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: 80, position: 'relative', zIndex: 1 }}
        >
          <h2 style={{
            fontFamily: 'Sora,sans-serif',
            fontSize: 'clamp(36px,5vw,64px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0
          }}>
            Numbers that<br />
            <span style={{
              background: 'linear-gradient(90deg,#818cf8,#a78bfa,#60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>speak for themselves</span>
          </h2>
          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.45)',
            marginTop: 16, fontFamily: 'DM Sans,sans-serif',
            letterSpacing: '0.01em'
          }}>
            Real results from real students across India
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          width: '100%',
          maxWidth: 1000,
          position: 'relative',
          zIndex: 1
        }}>
          {[
            {
              end: 10000, suffix: '+', label: 'Active Students', desc: 'and growing every day', color: '#818cf8', glow: 'rgba(129,140,248,0.15)',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            },
            {
              end: 500, suffix: '+', label: 'Partner Companies', desc: 'top-tier & verified', color: '#34d399', glow: 'rgba(52,211,153,0.12)',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
            },
            {
              end: 94, suffix: '%', label: 'Placement Rate', desc: 'industry-leading success', color: '#f59e0b', glow: 'rgba(245,158,11,0.12)',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
            },
            {
              end: 4.9, suffix: '★', label: 'Average Rating', desc: 'loved by our community', color: '#fb7185', glow: 'rgba(251,113,133,0.12)',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.7 }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s, border-color 0.3s'
              }}
              whileHover={{ y: -6, borderColor: 'rgba(255,255,255,0.18)' }}
            >
              {/* Card inner glow */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)`,
                borderRadius: '24px 24px 0 0'
              }} />
              <div style={{
                position: 'absolute', bottom: '-30%', right: '-10%',
                width: 120, height: 120, borderRadius: '50%',
                background: stat.glow, filter: 'blur(24px)',
                pointerEvents: 'none'
              }} />

              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${stat.glow}`,
                border: `1px solid ${stat.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.color, marginBottom: 8
              }}>
                {stat.icon}
              </div>

              {/* Number */}
              <div style={{
                fontFamily: 'Sora,sans-serif',
                fontSize: 'clamp(40px,4vw,56px)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                display: 'flex', alignItems: 'baseline', gap: 2
              }}>
                <AnimatedCounter end={stat.end} label="" suffix="" />
                <span style={{ color: stat.color, fontSize: '0.7em' }}>{stat.suffix}</span>
              </div>

              {/* Label */}
              <div style={{
                fontFamily: 'Sora,sans-serif',
                fontSize: 16, fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                marginTop: 4
              }}>
                {stat.label}
              </div>

              {/* Sub desc */}
              <div style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.35)',
                fontFamily: 'DM Sans,sans-serif'
              }}>
                {stat.desc}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Curved Marquee with centered label */}
        <motion.div
          className="curved-loop-wrap"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.9 }}
          style={{
            marginTop: 64,
            width: '100vw',
            position: 'relative',
            zIndex: 1,
            marginLeft: 'calc(-50vw + 50%)',
          }}
        >
          {/* "Students placed at" label above the curve */}
          <div className="curved-marquee-title" style={{
            textAlign: 'center',
            position: 'relative',
            zIndex: 3,
            marginBottom: -25, // Nudge it down to stick closer to the curve
          }}>
            <span style={{
              display: 'inline-block',
              fontFamily: 'Sora, sans-serif',
              fontSize: 28, // Balanced size
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '12px 32px',
              borderRadius: 100,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}>
              Students placed at
            </span>
          </div>

          <CurvedLoop
            marqueeText="Google ✦ Amazon ✦ Microsoft ✦ Flipkart ✦ Infosys ✦ TCS ✦ Wipro ✦ Accenture ✦ Adobe ✦ Deloitte ✦ "
            speed={1.5}
            curveAmount={200}
            direction="left"
            interactive
            fontSize={34}
            gradientColors={['#818cf8', '#60a5fa']}
          />
        </motion.div>
      </section>

      <Divider />

      {/* SECTION 3 — ABOUT */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 1024px) {
          .about-inner-grid { grid-template-columns: 1fr !important; }
          .about-right-col { height: 380px !important; }
        }
        @media (max-width: 768px) {
          .about-right-col { display: none !important; }
        }
      `}} />
      <section ref={aboutRef} style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0a0f1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Large purple blob top-right */}
        <div style={{
          position: 'absolute', top: '-15%', right: '-5%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)',
          pointerEvents: 'none', filter: 'blur(60px)'
        }} />
        {/* Blue blob bottom-left */}
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)',
          pointerEvents: 'none', filter: 'blur(60px)'
        }} />
        {/* Grid dot pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none'
        }} />

        <div className="about-inner-grid" style={{
          maxWidth: 1100,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          {/* LEFT COLUMN — TEXT */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div style={{ marginBottom: 20 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 100,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.3)',
                fontSize: 13, fontWeight: 800, letterSpacing: '0.1em',
                color: '#fff', textTransform: 'uppercase',
                fontFamily: 'DM Sans,sans-serif'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 10px #fff' }} />                Why SmartPlacement?
              </span>
            </div>

            {/* Heading */}
            <h2 style={{
              fontFamily: 'Sora,sans-serif',
              fontSize: 'clamp(32px,4vw,52px)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              marginBottom: 24
            }}>
              The smarter way<br />to land your{' '}
              <span style={{
                background: 'linear-gradient(90deg,#818cf8,#a78bfa,#60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>next role</span>
            </h2>

            {/* Body */}
            <p style={{
              fontSize: 16, color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.75, marginBottom: 32,
              fontFamily: 'DM Sans,sans-serif',
              maxWidth: 440
            }}>
              Navigate the complex landscape of placements with an unfair advantage. We combine AI-driven networking, automatic ATS resume optimization, and real-time application tracking.
            </p>

            {/* Bullet points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
              {[
                { text: 'ATS Resume Optimization', desc: 'Beat the bots, reach the humans' },
                { text: 'One-click Applications', desc: 'Apply to 10 jobs in under a minute' },
                { text: 'Direct Recruiter Messaging', desc: 'Skip the queue, talk directly' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(52,211,153,0.15)',
                    border: '1px solid rgba(52,211,153,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 2
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'DM Sans,sans-serif' }}>{item.text}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans,sans-serif', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Learn More button */}
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '12px 24px', borderRadius: 100,
              background: 'rgba(129,140,248,0.12)',
              border: '1px solid rgba(129,140,248,0.3)',
              color: '#818cf8', fontSize: 14, fontWeight: 600,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(129,140,248,0.22)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(129,140,248,0.12)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)' }}
            >
              Explore All Features
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </button>
          </motion.div>

          {/* RIGHT COLUMN — VISUAL CARDS STACK */}
          <motion.div
            className="about-right-col"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative', height: 500, width: '100%' }}
          >
            {/* Glow behind cards */}
            <div style={{
              position: 'absolute', top: '30%', left: '20%',
              width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
              filter: 'blur(40px)', pointerEvents: 'none'
            }} />

            {/* CARD 1 — AI Resume Matcher */}
            <motion.div
              initial={{ opacity: 0, y: 20, rotate: 2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 3 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{
                position: 'absolute', top: 20, left: '2%',
                width: '100%', maxWidth: 440,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(124,58,237,0.15))',
                border: '1px solid rgba(129,140,248,0.25)',
                borderRadius: 24, padding: '32px 36px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(124,58,237,0.15)',
                zIndex: 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, color: '#fff', fontSize: 17 }}>AI Resume Matcher</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Google SWE Role • Just matched</div>
                </div>
                <div style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 100, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', fontSize: 12, fontWeight: 600, color: '#34d399' }}>LIVE</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans,sans-serif' }}>Match Score</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399', fontFamily: 'Sora,sans-serif' }}>92%</span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 100 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '92%' }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#34d399,#10b981)', borderRadius: 100 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {['React', 'Node.js', 'System Design'].map((tag, i) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans,sans-serif' }}>{tag}</span>
                ))}
              </div>
            </motion.div>

            {/* CARD 2 — Interview Scheduler */}
            <motion.div
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: -2 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{
                position: 'absolute', top: 250, left: '10%',
                width: '95%', maxWidth: 400,
                background: 'rgba(15,20,40,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24, padding: '28px 32px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                zIndex: 2
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, color: '#fff', fontSize: 17 }}>Interview Scheduler</div>
                  <div style={{ fontSize: 14, color: '#60a5fa', marginTop: 4, fontWeight: 500, fontFamily: 'DM Sans,sans-serif' }}>3 interviews this week</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {[
                  { day: 'Mon', co: 'Google', color: '#818cf8' },
                  { day: 'Wed', co: 'Amazon', color: '#f59e0b' },
                  { day: 'Fri', co: 'Microsoft', color: '#34d399' },
                ].map((item, i) => (
                  <div key={i} style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${item.color}30`, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans,sans-serif' }}>{item.day}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginTop: 4, fontFamily: 'Sora,sans-serif' }}>{item.co}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* CARD 3 — small floating stat */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6 }}
              style={{
                position: 'absolute', top: 0, right: '-5%',
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: 20, padding: '18px 24px',
                backdropFilter: 'blur(16px)',
                zIndex: 3
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans,sans-serif', marginBottom: 6 }}>Offers received</div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 34, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>2.4k+</div>
              <div style={{ fontSize: 12, color: 'rgba(52,211,153,0.7)', marginTop: 6, fontFamily: 'DM Sans,sans-serif' }}>↑ 18% this month</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* SECTION 4 — FEATURES */}
      <section ref={featuresRef} className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1e] px-6 py-[120px] relative">
        <div className="w-full max-w-[1200px] mx-auto">
          <div style={{
            textAlign: 'center',
            marginBottom: 48,
            position: 'relative',
            zIndex: 1
          }}>

            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: '0 0 12px'
            }}>
              Everything you need<br/>
              <span style={{
                background: 'linear-gradient(90deg,#a78bfa,#818cf8,#60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>to get hired</span>
            </h2>

            <p style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'DM Sans, sans-serif',
              margin: 0
            }}>
              Powerful tools designed exclusively for students and fresh graduates.
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 1200,
            margin: '0 auto'
          }}>
            <MagicBento 
              textAutoHide={true}
              enableStars
              enableSpotlight
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect
              spotlightRadius={500}
              particleCount={16}
              glowColor="59, 130, 246"
              disableAnimations={false}
            />
          </div>
        </div>
      </section>

      <Divider />

      {/* SECTION 5 — HOW IT WORKS */}
      <section ref={howItWorksRef} className="min-h-screen flex flex-col items-center justify-center bg-[#070b18] px-6 py-[120px] relative">
        <div className="w-full max-w-[1200px] mx-auto">
          <div style={{
            textAlign: 'center',
            marginBottom: 96,
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 100,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              fontSize: 14, fontWeight: 800, letterSpacing: '0.1em',
              color: '#fff', textTransform: 'uppercase',
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: 20
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff', display:'inline-block', boxShadow:'0 0 10px #fff' }}/>
              How It Works
            </span>

            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0
            }}>
              Get hired in <span style={{
                background: 'linear-gradient(90deg,#60a5fa,#a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>4 simple steps</span>
            </h2>
          </div>

          <div className="relative mt-4">
            {/* Connecting Line (Desktop) */}
            <div style={{
              position: 'absolute', top: 43, left: '10%', right: '10%',
              height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.15) 80%, transparent)',
              zIndex: 0
            }} className="hidden md:block"></div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 32,
              position: 'relative',
              zIndex: 10
            }}>
              {[
                { num: 1, title: "Create Profile", desc: "Fill out your details securely and upload your best resume." },
                { num: 2, title: "AI Matching", desc: "Our powerful AI accurately matches you with the best roles." },
                { num: 3, title: "Apply & Track", desc: "One-click apply and seamlessly track all applications." },
                { num: 4, title: "Get Hired", desc: "Receive multiple offers and joyfully accept your dream job." }
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.8 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 16px' }}
                >
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 32, position: 'relative',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 800, color: '#fff',
                      boxShadow: '0 12px 32px rgba(168,85,247,0.4)',
                      border: '4px solid #070b18'
                    }}>
                      {step.num}
                    </div>
                  </div>
                  <h3 style={{
                    fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, color: '#fff',
                    marginBottom: 16, letterSpacing: '-0.02em'
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: 17, color: 'rgba(255,255,255,0.55)', fontFamily: 'DM Sans, sans-serif',
                    lineHeight: 1.6, maxWidth: 280, margin: 0
                  }}>
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* SECTION 6 — TESTIMONIALS */}
      <section ref={testimonialsRef} className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1e] px-6 py-[120px] relative">
        <div className="w-full max-w-[1200px] mx-auto">
          <div style={{
            textAlign: 'center',
            marginBottom: 80,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            {/* Badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 100,
              background: 'rgba(234,179,8,0.12)',
              border: '1px solid rgba(234,179,8,0.25)',
              fontSize: 14, fontWeight: 800, letterSpacing: '0.1em',
              color: '#fff', textTransform: 'uppercase',
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: 20
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff', display:'inline-block', boxShadow:'0 0 10px #fff' }}/>
              Success Stories
            </span>

            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0
            }}>
              Loved by students <span style={{
                background: 'linear-gradient(90deg,#eab308,#fde047)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>across India</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: 32,
            width: '100%',
            maxWidth: 1200,
            margin: '0 auto'
          }}>
            {testimonials.map((test, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.8 }}
                whileHover={{ y: -8, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)' }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 24,
                  padding: '48px 40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 400,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Quote decoration */}
                <div style={{
                  position: 'absolute', top: -20, left: 16,
                  fontSize: 200, color: 'rgba(255,255,255,0.04)',
                  fontFamily: 'Georgia, serif', lineHeight: 1,
                  pointerEvents: 'none', zIndex: 0
                }}>
                  "
                </div>

                <div style={{ position: 'relative', zIndex: 10 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 24, color: '#facc15' }}>
                    {[...Array(test.rating)].map((_, j) => (
                      <svg key={j} width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    ))}
                  </div>
                  <p style={{
                    fontSize: 18, color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.7, marginBottom: 40, fontStyle: 'italic',
                    fontFamily: 'DM Sans, sans-serif',
                    margin: 0
                  }}>
                    "{test.quote}"
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 10, marginTop: 40 }}>
                  <div className={test.color} style={{
                    width: 56, height: 56, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: '#fff'
                  }}>
                    {test.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>{test.name}</h4>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{test.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* SECTION 7 — CTA */}
      <section ref={ctaRef} style={{
        width: '100%',
        background: '#070b18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        position: 'relative',
        zIndex: 20
      }}>
        <motion.div
          className="cta-inner-card"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: 860,
            borderRadius: 28,
            padding: '64px 56px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #3730a3 0%, #5b21b6 40%, #7c3aed 100%)',
            boxShadow: '0 32px 80px rgba(124,58,237,0.35)'
          }}
        >
          {/* Top-right circle */}
          <div style={{
            position:'absolute', top:-60, right:-60,
            width:220, height:220, borderRadius:'50%',
            background:'rgba(255,255,255,0.06)',
            pointerEvents:'none'
          }}/>
          {/* Bottom-left circle */}
          <div style={{
            position:'absolute', bottom:-40, left:-40,
            width:160, height:160, borderRadius:'50%',
            background:'rgba(255,255,255,0.04)',
            pointerEvents:'none'
          }}/>
          {/* Diagonal lines pattern */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px)',
            pointerEvents:'none', borderRadius:28
          }}/>

          {/* Subtle background GradientBlinds for CTA */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.2, mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 0 }}>
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

          <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              marginBottom:20
            }}>
              {/* 3 avatar circles */}
              {['#818cf8','#34d399','#f472b6'].map((c,i) => (
                <div key={i} style={{
                  width:28, height:28, borderRadius:'50%',
                  background:c, border:'2px solid rgba(255,255,255,0.3)',
                  marginLeft: i > 0 ? -8 : 0, position:'relative',
                  zIndex: 3-i
                }}/>
              ))}
              <span style={{
                fontSize:13, color:'rgba(255,255,255,0.7)',
                fontFamily:'DM Sans,sans-serif', marginLeft:8
              }}>
                Join <strong style={{color:'#fff'}}>10,000+</strong> students
              </span>
            </div>

            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: 16,
              margin: '0 0 16px'
            }}>
              Ready to land your<br/>
              <span style={{
                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>dream job?</span>
            </h2>

            <p style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.65,
              maxWidth: 480,
              margin: '0 auto 36px',
              fontFamily: 'DM Sans, sans-serif'
            }}>
              Join 10,000+ students already using SmartPlacement to beat the ATS and secure multiple top-tier offers.
            </p>

            <div className="cta-buttons-row" style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {/* Get Started Free */}
              <button
                onClick={() => navigate('/login-form')}
                className="cta-btn"
                style={{
                  padding: '13px 32px',
                  borderRadius: 100,
                  border: 'none',
                  background: '#fff',
                  color: '#1e1b4b',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'Sora, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)' }}
              >
                Get Started Free
              </button>

              {/* Watch Demo */}
              <button
                className="cta-btn"
                style={{
                  padding: '13px 32px',
                  borderRadius: 100,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'Sora, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,0.35)' }}
              >
                Watch Demo
              </button>
            </div>
          </div>
        </motion.div>

        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 640px) {
            .cta-inner-card { padding: 44px 24px !important; }
            .cta-buttons-row { flex-direction: column !important; width: 100% !important; }
            .cta-btn { width: 100% !important; }
          }
        `}} />
      </section>

    </div>
  )
}
