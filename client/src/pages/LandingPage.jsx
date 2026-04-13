/**
 * LandingPage.jsx — Khaja X Premium Landing Page
 * Vibrant Orange Theme Architecture (As per Dashboard Theme)
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, LayoutDashboard, UtensilsCrossed, QrCode, LineChart, ChevronRight, ChefHat, Coffee, Smartphone, Flame, Globe, MessageCircle, Mail, ArrowRight } from 'lucide-react'

const SmartKitchenBackground = () => {
  const nodes = [
    { Icon: QrCode, top: '15%', left: '10%', delay: 0, duration: 4, glow: 'border-slate-200/50 bg-white/40 shadow-sm', color: 'text-slate-400/60' },
    { Icon: LayoutDashboard, top: '35%', left: '85%', delay: 1.5, duration: 3.5, glow: 'border-orange-500/20 bg-orange-50/30 shadow-none', color: 'text-orange-500/50', ping: true },
    { Icon: UtensilsCrossed, top: '75%', left: '15%', delay: 2.5, duration: 5, glow: 'border-slate-200/50 bg-slate-50/40 shadow-sm', color: 'text-slate-400/60' },
    { Icon: LineChart, top: '60%', left: '70%', delay: 1, duration: 4.5, glow: 'border-emerald-500/20 bg-emerald-50/30 shadow-none', color: 'text-emerald-500/50', ping: true },
    { Icon: Flame, top: '85%', left: '55%', delay: 3, duration: 3.8, glow: 'border-slate-200/50 bg-slate-50/40 shadow-sm', color: 'text-slate-400/60' },
    { Icon: Smartphone, top: '25%', left: '45%', delay: 0.5, duration: 4.2, glow: 'border-blue-500/20 bg-blue-50/30 shadow-none', color: 'text-blue-500/50' }
  ];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-orange-400/20 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-400/15 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '10s' }}></div>
      <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] bg-blue-400/10 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '12s' }}></div>

      {/* Tech Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '4rem 4rem',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 85%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 85%)'
      }}></div>

      {/* Flowing Data Lines (representing orders moving through the system) */}
      <svg className="absolute inset-0 w-full h-full opacity-60">
        <defs>
          <linearGradient id="dataFlow1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="dataFlow2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="dataFlow3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Horizontal Paths */}
        <path d="M 0 128 L 3000 128" stroke="url(#dataFlow1)" strokeWidth="1.5" className="animate-data-flow-x" strokeDasharray="150 1500" />
        <path d="M 0 384 L 3000 384" stroke="url(#dataFlow3)" strokeWidth="1.5" className="animate-data-flow-x" strokeDasharray="200 1200" style={{ animationDelay: '2s', animationDuration: '15s' }} />
        <path d="M 0 768 L 3000 768" stroke="url(#dataFlow1)" strokeWidth="1.5" className="animate-data-flow-x" strokeDasharray="100 1800" style={{ animationDelay: '4s', animationDuration: '12s' }} />
        <path d="M 0 1024 L 3000 1024" stroke="url(#dataFlow3)" strokeWidth="1.5" className="animate-data-flow-x" strokeDasharray="250 2000" style={{ animationDelay: '1s', animationDuration: '20s' }} />

        {/* Vertical Paths */}
        <path d="M 192 0 L 192 3000" stroke="url(#dataFlow2)" strokeWidth="1.5" className="animate-data-flow-y" strokeDasharray="150 1500" />
        <path d="M 512 0 L 512 3000" stroke="url(#dataFlow2)" strokeWidth="1.5" className="animate-data-flow-y" strokeDasharray="250 1800" style={{ animationDelay: '3s', animationDuration: '18s' }} />
        <path d="M 1024 0 L 1024 3000" stroke="url(#dataFlow2)" strokeWidth="1.5" className="animate-data-flow-y" strokeDasharray="100 2000" style={{ animationDelay: '5s', animationDuration: '14s' }} />
        <path d="M 1408 0 L 1408 3000" stroke="url(#dataFlow2)" strokeWidth="1.5" className="animate-data-flow-y" strokeDasharray="300 2500" style={{ animationDelay: '2s', animationDuration: '16s' }} />
      </svg>

      {/* Subtle Floating Smart Nodes Constellation */}
      {nodes.map((node, i) => (
        <div
          key={i}
          className={`absolute flex items-center justify-center rounded-[1rem] backdrop-blur-md border ${node.glow}`}
          style={{
            top: node.top,
            left: node.left,
            width: '40px',
            height: '40px',
            animation: `floatNode ${node.duration}s ease-in-out infinite alternate`,
            animationDelay: `${node.delay}s`,
          }}
        >
          <node.Icon size={18} className={node.color} />
          {node.ping && (
            <div className="absolute inset-0 rounded-[1rem] border border-orange-400/20 animate-ping" style={{ animationDuration: '4s', animationDelay: `${node.delay}s` }}></div>
          )}
        </div>
      ))}
    </div>
  );
};

const AnimatedCounter = ({ end, duration = 2500, suffix = '', prefix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasTriggered) {
        setHasTriggered(true);
      }
    }, { threshold: 0.1 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasTriggered]);

  useEffect(() => {
    if (!hasTriggered) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); // ease out quartic
      setCount(easeProgress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [hasTriggered, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
};

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="kx-glass-panel rounded-xl overflow-hidden transition-all duration-300">
      <button
        className="w-full p-6 text-left flex justify-between items-center group"
        onClick={() => setOpen(v => !v)}
      >
        <span className="font-bold text-[#0f172a]">{question}</span>
        <span
          className="material-symbols-outlined transition-transform duration-300 text-[#475569]"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >expand_more</span>
      </button>
      {open && (
        <div className="px-6 pb-6 text-[#475569] text-sm border-t border-black/5 pt-4 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const faqs = [
    {
      question: 'How does QR table ordering work for my customers?',
      answer: 'Each table gets a unique QR code generated from your Owner Dashboard. Customers scan it with their phone — no app download needed — and instantly see your live digital menu. They browse, add items to their cart, and place the order directly. The order appears on your Kitchen Display System within seconds.'
    },
    {
      question: 'How do orders reach my kitchen staff?',
      answer: 'The moment a customer places an order via QR, it appears instantly on your Kitchen Display System (KDS) — a dedicated screen your chefs use. Orders are color-coded by status: New, Preparing, and Ready. Kitchen staff can update each order\'s status with a tap, and the system tracks timing automatically.'
    },
    {
      question: 'What does the Owner Dashboard show me?',
      answer: 'Your Owner Dashboard gives you real-time visibility into everything: live order feed, revenue stats, average ticket times, and dish performance. You can also manage your menu items, update prices, toggle item availability, and generate new table QR codes — all from one place.'
    },
    {
      question: 'How do I update my menu or mark items as sold out?',
      answer: 'Log into your Owner Dashboard and go to Menu Management. You can add, edit, or remove items instantly. Toggling an item off marks it as unavailable on the live QR menu — customers won\'t be able to order it. Changes go live immediately, no page reload required for diners.'
    },
    {
      question: 'Can I manage multiple restaurant branches from one account?',
      answer: 'Yes. The Central Admin dashboard is built for multi-branch owners. From a single login, you can view orders, revenue, and menu data across all your locations side-by-side — perfect for franchise owners or restaurant groups expanding to new branches.'
    },
    {
      question: 'How do my kitchen staff log into the KDS?',
      answer: 'Kitchen staff use a dedicated Kitchen Login page (/kitchen/login) with their own access credentials — completely separate from the Owner Dashboard. This keeps your financial data and settings secure while giving chefs exactly what they need: a clean, distraction-free order display.'
    },
    {
      question: 'What happens after a customer places an order?',
      answer: 'Customers receive an Order Confirmation screen immediately after submitting their order, showing a summary of what they ordered and the table number. Meanwhile, the order routes to your KDS so the kitchen can start preparing. The entire flow is seamless and requires zero staff involvement at the front-of-house.'
    },
  ]

  return (
    <div style={{ color: '#0f172a', fontFamily: 'Manrope, system-ui, sans-serif' }} className="min-h-screen bg-transparent overflow-x-hidden selection:bg-orange-200 selection:text-orange-900">

      {/* Google Fonts & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .kx-headline { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .kx-label { font-family: 'Inter', system-ui, sans-serif; }
        @keyframes floatDrift {
          0% { transform: translateY(0) translateX(0) rotate(0deg); }
          50% { transform: translateY(-60vh) translateX(var(--drift)) rotate(180deg); }
          100% { transform: translateY(-130vh) translateX(calc(var(--drift) * -0.5)) rotate(360deg); }
        }
        @keyframes floatNode {
          from { transform: translateY(0px) scale(1); }
          to { transform: translateY(-15px) scale(1.05); }
        }
        @keyframes dataFlowX {
          from { stroke-dashoffset: 1500; }
          to { stroke-dashoffset: -1500; }
        }
        @keyframes dataFlowY {
          from { stroke-dashoffset: 2000; }
          to { stroke-dashoffset: -2000; }
        }
        .animate-data-flow-x {
          animation: dataFlowX 15s linear infinite;
        }
        .animate-data-flow-y {
          animation: dataFlowY 15s linear infinite;
        }
      `}</style>

      {/* Global Animated Background */}
      <SmartKitchenBackground />

      {/* ── Advanced TopNavBar ── */}
      <header
        className={`fixed w-full z-[100] transition-all duration-700 flex justify-center ${scrolled ? 'top-4 px-4' : 'top-0'}`}
      >
        <nav
          className={`relative flex justify-between items-center w-full max-w-7xl mx-auto transition-all duration-500 kx-headline ${scrolled ? 'bg-white/85 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-200/60 rounded-full px-6 py-3' : 'px-8 py-6'}`}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className={`flex items-center justify-center rounded-xl transition-all duration-500 ${scrolled ? 'w-10 h-10 bg-orange-500 shadow-lg shadow-orange-500/30' : 'w-12 h-12 bg-white shadow-xl border border-slate-100'}`}>
              <UtensilsCrossed size={scrolled ? 20 : 24} className={scrolled ? 'text-white' : 'text-orange-500'} />
            </div>
            <span className={`font-bold tracking-tighter transition-all duration-500 ${scrolled ? 'text-xl' : 'text-3xl'}`} style={{ color: '#0f172a' }}>Khaja X</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-1">

            {/* Mega Menu: Platform */}
            <div className="relative" onMouseEnter={() => setActiveMenu('platform')} onMouseLeave={() => setActiveMenu(null)}>
              <button className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full font-medium transition-all ${activeMenu === 'platform' ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                Platform <ChevronDown size={14} className={`transition-transform duration-300 ${activeMenu === 'platform' ? 'rotate-180' : ''}`} />
              </button>
              {activeMenu === 'platform' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[600px] animate-slide-up">
                  <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100 p-6 flex gap-6">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-3 kx-label">Products</p>
                      {[
                        { icon: LayoutDashboard, title: 'Smart POS', desc: 'Next-gen point of sale interface' },
                        { icon: QrCode, title: 'QR Ordering', desc: 'Contactless table service' },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                            <item.icon size={22} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.title}</h4>
                            <p className="text-sm text-slate-500 font-medium font-body">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-px bg-slate-100"></div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-3 kx-label">Operations</p>
                      {[
                        { icon: UtensilsCrossed, title: 'KDS System', desc: 'Intelligent kitchen routing' },
                        { icon: LineChart, title: 'Deep Analytics', desc: 'Real-time financial metrics' },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                            <item.icon size={22} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.title}</h4>
                            <p className="text-sm text-slate-500 font-medium font-body">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a className="px-5 py-2.5 rounded-full font-medium text-slate-600 hover:text-orange-600 hover:bg-slate-50 transition-all" href="#how">How it Works</a>
            <a className="px-5 py-2.5 rounded-full font-medium text-slate-600 hover:text-orange-600 hover:bg-slate-50 transition-all" href="#pricing">Pricing</a>
          </div>

          {/* Actions & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              className="hidden sm:flex items-center gap-2 pl-6 pr-5 py-2.5 rounded-full font-bold transition-all shadow-[0_8px_20px_rgba(249,115,22,0.2)] hover:shadow-[0_10px_25px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 group"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', color: 'white' }}
              onClick={() => navigate('/owner/login')}
            >
              Get Khaja X <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile Drawer */}
        <div
          className={`absolute top-full left-4 right-4 mt-4 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 overflow-hidden transition-all duration-500 origin-top transform ${mobileMenuOpen ? 'scale-y-100 opacity-100 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}
        >
          <div className="flex flex-col gap-2 kx-headline">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 kx-label">Navigation</p>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-orange-50 hover:text-orange-600 font-bold text-slate-800 transition-colors">Platform</a>
            <a href="#how" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-orange-50 hover:text-orange-600 font-bold text-slate-800 transition-colors">How it Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-orange-50 hover:text-orange-600 font-bold text-slate-800 transition-colors">Pricing</a>
          </div>
          <div className="w-full h-px bg-slate-100"></div>
          <div className="flex flex-col gap-3">
            <button
              className="w-full py-4 rounded-xl font-bold text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' }}
              onClick={() => navigate('/owner/login')}
            >Start Free Trial</button>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full" style={{ paddingTop: '5rem' }}>

        {/* ── Hero Section ── */}
        <section className="relative px-8 pt-24 pb-32 max-w-7xl mx-auto overflow-hidden text-center md:text-left">
          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="z-10">
              <span
                className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full text-xs font-bold tracking-widest uppercase mb-8 kx-label shadow-sm"
                style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.1)', color: '#f97316' }}
              >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f97316' }}></div>
                Kitchen Intelligence 2.0
              </span>
              <h1 className="kx-headline text-6xl md:text-7xl font-bold leading-[0.95] tracking-tight mb-8 text-[#0f172a]">
                Your Restaurant, <br />
                <span className="kx-text-gradient">Fully Unleashed.</span>
              </h1>
              <p className="text-xl leading-relaxed max-w-xl mb-10 font-medium" style={{ color: '#475569' }}>
                The ultimate smart kitchen management platform designed for Michelin-star precision and high-volume efficiency.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  className="px-8 py-4 rounded-xl font-bold text-lg hover:-translate-y-1 hover:shadow-2xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', color: 'white', boxShadow: '0 10px 30px rgba(249,115,22,0.2)' }}
                  onClick={() => navigate('/owner/login')}
                >Start Free Trial</button>
                <button
                  className="kx-glass-panel px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:-translate-y-1"
                  style={{ color: '#0f172a' }}
                  onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                >Book a Demo</button>
              </div>
            </div>

            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(15,23,42,0.12)]" style={{ border: '1px solid rgba(0,0,0,0.05)', background: '#ffffff' }}>
                <div className="p-4 flex gap-4 items-center" style={{ background: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                  </div>
                  <div className="text-[10px] kx-label font-bold tracking-widest uppercase" style={{ color: '#94a3b8' }}>Live Dashboard — Kitchen View</div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-4">
                  {/* New Orders */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse"></span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800">New Orders</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-800 text-white ml-auto">4</span>
                    </div>
                    <div className="rounded-xl overflow-hidden shadow-sm flex flex-col flex-1" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
                      <div className="px-3 pt-3 pb-1 flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-900 text-2xl leading-none tracking-tight">12</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">#1024</span>
                          </div>
                          <p className="text-gray-500 text-[10px] font-medium mt-1 truncate">Jane Doe</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] font-mono font-bold text-red-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="material-symbols-outlined opacity-60" style={{ fontSize: '11px' }}>schedule</span>
                            10:05
                          </span>
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 border bg-red-600 text-white border-red-300/40 shadow-sm shadow-red-500/30 rounded">URGENT</span>
                        </div>
                      </div>
                      <div className="mx-3 border-t border-gray-100 mt-2 mb-2"></div>
                      <div className="px-3 pb-2 space-y-1 max-h-20 overflow-hidden">
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-gray-800 text-[11px] font-medium truncate leading-snug"><span className="text-orange-500 font-black mr-1">2×</span>Truffle Risotto</span>
                          <span className="text-gray-400 text-[9px] font-semibold whitespace-nowrap">Rs.2400</span>
                        </div>
                      </div>
                      <div className="px-3 py-2 flex items-center justify-between gap-2 bg-gray-50/50 border-t border-gray-100 mt-auto">
                        <span className="text-gray-900 font-extrabold text-xs">Rs.2400</span>
                        <button className="flex items-center gap-1 text-[9px] font-bold text-white px-2.5 py-1.5 rounded-lg shadow-sm w-full max-w-[80px]" style={{ background: 'linear-gradient(to right, #ea580c, #f97316)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check_circle</span> Accept
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preparing */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800">Preparing</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-800 text-white ml-auto">2</span>
                    </div>
                    <div className="rounded-xl overflow-hidden shadow-sm flex flex-col flex-1" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderLeft: '4px solid #fb923c' }}>
                      <div className="px-3 pt-3 pb-1 flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-900 text-2xl leading-none tracking-tight">8</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">#1022</span>
                          </div>
                          <p className="text-gray-500 text-[10px] font-medium mt-1 truncate">John Smith</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] font-mono font-bold text-amber-500 flex items-center gap-1">
                            <span className="material-symbols-outlined opacity-60" style={{ fontSize: '11px' }}>schedule</span>
                            8m
                          </span>
                        </div>
                      </div>
                      <div className="mx-3 border-t border-gray-100 mt-2 mb-2"></div>
                      <div className="px-3 pb-2 space-y-1 max-h-20 overflow-hidden">
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-gray-800 text-[11px] font-medium truncate leading-snug"><span className="text-orange-500 font-black mr-1">1×</span>Wagyu Ribeye</span>
                          <span className="text-gray-400 text-[9px] font-semibold whitespace-nowrap">Rs.3800</span>
                        </div>
                      </div>
                      <div className="px-3 pt-1 pb-1.5">
                        <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <div className="px-3 py-2 flex items-center justify-between gap-2 bg-gray-50/50 border-t border-gray-100 mt-auto">
                        <span className="text-gray-900 font-extrabold text-xs">Rs.3800</span>
                        <button className="flex items-center justify-center gap-1 text-[9px] font-bold text-white px-2.5 py-1.5 rounded-lg shadow-sm w-full max-w-[80px]" style={{ background: '#059669' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check_circle</span> Serve
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Served */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800">Served</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-800 text-white ml-auto">1</span>
                    </div>
                    <div className="rounded-xl overflow-hidden shadow-sm flex flex-col flex-1" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderLeft: '4px solid #34d399' }}>
                      <div className="px-3 pt-3 pb-1 flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-gray-900 text-2xl leading-none tracking-tight">4</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">#1018</span>
                        </div>
                        <p className="text-gray-500 text-[10px] font-medium mt-1 truncate">Emma W.</p>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check_circle</span> Served Just now
                        </div>
                      </div>
                      <div className="mx-3 border-t border-gray-100 mt-2 mb-2"></div>
                      <div className="px-3 pb-2 space-y-1 max-h-20 overflow-hidden">
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-gray-800 text-[11px] font-medium truncate leading-snug"><span className="text-orange-500 font-black mr-1">1×</span>Lobster Bisque</span>
                          <span className="text-gray-400 text-[9px] font-semibold whitespace-nowrap">Rs.1200</span>
                        </div>
                      </div>
                      <div className="px-3 py-2 flex items-center justify-between gap-2 bg-gray-50/50 border-t border-gray-100 mt-auto">
                        <span className="text-gray-900 font-extrabold text-xs">Rs.1200</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">✓ Done</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative h-56">
                  <img
                    className="w-full h-full object-cover mix-blend-multiply opacity-80 filter contrast-125"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8X_AebDV5QSj-y3oontaAzcr6YvPhovQHxeVfxLMuz_tyZooT7yXp5o7zsCd7jgzqGwwhcjpj6aykiuK7cflzS-eNbBDGKlUbZWnOqRLvfC29lF8rPxhkwp6Dge7LMU0c9ET8FrLr46P-irX_MaXg8DsjQFORJDA1IDVue72_v1oFH92n_Hwusomo1aRNjs4wKwNZn8DJ5igzfWN6-yHgSuVVBoFFwL_b_8wSL4Xm1uJBpTt52gdPfwFhZu-qlHSN8ExFYEcaUx8"
                    alt="Professional chef in kitchen"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social Proof Strip ── */}
        <section className="py-12 relative z-10 bg-white/40 backdrop-blur-3xl shadow-[0_4px_30px_rgb(0,0,0,0.02)] border-y border-white/60">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-wrap justify-center md:justify-between items-center gap-12 group">
              {[
                { end: 500, suffix: '+', label: 'Global Restaurants', decimals: 0 },
                { end: 1.2, suffix: 'M+', label: 'Orders Processed', decimals: 1 },
                { end: 99.9, suffix: '%', label: 'Uptime SLA', decimals: 1 },
                { end: 15, suffix: '%', label: 'Waste Reduction', decimals: 0 },
                { end: 24, suffix: '/7', label: 'Concierge Support', decimals: 0 },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center md:items-start opacity-80 hover:opacity-100 transition-opacity duration-500">
                  <span className="text-4xl font-bold kx-headline tracking-tighter" style={{ color: '#0f172a' }}>
                    <AnimatedCounter end={stat.end} suffix={stat.suffix} decimals={stat.decimals} />
                  </span>
                  <span className="text-[11px] kx-label font-bold uppercase tracking-widest mt-1" style={{ color: '#64748b' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features Bento Grid ── */}
        <section id="features" className="py-32 px-8 max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="kx-headline text-5xl md:text-6xl font-bold mb-6 tracking-tight text-[#0f172a]">
              Master Every <span className="kx-text-gradient">Service.</span>
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-[#475569]">A suite of surgical-grade tools designed to eliminate chaos and maximize culinary output in high-performance environments.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* QR Ordering */}
            <div className="md:col-span-4 bg-white/60 backdrop-blur-2xl rounded-[2rem] p-10 flex flex-col justify-between hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 group relative overflow-hidden text-[#0f172a]" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-8 text-[#f97316]">
                  <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                </div>
                <h3 className="kx-headline text-2xl font-bold mb-4">Contactless QR Ordering</h3>
                <p className="text-[#475569] leading-relaxed">Each table gets a unique QR code. Guests scan, browse your live menu, and place their order instantly — no app required. Orders flow straight to the kitchen the moment they submit.</p>
              </div>
              <div className="mt-10 pt-8 relative z-10" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <button
                  className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 group-hover:gap-4 transition-all"
                  style={{ color: '#f97316' }}
                  onClick={() => navigate('/owner/login')}
                >Explore Feature <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
              </div>
            </div>
            {/* KDS */}
            <div className="md:col-span-8 bg-[#0f172a]/95 backdrop-blur-2xl rounded-[2rem] p-10 relative overflow-hidden group hover:shadow-2xl transition-all duration-500" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="relative z-10 max-w-md text-white">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 text-white">
                  <span className="material-symbols-outlined text-3xl">restaurant</span>
                </div>
                <h3 className="kx-headline text-3xl font-bold mb-4">Smart Kitchen Display (KDS)</h3>
                <p className="leading-relaxed mb-10 text-slate-300">Every incoming order appears on a dedicated kitchen screen in real time. Color-coded by status — New, Preparing, Ready — so your kitchen team always knows exactly what to work on next.</p>
                <div className="flex flex-wrap gap-4">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 bg-white/5">Real-Time Orders</span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 bg-white/5">Color-Coded Status</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 top-0 w-1/2 translate-x-10 translate-y-10 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-700">
                <img
                  className="h-full w-full object-cover rounded-tl-3xl shadow-2xl opacity-80"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgTbWJ01XIb-jjpwuRo_V1yJWHQk7kGDSGkgm09mnh2PFih5_rxGBTqtWIUxVADxziej7vFcjHNomQhLwDZP-lvZYbOJXYrKj25xPrhn440UcdZlHQzj00rDYyVzlpxXd7vnL9bjnkYttfl1DOLOTUVqAEnODt9rY4vtvVUjdG77Ues3Ud-2gNBgl92jWrL6abkyHPP3fXNKuwee2PJ2RwKOmwBmfhQH0tQ5sLYwnc2UV8YW82HCeYBzJbUZFgL7C6TKOQFXbJcRI"
                  alt="Kitchen display system"
                />
              </div>
            </div>
            {/* Analytics */}
            <div className="md:col-span-8 bg-white/60 backdrop-blur-2xl rounded-[2rem] p-10 flex items-center gap-12 group hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-8 text-[#f97316]">
                  <span className="material-symbols-outlined text-3xl">monitoring</span>
                </div>
                <h3 className="kx-headline text-3xl font-bold mb-4 text-[#0f172a]">Owner Dashboard & Analytics</h3>
                <p className="text-[#475569] leading-relaxed">One dashboard covers everything — live orders, revenue, menu management, QR code generation, staff records, and support. Everything your restaurant needs, in one place.</p>
              </div>
              <div className="hidden md:flex items-end gap-3 h-40">
                {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="w-10 rounded-t-xl relative overflow-hidden transition-all duration-1000 group-hover:scale-y-110 origin-bottom" style={{ background: '#f1f5f9', height: `${h}%` }}>
                    <div className="absolute bottom-0 w-full rounded-t-xl transition-all duration-700" style={{ height: i === 5 ? '100%' : '0%', background: 'linear-gradient(to top, #f97316, #fdba74)' }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Security */}
            <div className="md:col-span-4 bg-white/60 backdrop-blur-2xl rounded-[2rem] p-10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-8 text-[#f97316]">
                <span className="material-symbols-outlined text-3xl">security</span>
              </div>
              <h3 className="kx-headline text-2xl font-bold mb-4 text-[#0f172a]">Role-Based Access</h3>
              <p className="text-[#475569] leading-relaxed">Separate login portals for Owners, Kitchen Staff, and Central Admins. Every role sees only what they need — keeping your data secure and your team focused.</p>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how" className="py-32 relative overflow-hidden z-10 bg-white/40 backdrop-blur-3xl border-y border-white/60 shadow-lg">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50/30 skew-x-12 translate-x-32 hidden lg:block"></div>
          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div>
                <h2 className="kx-headline text-5xl md:text-6xl font-bold mb-8 text-[#0f172a] tracking-tight">From Chaos to <br /><span className="kx-text-gradient">Core Logic.</span></h2>
                <p className="mb-12 text-lg text-[#475569]">Getting your restaurant onto Khaja X is a matter of hours, not weeks. Our specialist engineering team handles the heavy lifting.</p>
                <div className="space-y-12">
                  {[
                    { num: '1', title: 'Set Up Your Menu', desc: 'Log into the Owner Dashboard and add your menu items, categories, prices, and photos. Your live digital menu is ready for customers in minutes.' },
                    { num: '2', title: 'Generate Table QR Codes', desc: 'Create unique QR codes per table right from your Owner Dashboard. Print and place them — customers can start ordering immediately.' },
                    { num: '3', title: 'Orders Flow in Real Time', desc: 'Customers scan the QR, browse your live menu, and place their order. It appears on your Kitchen Display and Owner Dashboard instantly.' },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-6 relative group">
                      {i < 2 && <div className="absolute left-6 top-14 bottom-[-40px] w-0.5 hidden md:block bg-slate-200" />}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white z-10 kx-headline flex-shrink-0 text-lg transition-transform group-hover:scale-110 shadow-lg shadow-orange-200"
                        style={i === 0 ? { background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' } : { background: '#ffffff', border: '2px solid #e2e8f0', color: '#0f172a', boxShadow: 'none' }}
                      >{step.num}</div>
                      <div className="pt-2">
                        <h4 className="text-xl font-bold mb-2 text-[#0f172a]">{step.title}</h4>
                        <p className="text-[#475569] leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-orange-50 rounded-3xl -rotate-3 transition-transform hover:rotate-0 duration-500 hidden md:block"></div>
                <img
                  className="relative rounded-3xl w-full h-[600px] object-cover shadow-2xl transition-all duration-700 group-hover:scale-[1.02]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9MsNE5QLpjorXyiyrmQDqVI3t_QNMPccmtzsg9QIHoAOw6e-e1KvYu4KtyoANs0Q702LqlvAL742YSNKorjKLTqZSOChiwQBKl9OTKrGEj0aG9CKLutgj9DEt5TFLp-bd7ywXikeDyj6tlyyHw8zHY_c_9xv65psT1kAuKtYo8zamx_zuTW8NtUjm8GrzZPdgplaK0QUGj31PCa2fMj_Do4aUXaZGN51_V1qHHfwBmcSS1cSfpuRYHu7VGOPSv19GNMt3HYBZDbI"
                  alt="Luxury restaurant interior"
                />
                <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-3xl hidden md:block max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100">
                  <div className="text-orange-500 mb-4 scale-150 transform origin-top-left font-serif">"</div>
                  <p className="kx-headline font-medium text-lg text-[#0f172a] leading-snug relative z-10">The transition was seamless. We went live during Friday dinner rush without a single missed ticket.</p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-800">CM</div>
                    <div>
                      <p className="text-xs font-bold uppercase text-[#0f172a]">Chef Marco</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#64748b]">L'Elite, Paris</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-32 px-8 max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="kx-headline text-5xl md:text-6xl font-bold mb-6 tracking-tight text-[#0f172a]">Precision <span className="kx-text-gradient">Pricing.</span></h2>
            <p className="text-lg text-[#475569] max-w-2xl mx-auto">Enterprise-grade architecture with transparent models that scale from emerging pop-ups to global hospitality chains.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-white p-10 rounded-[2rem] flex flex-col hover:shadow-2xl transition-all duration-500 border border-slate-100">
              <h3 className="kx-headline text-2xl font-bold mb-2 text-[#0f172a]">Starter</h3>
              <p className="text-[#475569] mb-8 h-12">Perfect for single locations and concept testing.</p>
              <div className="flex items-baseline gap-2 mb-10 pb-10 border-b border-slate-100">
                <span className="text-5xl kx-headline font-bold text-[#0f172a]">$49</span><span className="font-medium text-[#64748b]">/mo</span>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {['QR Ordering (Up to 10 tables)', 'Kitchen Display System (KDS)', 'Owner Dashboard', 'QR Code Generator', 'Email Support'].map((f, i) => (
                  <li key={i} className="flex gap-4 text-[#0f172a] font-medium">
                    <span className="material-symbols-outlined text-[#10b981]">check_circle</span>{f}
                  </li>
                ))}
                {['Order History & Analytics', 'Central Admin (Multi-Branch)', 'Staff Management'].map((f, i) => (
                  <li key={i} className="flex gap-4 text-[#94a3b8] font-medium">
                    <span className="material-symbols-outlined text-slate-300">cancel</span>{f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full py-4 rounded-xl font-bold transition-colors hover:bg-slate-50 text-[#0f172a] border-2 border-slate-200"
                onClick={() => navigate('/owner/login')}
              >Select Starter</button>
            </div>
            {/* Growth */}
            <div className="relative group lg:-mt-8 lg:mb-8">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-orange-500 to-orange-600 shadow-2xl flex flex-col pt-1 z-0"></div>
              <div className="relative h-full bg-white p-10 rounded-[2rem] flex flex-col border border-orange-100 shadow-[0_20px_50px_rgba(249,115,22,0.1)] z-10 transform scale-100 lg:scale-[1.02]">
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-lg kx-label whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' }}
                >Most Popular</div>
                <h3 className="kx-headline text-2xl font-bold mb-2 text-[#f97316]">Growth</h3>
                <p className="text-[#475569] mb-8 h-12">The comprehensive suite for high-volume, dynamic kitchens.</p>
                <div className="flex items-baseline gap-2 mb-10 pb-10 border-b border-orange-100">
                  <span className="text-5xl kx-headline font-bold text-[#0f172a]">$129</span><span className="font-medium text-[#64748b]">/mo</span>
                </div>
                <ul className="space-y-5 mb-12 flex-1">
                  {['Unlimited Tables & QR Codes', 'Kitchen Display System (KDS)', 'Owner Dashboard & Analytics', 'Order History & Revenue Reports', 'Staff Management', 'Menu Management', 'Priority Support'].map((f, i) => (
                    <li key={i} className="flex gap-4 text-[#0f172a] font-medium">
                      <span className="material-symbols-outlined text-[#f97316]">check_circle</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-4.5 rounded-xl font-bold shadow-xl hover:-translate-y-1 transition-all text-white text-lg"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' }}
                  onClick={() => navigate('/owner/login')}
                >Get Started Now</button>
              </div>
            </div>
            {/* Enterprise */}
            <div className="bg-white p-10 rounded-[2rem] flex flex-col hover:shadow-2xl transition-all duration-500 border border-slate-100">
              <h3 className="kx-headline text-2xl font-bold mb-2 text-[#0f172a]">Enterprise</h3>
              <p className="text-[#475569] mb-8 h-12">Tailored engineering for large hospitality groups and franchises.</p>
              <div className="flex items-baseline gap-2 mb-10 pb-10 border-b border-slate-100">
                <span className="text-5xl kx-headline font-bold text-[#0f172a]">Custom</span>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {['Everything in Growth', 'Central Admin Dashboard', 'Multi-Branch Management', 'Super Admin Panel Access', 'Global Order Monitoring', 'Dedicated Support & Onboarding'].map((f, i) => (
                  <li key={i} className="flex gap-4 text-[#0f172a] font-medium">
                    <span className="material-symbols-outlined text-[#0f172a]">check_circle</span>{f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full py-4 rounded-xl font-bold transition-colors hover:bg-slate-50 text-[#0f172a] border-2 border-slate-200"
                onClick={() => navigate('/contact')}
              >Contact Sales</button>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-32 bg-slate-50/40 backdrop-blur-3xl border-y border-white/60 relative z-10">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid md:grid-cols-2 gap-16 mb-20 items-end">
              <h2 className="kx-headline text-5xl md:text-6xl font-bold leading-tight text-[#0f172a] tracking-tight">Trusted by <br />Culinary <span className="kx-text-gradient">Innovators.</span></h2>
              <p className="text-lg text-[#475569] max-w-sm">From street food pioneers to Michelin-star masters, Khaja X is the silent partner in every structurally perfect service.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { initials: 'JS', name: 'Julian Sterling', role: 'Director, Neon Bistro', quote: '"The real-time analytics changed how we staff our shifts. We\'ve saved $4k/month in labor costs alone. Incredible ROI from day one."' },
                { initials: 'AK', name: 'Anya Kovic', role: 'Executive Chef, Slate', quote: '"Khaja X is the first tech platform that actually understands the kitchen flow. It\'s built with genuine empathy for chefs, rarely seen in POS systems."' },
                { initials: 'TH', name: 'Thomas Hayes', role: 'Owner, The Roost', quote: '"Deployment was incredibly fast. We were up and running in 48 hours without friction. Our entire front-of-house staff loves the interface."' },
              ].map((t, i) => (
                <div key={i} className="bg-white p-10 rounded-3xl shadow-xl hover:-translate-y-2 transition-transform duration-500" style={{ borderTop: '4px solid #f97316' }}>
                  <div className="flex gap-1 mb-8 text-amber-400">
                    {[...Array(5)].map((_, si) => (
                      <span key={si} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed mb-10 text-[#0f172a] font-medium tracking-tight h-32">{t.quote}</p>
                  <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md bg-slate-900">{t.initials}</div>
                    <div>
                      <h5 className="font-bold text-[#0f172a]">{t.name}</h5>
                      <p className="text-[10px] kx-label font-bold uppercase tracking-widest text-[#64748b]">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-32 max-w-3xl mx-auto px-8 relative z-10">
          <h2 className="kx-headline text-4xl md:text-5xl font-bold mb-16 text-center text-[#0f172a]">Frequently <span className="kx-text-gradient">Asked.</span></h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => <FaqItem key={i} question={faq.question} answer={faq.answer} />)}
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="py-32 bg-white/40 backdrop-blur-3xl border-y border-white/60 relative z-10">
          <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-20">
            <div>
              <h2 className="kx-headline text-5xl md:text-6xl font-bold mb-6 text-[#0f172a] tracking-tight">Talk to a <span className="kx-text-gradient">Consultant.</span></h2>
              <p className="mb-12 text-lg text-[#475569]">Learn how Khaja X can specifically optimize and scale your unique kitchen workflow.</p>
              <div className="space-y-6">
                {[
                  { icon: 'mail', label: 'Email Us', value: 'concierge@khajax.com', bg: 'bg-orange-50', color: 'text-orange-600' },
                  { icon: 'chat', label: 'WhatsApp Support', value: '+1 (555) KHAJA-X', bg: 'bg-emerald-50', color: 'text-emerald-600' },
                  { icon: 'location_on', label: 'Global HQ', value: '144 Silicon Alley, New York, NY', bg: 'bg-slate-100', color: 'text-slate-600' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-6 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}>
                      <span className="material-symbols-outlined text-2xl">{c.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs kx-label font-bold uppercase tracking-widest text-[#64748b]">{c.label}</p>
                      <p className="font-bold text-lg text-[#0f172a] mt-1">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 p-10 md:p-12 rounded-[2rem] border border-slate-200 shadow-xl">
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-6">
                  {['First Name', 'Last Name'].map((label, i) => (
                    <div key={i} className="space-y-2">
                      <label className="text-xs kx-label font-bold uppercase tracking-widest text-[#64748b]">{label}</label>
                      <input
                        className="w-full rounded-xl px-4 py-3.5 outline-none bg-white border border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all text-[#0f172a] shadow-sm"
                        placeholder={i === 0 ? 'John' : 'Doe'}
                        type="text"
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-xs kx-label font-bold uppercase tracking-widest text-[#64748b]">Restaurant Name</label>
                  <input className="w-full rounded-xl px-4 py-3.5 outline-none bg-white border border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all text-[#0f172a] shadow-sm" placeholder="The Culinary Lab" type="text" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs kx-label font-bold uppercase tracking-widest text-[#64748b]">Email Address</label>
                  <input className="w-full rounded-xl px-4 py-3.5 outline-none bg-white border border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all text-[#0f172a] shadow-sm" placeholder="john@restaurant.com" type="email" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs kx-label font-bold uppercase tracking-widest text-[#64748b]">How can we help?</label>
                  <textarea className="w-full rounded-xl px-4 py-3.5 outline-none resize-none bg-white border border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all text-[#0f172a] shadow-sm" placeholder="Tell us about your challenges..." rows={4} />
                </div>
                <button
                  className="w-full py-4 rounded-xl font-bold text-lg hover:shadow-[0_10px_30px_rgba(249,115,22,0.2)] hover:-translate-y-0.5 transition-all text-white mt-4"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' }}
                  type="submit"
                >Submit Inquiry</button>
              </form>
            </div>
          </div>
        </section>

        {/* ── Final CTA Banner ── */}
        <section className="py-32 px-8 max-w-7xl mx-auto relative z-10">
          <div className="relative rounded-[3rem] overflow-hidden p-16 md:p-24 text-center bg-slate-900 shadow-2xl">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top right, rgba(249,115,22,0.15), transparent, rgba(249,115,22,0.1))' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10">
              <h2 className="kx-headline text-5xl md:text-7xl font-bold mb-8 text-white tracking-tight">Ready to <span className="kx-text-gradient">Elevate</span> Your Kitchen?</h2>
              <p className="text-xl mb-12 max-w-2xl mx-auto text-slate-300">Join the 500+ restaurants already dominating their market with Khaja X intelligence architecture.</p>
              <div className="flex flex-wrap justify-center gap-6">
                <button
                  className="px-10 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-transform text-white"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', boxShadow: '0 10px 40px rgba(249,115,22,0.4)' }}
                  onClick={() => navigate('/owner/login')}
                >Get Started Now</button>
                <button
                  className="px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/10 transition-all border border-white/20 text-white backdrop-blur-md"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >Compare Plans</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Advanced Professional Footer ── */}
      <footer className="bg-white/60 backdrop-blur-3xl border-t border-white/60 relative z-10 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-400/10 blur-[120px] rounded-t-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-8 pt-24 pb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">

            {/* Brand & Newsletter Column */}
            <div className="col-span-1 lg:col-span-4 pr-0 lg:pr-12">
              <div className="flex items-center gap-3 mb-8 cursor-pointer group w-max" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <UtensilsCrossed size={20} />
                </div>
                <span className="text-2xl font-black tracking-tighter text-[#0f172a] group-hover:text-orange-600 transition-colors">Khaja X</span>
              </div>
              <p className="text-[#475569] font-medium text-lg leading-relaxed mb-8">
                The definitive standard for kitchen intelligence. Designed for Michelin-star precision and immense volume.
              </p>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Subscribe for Updates</label>
                <div className="relative group/input">
                  <input
                    type="email"
                    placeholder="name@restaurant.com"
                    className="w-full bg-white/60 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 pr-14 outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all font-medium placeholder-slate-400 shadow-sm"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors outline-none shadow-sm group-hover/input:bg-orange-500">
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Links Columns */}
            {[
              {
                title: 'Features',
                links: [
                  { label: 'QR Table Ordering', href: '#features' },
                  { label: 'Kitchen Display (KDS)', href: '#features' },
                  { label: 'Owner Analytics', href: '#features' },
                  { label: 'Menu Management', href: '#how' },
                  { label: 'Order Tracking', href: '#how' },
                ]
              },
              {
                title: 'Access Portals',
                links: [
                  { label: 'Owner Login', href: '/owner/login' },
                  { label: 'Kitchen Staff Login', href: '/kitchen/login' },
                  { label: 'Central Admin', href: '/central' },
                  { label: 'Browse Menu', href: '/menu' },
                  { label: 'Start Free Trial', href: '/owner/login' },
                ]
              },
              {
                title: 'Company',
                links: [
                  { label: 'How It Works', href: '#how' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'Testimonials', href: '#' },
                  { label: 'Contact Us', href: '#contact' },
                  { label: 'FAQs', href: '#' },
                ]
              },
            ].map((col, i) => (
              <div key={i} className="col-span-1 lg:col-span-2 lg:ml-auto">
                <h5 className="font-bold mb-8 text-[#0f172a] uppercase tracking-widest text-xs border-b border-slate-200/60 pb-4 inline-block">{col.title}</h5>
                <ul className="space-y-4">
                  {col.links.map((link, li) => (
                    <li key={li} className="group flex items-center">
                      <ChevronRight size={12} className="text-orange-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out" />
                      <a href={link.href} className="font-medium text-[#64748b] group-hover:text-[#f97316] group-hover:translate-x-2 transition-all duration-300 ease-out inline-block">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-[#64748b] font-medium">
              <span>© 2026 Khaja X.</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span>All rights reserved.</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1">Smart Restaurant Platform <Flame size={14} className="text-orange-500 ml-1" /></span>
            </div>

            {/* Quick portal links */}
            <div className="flex items-center gap-3">
              <a href="/owner/login" className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100">Owner Portal</a>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <a href="/kitchen/login" className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100">Kitchen Login</a>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <a href="#contact" className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100">Contact</a>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {[
                { name: 'Website', icon: Globe },
                { name: 'Community', icon: MessageCircle },
                { name: 'Contact', icon: Mail }
              ].map((item, i) => (
                <a
                  key={i}
                  href="#"
                  title={item.name}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(249,115,22,0.3)] transition-all duration-300"
                >
                  <item.icon size={18} strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
