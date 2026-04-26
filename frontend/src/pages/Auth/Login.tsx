import React, { useEffect, useState, useRef } from 'react'
import SmartPlacementLogo from '../../components/common/SmartPlacementLogo'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GradientBlinds } from '../../components/common/GradientBlinds'
import CurvedLoop from '../../components/common/CurvedLoop'

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

const faqItems = [
  {
    q: 'Is the Smart Placement Tracker free for students?',
    a: 'Yes. The core features of the Smart Placement Tracker are completely free for students, including application tracking, deadline alerts, and basic analytics. Advanced insights and AI recommendations may be part of future premium features.'
  },
  {
    q: 'How does the Smart Placement Tracker work?',
    a: 'The platform allows you to log, monitor, and manage all your job and internship applications in one place. It tracks statuses like Applied, Shortlisted, Interview, Rejected, and Offer Received, while providing insights to improve your placement strategy.'
  },
  {
    q: 'Can I track applications from multiple companies?',
    a: 'Absolutely. You can add unlimited applications across different companies, roles, and platforms (on-campus, off-campus, referrals, etc.), all organized in a single dashboard.'
  },
  {
    q: 'Does it send reminders for deadlines and interviews?',
    a: 'Yes. The tracker sends smart reminders for application deadlines, online tests, interview schedules, and follow-ups — so you never miss an important step in the placement process.'
  },
  {
    q: 'How does the AI recommendation system help me?',
    a: 'Our AI analyzes your application history, skills, and outcomes to suggest better job roles, highlight weak areas (e.g., low shortlist rate), and recommend improvements in your resume or application strategy.'
  },
  {
    q: 'Can I analyze my placement performance?',
    a: 'Yes. You get detailed analytics such as application-to-shortlist ratio, interview success rate, and offer conversion rate — helping you make data-driven decisions throughout your placement journey.'
  },
]

function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {faqItems.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.5 }}
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '24px 0', gap: 16, textAlign: 'left'
            }}
          >
            <span style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              color: open === i ? '#FF9FFC' : '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.4,
              transition: 'color 0.3s'
            }}>
              {item.q}
            </span>
            <span style={{
              flexShrink: 0,
              width: 28, height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: open === i ? '#FF9FFC' : 'rgba(255,255,255,0.5)',
              fontSize: 18,
              transition: 'all 0.3s',
              transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)'
            }}>
              +
            </span>
          </button>
          <motion.div
            initial={false}
            animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.75,
              paddingBottom: 24,
              margin: 0
            }}>
              {item.a}
            </p>
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()

  // NAVBAR REFS AND STATE
  const [activeNav, setActiveNav] = useState('about')
  const [activeTab, setActiveTab] = useState(0)
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
    { label: 'FAQ', ref: testimonialsRef, key: 'testimonials' },
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



  return (
    <div className="flex flex-col w-full font-['DM_Sans',sans-serif] bg-[#000000] text-white overflow-hidden selection:bg-blue-500/30">

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .nav-center-links { display: none !important; }
          .nav-wrapper { width: calc(100% - 24px) !important; padding: 10px 16px !important; }
          .mobile-menu-btn { display: flex !important; }
          .curved-loop-wrap { margin-top: 24px !important; }
          .curved-loop-wrap svg text { font-size: 28px !important; }
          .curved-marquee-title { font-size: 20px !important; padding: 8px 20px !important; margin-bottom: -15px !important; }
          .faq-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .faq-heading { position: static !important; }
        }
        @media (max-width: 480px) {
          .curved-loop-wrap { margin-top: 16px !important; }
          .curved-loop-wrap svg text { font-size: 22px !important; }
          .curved-marquee-title { font-size: 16px !important; padding: 6px 16px !important; margin-bottom: -10px !important; }
        }
        .mobile-menu-btn { display: none; }

        /* Modern Premium Button Styles */
        .glass-nav-pill {
          padding: 8px 18px;
          border-radius: 9999px;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          color: rgba(255, 255, 255, 0.6);
          background: transparent;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          position: relative;
        }
        .glass-nav-pill:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-1px);
        }
        .glass-nav-pill-active {
          color: #fff !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 25px rgba(150, 100, 133, 0.25), inset 0 0 10px rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .cta-glass-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px 10px 24px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
        }
        .cta-glass-button:hover {
          transform: translateY(-3px) scale(1.02);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 20px 40px rgba(150, 100, 133, 0.3);
        }
        .cta-glass-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(150, 100, 133, 0.2), rgba(150, 100, 133, 0.2));
          opacity: 0.6;
          transition: opacity 0.4s;
          pointer-events: none;
        }
        .cta-glass-button:hover::before {
          opacity: 1;
        }
        
        .cta-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 2;
        }
        .cta-glass-button:hover .cta-icon-wrap {
          transform: rotate(-15deg) scale(1.1);
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
        }

        .dark-neumorph-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 13px 28px;
          border-radius: 9999px;
          background: #000000;
          border: 1px solid rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 6px 6px 14px rgba(0, 0, 0, 0.6), -3px -3px 12px rgba(255, 255, 255, 0.02);
        }
        .dark-neumorph-button:hover {
          color: #fff;
          transform: translateY(-2px);
          background: #111111;
          box-shadow: 10px 10px 20px rgba(0, 0, 0, 0.7), -4px -4px 16px rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .dark-neumorph-button:active {
          transform: translateY(0);
          box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.8), inset -2px -2px 8px rgba(255, 255, 255, 0.02);
        }
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
          <SmartPlacementLogo size={34} />
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.01em' }}>SmartPlacement</span>
        </div>

        {/* CENTER — NAV LINKS */}
        <div className="nav-center-links" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {navLinks.map(link => (
            <button
              key={link.key}
              onClick={() => scrollTo(link.ref, link.key)}
              className={`glass-nav-pill ${activeNav === link.key ? 'glass-nav-pill-active' : ''}`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile menu trigger + right CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>


          {/* RIGHT — "LET'S TALK" BUTTON */}
          <button
            onClick={() => navigate('/login')}
            className="cta-glass-button"
          >
            <span style={{ position: 'relative', zIndex: 2 }}>Get Started</span>
            <div className="cta-icon-wrap" style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
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
              className={`glass-nav-pill ${activeNav === link.key ? 'glass-nav-pill-active' : ''}`}
              style={{ fontSize: 24, padding: '12px 36px', fontWeight: 700 }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      {/* SECTION 1 — HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#000000] px-6 py-[120px]">
        {/* Animated GradientBlinds Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <GradientBlinds
              gradientColors={["#966485", "#FF9FFC"]}
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

          <h1 style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 'clamp(48px, 6vw, 80px)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            margin: '0 0 24px'
          }}>
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
        background: '#000000',
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
            fontFamily: 'Sora, sans-serif',
            fontSize: 'clamp(48px, 6vw, 80px)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            margin: 0
          }}>
            Numbers that<br />
            <span style={{
              background: 'linear-gradient(90deg, #FF9FFC 0%, #966485 45%, #FF9FFC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontStyle: 'italic'
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
              whileHover={{ y: -10, borderColor: 'rgba(255,255,255,0.5)', boxShadow: '0 0 30px rgba(255,255,255,0.2)' }}
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
            gradientColors={['#FF9FFC', '#966485']}
          />
        </motion.div>
      </section>

      <Divider />

      {/* SECTION 3 — ABOUT */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .about-choose-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
          .about-divider-v, .about-divider-h { display: none !important; }
        }
      `}} />
      <section ref={aboutRef} style={{
        minHeight: '100vh',
        width: '100%',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '90px 24px',
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

      <div
        style={{
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Heading uses full width; text stays centered */}
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 44, padding: '0 12px' }}>
          <h2 style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 'clamp(48px, 6vw, 80px)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.03em',
            margin: 0,
            lineHeight: 1.0,
            textTransform: 'uppercase'
          }}>
            Why choose <span style={{
              color: '#FF9FFC',
              fontStyle: 'italic'
            }}>Smart</span>
            <br />
            Placement Tracker?
          </h2>

          <p style={{
            margin: '18px auto 0',
            maxWidth: 780,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7
          }}>
            Experience the next evolution in placement intelligence. Smart Placement Tracker understands your skills, goals, and progress to create a journey that feels truly guided.
          </p>
        </div>

        <div style={{ width: 'min(980px, 100%)', position: 'relative' }}>
          {/* Center dividers */}
          <div
            className="about-divider-v"
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 1,
              transform: 'translateX(-0.5px)',
              background: 'linear-gradient(180deg, rgba(255,159,252,0) 0%, rgba(255,159,252,0.35) 50%, rgba(150,100,133,0) 100%)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
          />
          <div
            className="about-divider-h"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              height: 1,
              transform: 'translateY(-0.5px)',
              background: 'linear-gradient(90deg, rgba(255,159,252,0) 0%, rgba(255,159,252,0.35) 50%, rgba(150,100,133,0) 100%)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
          />

          <div
            className="about-choose-grid"
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 0,
              borderRadius: 26,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              boxShadow: '0 30px 120px rgba(0,0,0,0.55)'
            }}
          >
            {[
              {
                title: 'Application Tracking Dashboard',
                desc: 'Track every job application and interview stage in one place.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9" />
                    <path d="M7 21h10" />
                    <path d="M9 17h6" />
                  </svg>
                )
              },
              {
                title: 'ATS Resume Optimization',
                desc: 'Improve resume score using AI-based suggestions.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )
              },
              {
                title: 'Smart Job Recommendations',
                desc: 'Get personalized job matches based on skills.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16l4-4-4-4-4 4 4 4z" />
                  </svg>
                )
              },
              {
                title: 'Interview Preparation Support',
                desc: 'Prepare with commonly asked interview questions.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                )
              }
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  padding: '34px 36px',
                  minHeight: 260,
                  background: 'rgba(0,0,0,0.08)'
                }}
                className="about-choose-card"
              >
                <div style={{ color: '#FF9FFC', marginBottom: 16 }}>{card.icon}</div>
                <div
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: 20,
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1.15,
                    marginBottom: 12
                  }}
                >
                  {card.title}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </section>

      <Divider />

      {/* SECTION 4 — FEATURES */}
      <section ref={featuresRef} className="min-h-screen flex flex-col items-center justify-center bg-[#000000] px-6 py-[120px] relative">
        <div className="w-full max-w-[1200px] mx-auto">
          <div style={{
            textAlign: 'center',
            marginBottom: 48,
            position: 'relative',
            zIndex: 1
          }}>

            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(48px, 6vw, 80px)',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              textTransform: 'uppercase',
              margin: '0 0 12px'
            }}>
              Everything you need<br />
              <span style={{
                color: '#FF9FFC',
                fontStyle: 'italic'
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
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 1000,
            margin: '0 auto'
          }}>
            {/* TABS CONTAINER */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 48,
              padding: '6px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 100,
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)'
            }}>
              {[
                "AI Resume Analyser",
                "Application Tracker",
                "Mock Interviews",
                "Career Roadmaps"
              ].map((tab, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'Sora, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: activeTab === i ? '#fff' : 'transparent',
                    color: activeTab === i ? '#000' : 'rgba(255,255,255,0.5)',
                    border: 'none',
                    boxShadow: activeTab === i ? '0 4px 20px rgba(255,255,255,0.3)' : 'none'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* FEATURE CARD */}
            <div style={{ position: 'relative', width: '100%' }}>
              {[
                {
                  id: "01",
                  title: "AI Resume Analyser Built Right In",
                  desc: "Get instant feedback on your resume with our AI-powered analyzer. Match your skills to top job descriptions seamlessly and pass the ATS every time.",
                  preview: {
                    title: "Resume Match",
                    subtitle: "ATS-ready highlights",
                    pill: "MATCH",
                    iconGradient: "linear-gradient(135deg, rgba(255,159,252,0.95), rgba(150,100,133,0.9))",
                    iconGlow: "0 0 26px rgba(255,159,252,0.35)",
                    ambient:
                      "radial-gradient(circle at 30% 20%, rgba(255,159,252,0.38), transparent 55%)," +
                      "radial-gradient(circle at 75% 70%, rgba(150,100,133,0.22), transparent 60%)," +
                      "radial-gradient(circle at 30% 85%, rgba(255,159,252,0.18), transparent 60%)",
                    skeleton: ["88%", "72%", "92%", "64%", "78%"],
                    chips: [
                      { label: "Resume Score", value: "92%", accent: "rgba(255,159,252,0.20)", border: "rgba(255,159,252,0.28)", text: "#ffd1f4" },
                      { label: "Speed", value: "Fast", accent: "rgba(150,100,133,0.14)", border: "rgba(150,100,133,0.22)", text: "#f1c7d8" },
                    ],
                  },
                },
                {
                  id: "02",
                  title: "Smart Application Tracker for Results",
                  desc: "Organize your job hunt with our intuitive tracker. Monitor application statuses, upcoming deadlines, and interview schedules in one centralized dashboard.",
                  preview: {
                    title: "Pipeline Sync",
                    subtitle: "Auto-updated statuses",
                    pill: "SYNC",
                    iconGradient: "linear-gradient(135deg, rgba(255,159,252,0.95), rgba(150,100,133,0.9))",
                    iconGlow: "0 0 26px rgba(255,159,252,0.32)",
                    ambient:
                      "radial-gradient(circle at 25% 25%, rgba(255,159,252,0.34), transparent 58%)," +
                      "radial-gradient(circle at 80% 30%, rgba(150,100,133,0.22), transparent 62%)," +
                      "radial-gradient(circle at 70% 85%, rgba(255,159,252,0.14), transparent 60%)",
                    skeleton: ["76%", "94%", "68%", "86%", "58%"],
                    chips: [
                      { label: "Status Sync", value: "Realtime", accent: "rgba(255,159,252,0.18)", border: "rgba(255,159,252,0.26)", text: "#ffd1f4" },
                      { label: "Reminders", value: "On", accent: "rgba(150,100,133,0.14)", border: "rgba(150,100,133,0.22)", text: "#f1c7d8" },
                    ],
                  },
                },
                {
                  id: "03",
                  title: "Realistic AI Mock Interview Room",
                  desc: "Practice with our high-fidelity AI interviewer. Receive real-time feedback on your answers, technical accuracy, tone, and confidence levels.",
                  preview: {
                    title: "Interview Notes",
                    subtitle: "Clarity & confidence",
                    pill: "COACH",
                    iconGradient: "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(34,211,238,0.85))",
                    iconGlow: "0 0 26px rgba(34,211,238,0.26)",
                    ambient:
                      "radial-gradient(circle at 30% 20%, rgba(34,211,238,0.24), transparent 58%)," +
                      "radial-gradient(circle at 75% 55%, rgba(59,130,246,0.22), transparent 62%)," +
                      "radial-gradient(circle at 30% 85%, rgba(129,140,248,0.16), transparent 60%)",
                    skeleton: ["92%", "66%", "80%", "90%", "62%"],
                    chips: [
                      { label: "Confidence", value: "A+", accent: "rgba(34,211,238,0.14)", border: "rgba(34,211,238,0.22)", text: "#a5f3fc" },
                      { label: "Tone", value: "Clear", accent: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.22)", text: "#93c5fd" },
                    ],
                  },
                },
                {
                  id: "04",
                  title: "Personalized Career Learning Roadmaps",
                  desc: "Generate AI-driven career roadmaps tailored to your target roles. Learn exactly what skills you need, where to learn them, and how to master them.",
                  preview: {
                    title: "Roadmap",
                    subtitle: "Week-by-week plan",
                    pill: "PLAN",
                    iconGradient: "linear-gradient(135deg, rgba(255,159,252,0.95), rgba(150,100,133,0.9))",
                    iconGlow: "0 0 26px rgba(255,159,252,0.22)",
                    ambient:
                      "radial-gradient(circle at 26% 18%, rgba(255,159,252,0.24), transparent 58%)," +
                      "radial-gradient(circle at 78% 35%, rgba(150,100,133,0.22), transparent 62%)," +
                      "radial-gradient(circle at 60% 90%, rgba(255,159,252,0.14), transparent 62%)",
                    skeleton: ["70%", "86%", "94%", "60%", "82%"],
                    chips: [
                      { label: "Roadmap Fit", value: "Personal", accent: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.22)", text: "#fbcfe8" },
                      { label: "Weeks", value: "12", accent: "rgba(150,100,133,0.14)", border: "rgba(150,100,133,0.22)", text: "#f1c7d8" },
                    ],
                  },
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ 
                    opacity: activeTab === i ? 1 : 0, 
                    scale: activeTab === i ? 1 : 0.95, 
                    y: activeTab === i ? 0 : 20,
                    pointerEvents: activeTab === i ? 'auto' : 'none'
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ 
                    y: -8,
                    boxShadow: '0 0 50px rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.4)'
                  }}
                  style={{
                    position: activeTab === i ? 'relative' : 'absolute',
                    top: 0, left: 0, width: '100%',
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,159,252,0.25)',
                    borderRadius: 24,
                    padding: '60px 80px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 40,
                    boxShadow: '0 0 40px rgba(255,159,252,0.14)',
                    overflow: 'hidden'
                  }}
                >
                  {/* WATERMARK NUMBER */}
                  <div style={{
                    fontSize: 200,
                    fontWeight: 900,
                    color: 'rgba(255,255,255,0.02)',
                    position: 'absolute',
                    left: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'Sora, sans-serif',
                    userSelect: 'none',
                    lineHeight: 1
                  }}>
                    {feature.id}
                  </div>

                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: 'clamp(24px, 3.5vw, 42px)',
                      fontWeight: 800,
                      color: '#fff',
                      lineHeight: 1.2,
                      margin: 0,
                      maxWidth: '80%'
                    }}>
                      {feature.title}
                    </h3>
                    <p style={{
                      fontSize: 18,
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'DM Sans, sans-serif',
                      lineHeight: 1.6,
                      margin: 0,
                      maxWidth: 600
                    }}>
                      {feature.desc}
                    </p>
                  </div>

                  {/* Right-side visual (fills the empty space) */}
                  <div
                    className="hidden lg:block"
                    style={{
                      position: 'relative',
                      width: 360,
                      height: 300,
                      flex: '0 0 360px',
                      borderRadius: 22,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      overflow: 'hidden',
                      boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
                    }}
                  >
                    {(() => {
                      const p = feature.preview
                      const skeleton = p?.skeleton?.length ? p.skeleton : ["78%", "92%", "64%", "84%", "56%"]
                      const chips = p?.chips?.length ? p.chips : [
                        { label: 'Metric', value: '—', accent: 'rgba(255,159,252,0.20)', border: 'rgba(255,159,252,0.28)', text: '#ffd1f4' },
                        { label: 'Speed', value: 'Fast', accent: 'rgba(150,100,133,0.14)', border: 'rgba(150,100,133,0.22)', text: '#f1c7d8' },
                      ]
                      return (
                        <>
                    {/* Ambient glows */}
                    <div style={{
                      position: 'absolute',
                      inset: -40,
                      background: p?.ambient ||
                        'radial-gradient(circle at 30% 20%, rgba(255,159,252,0.35), transparent 55%),' +
                          'radial-gradient(circle at 75% 70%, rgba(150,100,133,0.22), transparent 60%),' +
                          'radial-gradient(circle at 30% 85%, rgba(255,159,252,0.18), transparent 60%)',
                      filter: 'blur(18px)',
                      pointerEvents: 'none',
                    }} />

                    {/* Fake “generated” preview card */}
                    <div style={{
                      position: 'absolute',
                      left: 18,
                      right: 18,
                      top: 18,
                      padding: '14px 14px 12px',
                      borderRadius: 18,
                      background: 'rgba(13,13,26,0.72)',
                      border: '1px solid rgba(255,159,252,0.24)',
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                      boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 12,
                          background: p?.iconGradient || 'linear-gradient(135deg, rgba(255,159,252,0.95), rgba(150,100,133,0.9))',
                          boxShadow: p?.iconGlow || '0 0 26px rgba(255,159,252,0.35)',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p?.title || 'AI Preview'}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                            {p?.subtitle || 'Tailored to this feature'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.12em',
                          color: '#FF9FFC',
                          textTransform: 'uppercase',
                          textShadow: '0 0 24px rgba(255,159,252,0.35)',
                        }}>
                          {p?.pill || 'LIVE'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {skeleton.map((w, idx) => (
                          <div key={idx} style={{ height: 10, borderRadius: 999, width: w, background: idx % 2 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </div>
                    </div>

                    {/* Mini “metric” chips */}
                    <div style={{
                      position: 'absolute',
                      left: 18,
                      bottom: 18,
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}>
                      {chips.map((chip, idx) => (
                        <div key={idx} style={{
                          padding: '10px 12px',
                          borderRadius: 16,
                          background: chip.accent,
                          border: `1px solid ${chip.border}`,
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          minWidth: 150,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                            {chip.label}
                          </div>
                          <div style={{ marginTop: 6, fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16, color: chip.text }}>
                            {chip.value}
                          </div>
                        </div>
                      ))}
                    </div>
                        </>
                      )
                    })()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* SECTION 5 — HOW IT WORKS */}
      <section ref={howItWorksRef} className="min-h-screen flex flex-col items-center justify-center bg-[#000000] px-6 py-[120px] relative">
        <div className="w-full max-w-[1200px] mx-auto">
          <div style={{
            textAlign: 'center',
            marginBottom: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(48px, 6vw, 80px)',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              textTransform: 'uppercase',
              margin: 0
            }}>
              Get hired in <br />
              <span style={{
                background: 'linear-gradient(90deg, #FF9FFC 0%, #966485 45%, #FF9FFC 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontStyle: 'italic'
              }}>4 simple steps</span>
            </h2>
          </div>

          <div style={{ position: 'relative', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '96px' }}>
            {/* Center Vertical Glowing Line (Desktop Only) */}
            <div style={{
              position: 'absolute',
              top: '0',
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '2px',
              background: 'linear-gradient(180deg, rgba(150,100,133,0) 0%, rgba(150,100,133,0.8) 15%, rgba(150,100,133,0.8) 85%, rgba(150,100,133,0) 100%)',
              zIndex: 0,
            }} className="hidden md:block">
              {/* Optional ambient core glow */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 400, background: 'radial-gradient(ellipse, rgba(150,100,133,0.15) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }}></div>
            </div>

            {[
              { num: "01", title: "Create Profile", subtitle: "STEP ONE", desc: "Fill out your details securely and upload your best resume." },
              { num: "02", title: "AI Matching", subtitle: "STEP TWO", desc: "Our powerful AI accurately matches you with the best roles." },
              { num: "03", title: "Apply & Track", subtitle: "STEP THREE", desc: "One-click apply and seamlessly track all applications." },
              { num: "04", title: "Get Hired", subtitle: "STEP FOUR", desc: "Receive multiple offers and joyfully accept your dream job." }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.8 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                }}
                className="flex-col md:flex-row gap-6 md:gap-0"
              >
                {/* Left Side: Title & Number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="w-full md:w-[45%] text-left md:pr-12 md:justify-between justify-start gap-8 md:gap-0">
                  <div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '26px', fontWeight: 600, color: '#e6edf3', marginBottom: '8px' }}>{step.title}</div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                      background: 'linear-gradient(90deg, #FF9FFC 0%, #966485 50%, #FF9FFC 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 18px rgba(255,159,252,0.22)'
                    }}>{step.subtitle}</div>
                  </div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '48px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }} className="hidden md:block">
                    {step.num}
                  </div>
                </div>

                {/* Glowing Dot on Line (Desktop Only) */}
                <div style={{ width: '10%', display: 'flex', justifyContent: 'center' }} className="hidden md:flex relative">
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#966485',
                    boxShadow: '0 0 20px 6px rgba(150,100,133,0.8), 0 0 40px 10px rgba(150,100,133,0.4)',
                    border: '1px solid #fff'
                  }} />
                </div>

                {/* Right Side: Description */}
                <div className="w-full md:w-[45%] text-left md:pl-12">
                  <p style={{
                    fontSize: '17px',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.65,
                    fontFamily: 'DM Sans, sans-serif',
                    margin: 0,
                    maxWidth: '320px'
                  }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* SECTION 6 — FAQ */}
      <section ref={testimonialsRef} style={{ background: '#000', padding: '120px 24px' }}>
        <div className="faq-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'flex-start' }}>
          {/* Left: heading */}
          <div className="faq-heading" style={{ position: 'sticky', top: 120 }}>
            <motion.h2
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(48px, 6vw, 80px)',
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                color: '#fff',
                textTransform: 'uppercase',
                margin: 0
              }}
            >
              FREQUENTLY<br />ASKED<br /><span style={{ color: '#FF9FFC', fontStyle: 'italic' }}>QUESTIONS.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 16,
                color: 'rgba(255,255,255,0.45)',
                marginTop: 24,
                lineHeight: 1.7,
                maxWidth: 340
              }}
            >
              Everything you need to know about how the Smart Placement Tracker helps you land your dream role.
            </motion.p>
          </div>

          {/* Right: accordion */}
          <FAQAccordion />
        </div>
      </section>

      <Divider />

      {/* SECTION 7 — CTA */}
      <section ref={ctaRef} style={{
        width: '100%',
        background: '#000000',
        padding: '80px 24px',
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
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
            background: 'linear-gradient(135deg, #966485 0%, #966485 40%, #966485 100%)',
            boxShadow: '0 32px 80px rgba(150,100,133,0.35)'
          }}
        >
          {/* Top-right circle */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            pointerEvents: 'none'
          }} />
          {/* Bottom-left circle */}
          <div style={{
            position: 'absolute', bottom: -40, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none'
          }} />
          {/* Diagonal lines pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px)',
            pointerEvents: 'none', borderRadius: 28
          }} />

          {/* Subtle background GradientBlinds for CTA */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.2, mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 0 }}>
            <GradientBlinds
              gradientColors={["#966485", "#966485"]}
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
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 20
            }}>
              {/* 3 avatar circles */}
              {['#966485', '#34d399', '#f472b6'].map((c, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c, border: '2px solid rgba(255,255,255,0.3)',
                  marginLeft: i > 0 ? -8 : 0, position: 'relative',
                  zIndex: 3 - i
                }} />
              ))}
              <span style={{
                fontSize: 13, color: 'rgba(255,255,255,0.7)',
                fontFamily: 'DM Sans,sans-serif', marginLeft: 8
              }}>
                Join <strong style={{ color: '#fff' }}>10,000+</strong> students
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
              Ready to land your<br />
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
                onClick={() => navigate('/login')}
                className="cta-glass-button"
                style={{ padding: '14px 16px 14px 32px', fontSize: 16 }}
              >
                <span style={{ position: 'relative', zIndex: 2 }}>Get Started Free</span>
                <div className="cta-icon-wrap" style={{ width: 44, height: 44 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                </div>
              </button>


            </div>
          </div>
        </motion.div>

        <style dangerouslySetInnerHTML={{
          __html: `
          @media (max-width: 640px) {
            .cta-inner-card { padding: 44px 24px !important; }
            .cta-buttons-row { flex-direction: column !important; width: 100% !important; }
            .cta-glass-button, .dark-neumorph-button, .cta-btn { width: 100% !important; justify-content: center !important; }
          }
        `}} />
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/5 py-16 px-6 relative z-20" style={{ background: '#000000' }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row flex-wrap justify-between gap-12 md:gap-8">
          {/* Left Column (Brand & Socials) */}
          <div className="w-full md:max-w-[300px] flex flex-col gap-8">
            {/* Logo */}
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              fontSize: '28px',
              letterSpacing: '-1px',
              color: '#fff'
            }}>
              Smart<span style={{
                background: 'linear-gradient(90deg, #FF9FFC 0%, #966485 45%, #FF9FFC 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 28px rgba(255,159,252,0.22)'
              }}>Placement</span>
            </div>
            
            {/* Social Icons */}
            <div className="flex gap-4 text-[#7d8590]">
              {/* Twitter */}
              <a href="#" className="hover:text-white transition-colors duration-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              {/* YouTube */}
              <a href="#" className="hover:text-white transition-colors duration-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              {/* Instagram */}
              <a href="#" className="hover:text-white transition-colors duration-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="hover:text-white transition-colors duration-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              {/* Facebook */}
               <a href="#" className="hover:text-white transition-colors duration-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>

          {/* Right Area (Links Grid) */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {/* Column 1 */}
            <div className="flex flex-col gap-4">
              {["Features", "What's New", "Success Stories", "Career Paths", "About Us"].map((link) => (
                <a key={link} href="#" className="text-[#7d8590] text-[14px] font-medium no-underline hover:text-white transition-colors duration-200">
                  {link}
                </a>
              ))}
            </div>
            
            {/* Column 2 */}
            <div className="flex flex-col gap-4">
              {["Universities", "Employers", "Partnerships", "Student Portal", "Campus Drives"].map((link) => (
                <a key={link} href="#" className="text-[#7d8590] text-[14px] font-medium no-underline hover:text-white transition-colors duration-200">
                  {link}
                </a>
              ))}
            </div>

            {/* Column 3 */}
            <div className="flex flex-col gap-4">
              {["Support", "Contact Us", "Help Center", "Careers", "Press"].map((link) => (
                <a key={link} href="#" className="text-[#7d8590] text-[14px] font-medium no-underline hover:text-white transition-colors duration-200">
                  {link}
                </a>
              ))}
            </div>

            {/* Column 4 */}
            <div className="flex flex-col gap-4">
              {["Privacy", "Cookie Policy", "Terms of Service", "Do Not Share My Personal Information"].map((link) => (
                <a key={link} href="#" className="text-[#7d8590] text-[14px] font-medium no-underline hover:text-white transition-colors duration-200">
                  {link}
                </a>
              ))}
              <a
                href="#"
                className="text-[14px] font-semibold no-underline transition-colors duration-200 mt-2"
                style={{
                  background: 'linear-gradient(90deg, #FF9FFC 0%, #966485 45%, #FF9FFC 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 28px rgba(255,159,252,0.22)'
                }}
              >
                Join for Free
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="max-w-[1200px] mx-auto mt-16 pt-6 border-t border-white/5 flex justify-center text-[#4b5563] text-[13px]">
          © {new Date().getFullYear()} SmartPlacement Tracker
        </div>
      </footer>

    </div>
  )
}
