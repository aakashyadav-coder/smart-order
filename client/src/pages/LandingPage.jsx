/**
 * LandingPage.jsx — Khaja X Marketing Landing Page
 * Premium dark-mode landing page using Obsidian Platinum design system
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  QrCode, LayoutDashboard, BarChart3, UtensilsCrossed,
  ShieldCheck, Zap, ArrowRight, Star, CheckCircle2, ChevronDown,
  Clock, Users, TrendingUp, Wifi, Menu, X, Play, Sparkles,
  Bell, Package, ChefHat, HandPlatter, Globe, Lock,
  Mail, Phone, MapPin, Send, MessageSquare,
} from 'lucide-react'

// ── Animated Counter Hook ──────────────────────────────────────────────────
function useCounter(target, duration = 2000, startOnVisible = true) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!startOnVisible) { setStarted(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [startOnVisible])

  useEffect(() => {
    if (!started) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [started, target, duration])

  return { count, ref }
}

// ── Section Fade-In Hook ───────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

// ── FAQ Item ───────────────────────────────────────────────────────────────
function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="border border-white/10 rounded-2xl overflow-hidden transition-all duration-300"
      style={{ background: open ? 'rgba(225,29,72,0.06)' : 'rgba(255,255,255,0.03)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
        aria-expanded={open}
        id={`faq-btn-${index}`}
      >
        <span className="font-semibold text-white/90 text-[15px] group-hover:text-white transition-colors">
          {question}
        </span>
        <ChevronDown
          className="w-5 h-5 text-brand-400 flex-shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '300px' : '0px', opacity: open ? 1 : 0 }}
      >
        <p className="px-6 pb-5 text-sm text-white/55 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

// ── Mock Order Card ────────────────────────────────────────────────────────
function MockOrderCard({ id, table, items, status, delay }) {
  const statusColors = {
    new: { bg: 'rgba(225,29,72,0.18)', border: 'rgba(225,29,72,0.4)', text: '#f87171', label: 'New' },
    preparing: { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', label: 'Preparing' },
    ready: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', text: '#4ade80', label: 'Ready' },
  }
  const s = statusColors[status]
  return (
    <div
      className="rounded-xl p-3.5 text-left animate-fade-in"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-white/80">Table {table}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.border, color: s.text }}>
          {s.label}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <p key={i} className="text-xs text-white/50">• {item}</p>
        ))}
      </div>
      <p className="text-[10px] text-white/30 mt-2">#{id} · just now</p>
    </div>
  )
}

// ── Main Landing Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Stats counters
  const orders = useCounter(1200000, 2200)
  const restaurants = useCounter(500, 1800)
  const uptime = useCounter(99.9, 1600)
  const avgTime = useCounter(45, 1400)

  // Section fades
  const featuresFade = useFadeIn()
  const howFade = useFadeIn()
  const statsFade = useFadeIn()
  const pricingFade = useFadeIn()
  const testimonialFade = useFadeIn()
  const faqFade = useFadeIn()
  const contactFade = useFadeIn()

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ]

  const features = [
    {
      icon: <QrCode className="w-6 h-6" />,
      title: 'QR Table Ordering',
      desc: 'Customers scan, browse, and order from their phones. Zero wait staff bottleneck.',
      accent: '#e11d48',
    },
    {
      icon: <LayoutDashboard className="w-6 h-6" />,
      title: 'Real-Time Kitchen Display',
      desc: 'Live order board for your kitchen team. New orders pop instantly with urgency alerts.',
      accent: '#f59e0b',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Owner Analytics',
      desc: 'Revenue charts, bestseller insights, and peak-hour data in one clean dashboard.',
      accent: '#06b6d4',
    },
    {
      icon: <UtensilsCrossed className="w-6 h-6" />,
      title: 'Smart Menu Builder',
      desc: 'Add, edit, and categorize items with images, pricing, and availability toggles.',
      accent: '#8b5cf6',
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: 'Multi-Role Access',
      desc: 'Separate portals for Owners, Kitchen Staff, and Super Admins with JWT auth.',
      accent: '#10b981',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Notifications',
      desc: 'Real-time WebSocket push for every new order, update, and kitchen action.',
      accent: '#f43f5e',
    },
  ]

  const steps = [
    {
      num: '01',
      icon: <QrCode className="w-8 h-8 text-brand-400" />,
      title: 'Set Up Your Restaurant',
      desc: 'Sign up, add your menu items with photos and prices, and configure your restaurant profile in minutes.',
    },
    {
      num: '02',
      icon: <HandPlatter className="w-8 h-8 text-amber-400" />,
      title: 'Generate QR Codes',
      desc: 'Print unique QR codes for each table. Customers scan to instantly access your digital menu.',
    },
    {
      num: '03',
      icon: <ChefHat className="w-8 h-8 text-emerald-400" />,
      title: 'Watch Orders Flow In',
      desc: 'Your kitchen display lights up in real-time. Track, manage, and complete orders seamlessly.',
    },
  ]

  const pricing = [
    {
      name: 'Starter',
      price: 'Free',
      sub: 'Forever',
      desc: 'Perfect for small cafes just getting started.',
      features: ['1 Restaurant', 'Up to 20 menu items', 'QR ordering', 'Basic analytics', 'Email support'],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Growth',
      price: 'NPR 2,499',
      sub: 'per month',
      desc: 'For restaurants ready to scale their operations.',
      features: ['3 Restaurants', 'Unlimited menu items', 'QR ordering', 'Advanced analytics', 'Real-time notifications', 'Priority support', 'Custom branding'],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      sub: 'tailored plan',
      desc: 'For large chains and franchise operations.',
      features: ['Unlimited Restaurants', 'Unlimited everything', 'Super admin portal', 'Dedicated support', 'SLA guarantee', 'Custom integrations', 'On-site training'],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ]

  const testimonials = [
    {
      name: 'Raj Shrestha',
      restaurant: 'Himalayan Bites, Thamel',
      quote: 'Khaja X cut our order errors by 80%. The kitchen display is a game-changer — my team loves it.',
      rating: 5,
      initials: 'RS',
    },
    {
      name: 'Sita Maharjan',
      restaurant: 'Café Patan, Lalitpur',
      quote: "Setup took 20 minutes. Now our customers order themselves and I've actually reduced my waiting staff.",
      rating: 5,
      initials: 'SM',
    },
    {
      name: 'Bikash Thapa',
      restaurant: "Thapa's Kitchen, Pokhara",
      quote: 'The analytics dashboard showed me my peak hours. I restructured staffing and increased revenue by 30%.',
      rating: 5,
      initials: 'BT',
    },
  ]

  const faqs = [
    {
      question: 'How do customers place orders?',
      answer: 'Customers scan the QR code on their table using any smartphone camera. This opens your restaurant\'s digital menu directly — no app download required. They select items, customize their order, and submit. It\'s instant.',
    },
    {
      question: 'Do I need special hardware for the kitchen display?',
      answer: 'No. The kitchen display works on any device with a browser — tablet, laptop, TV with a connected device. We recommend a dedicated tablet or monitor for the best experience, but it\'s not required.',
    },
    {
      question: 'How do I update my menu items?',
      answer: 'From your Owner Dashboard, go to Menu Management. You can add items, update prices, toggle availability, and upload photos in real-time. Changes reflect instantly on the customer-facing menu.',
    },
    {
      question: 'Is there a free trial for the Growth plan?',
      answer: 'Yes! We offer a 14-day free trial for the Growth plan with no credit card required. You get access to all features and can cancel anytime.',
    },
    {
      question: 'How secure is my data?',
      answer: 'All data is encrypted in transit (TLS 1.3) and at rest. We use JWT-based authentication with refresh token rotation, rate limiting, and role-based access control across all portals.',
    },
    {
      question: 'Can I have multiple restaurants under one account?',
      answer: 'Yes, on the Growth and Enterprise plans. Each restaurant gets its own menu, QR codes, kitchen display, and analytics. The Super Admin portal gives you a unified view across all locations.',
    },
  ]

  return (
    <div className="landing-page min-h-screen bg-[#070810] text-white overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(7,8,16,0.92)' : 'transparent',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-400 shadow-lg group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-landing font-bold text-lg text-white tracking-tight">Khaja X</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/5 border border-white/10 text-sm"
              onClick={() => navigate('/kitchen/login')}
            >
              Kitchen Login
            </Button>
            <Button
              className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-lg shadow-brand-500/20 border-0 text-sm font-semibold"
              onClick={() => navigate('/owner/login')}
            >
              Owner Login <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/08 bg-[#07081099] backdrop-blur-xl px-6 py-4 space-y-1">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 space-y-2 border-t border-white/08">
              <Button
                variant="outline"
                className="w-full border-white/10 bg-transparent text-white/70 hover:text-white hover:bg-white/5"
                onClick={() => navigate('/kitchen/login')}
              >
                Kitchen Login
              </Button>
              <Button
                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white border-0"
                onClick={() => navigate('/owner/login')}
              >
                Owner Login
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
        {/* Aurora mesh background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 50% at 10% -10%, rgba(225,29,72,0.22) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 90% 0%, rgba(99,38,210,0.18) 0%, transparent 55%),
              radial-gradient(ellipse 50% 60% at 50% 100%, rgba(14,116,144,0.12) 0%, transparent 60%),
              #070810
            `
          }} />
          {/* Animated orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.4), transparent 70%)', animationDuration: '4s' }} />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(99,38,210,0.4), transparent 70%)', animationDuration: '5s', animationDelay: '1.5s' }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }} />
        </div>

        {/* ── Two-column layout ── */}
        <div className="relative w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

          {/* Left col — copy */}
          <div className="flex flex-col items-start text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Now serving 500+ restaurants across Nepal</span>
            </div>

            {/* Headline */}
            <h1 className="font-landing text-5xl sm:text-6xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6 animate-slide-up">
              Your Restaurant,{' '}
              <br className="hidden sm:block" />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-400 via-rose-400 to-brand-500 bg-clip-text text-transparent">
                  Fully Unleashed.
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-lg sm:text-xl text-white/55 max-w-lg mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '150ms' }}>
              Stop juggling paper tickets and shouting across the kitchen.
              Khaja X brings QR ordering, live kitchen display, and owner
              analytics into one obsidian-dark command center.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-xl shadow-brand-500/30 border-0 text-base font-semibold px-7 py-3 h-auto animate-glow"
                onClick={() => navigate('/owner/login')}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 text-base font-semibold px-7 py-3 h-auto backdrop-blur-sm"
                onClick={() => navigate('/menu')}
              >
                <Play className="w-4 h-4 fill-white stroke-none" />
                See Live Menu
              </Button>
            </div>

            {/* Trust row */}
            <div className="mt-10 flex items-center gap-6 animate-fade-in" style={{ animationDelay: '350ms' }}>
              <div className="flex -space-x-2">
                {['RS', 'SM', 'BT', 'NK'].map((init, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#070810] bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-[10px] font-bold text-white">
                    {init}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-white/40 text-xs">Trusted by 500+ restaurant owners</p>
              </div>
            </div>
          </div>

          {/* Right col — dashboard preview */}
          <div className="relative animate-float hidden lg:block">
            {/* Glow ring */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-600/30 via-purple-500/20 to-cyan-500/20 blur-xl opacity-60" />
            <div
              className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, #0f1117 0%, #0b0d14 100%)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Fake topbar */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/06"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 flex items-center justify-center gap-2">
                  <div className="h-5 w-48 rounded-md bg-white/05 flex items-center justify-center">
                    <span className="text-[10px] text-white/30 font-mono">khajax.app/kitchen</span>
                  </div>
                </div>
                <Bell className="w-4 h-4 text-brand-400 animate-pulse-dot" />
              </div>

              {/* Kitchen display columns */}
              <div className="grid grid-cols-3 gap-3 p-4">
                {/* New Orders */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-dot" />
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">New</span>
                    <span className="ml-auto text-xs bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full font-bold">3</span>
                  </div>
                  <MockOrderCard id="1042" table="4" items={['Momo ×2', 'Chiya ×1']} status="new" delay={0} />
                  <MockOrderCard id="1043" table="7" items={['Thakali Set ×3', 'Lassi ×2']} status="new" delay={150} />
                  <MockOrderCard id="1044" table="2" items={['Buff Burger ×1']} status="new" delay={300} />
                </div>

                {/* Preparing */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-dot" />
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Preparing</span>
                    <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">2</span>
                  </div>
                  <MockOrderCard id="1040" table="6" items={['Dal Bhat ×2', 'Achar']} status="preparing" delay={100} />
                  <MockOrderCard id="1041" table="1" items={['Pizza ×1', 'Coke ×2']} status="preparing" delay={250} />
                </div>

                {/* Ready */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Ready</span>
                    <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">1</span>
                  </div>
                  <MockOrderCard id="1039" table="3" items={['Chowmein ×2', 'Juice ×1']} status="ready" delay={200} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Social Proof Strip ─────────────────────────────────────────── */}
      <div className="py-10 border-y border-white/05 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="landing-marquee-track flex gap-12 w-max">
          {[...Array(2)].map((_, gi) => (
            <div key={gi} className="flex gap-12 items-center flex-shrink-0">
              {[
                { label: '500+ Restaurants', icon: <Globe className="w-4 h-4" /> },
                { label: '1M+ Orders Placed', icon: <Package className="w-4 h-4" /> },
                { label: '4.9★ Average Rating', icon: <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> },
                { label: '99.9% Uptime', icon: <Wifi className="w-4 h-4" /> },
                { label: 'Bank-Grade Security', icon: <Lock className="w-4 h-4" /> },
                { label: 'Real-Time Orders', icon: <Zap className="w-4 h-4" /> },
                { label: '24/7 Support', icon: <Users className="w-4 h-4" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-white/40 text-sm font-medium whitespace-nowrap">
                  <span className="text-brand-500">{item.icon}</span>
                  {item.label}
                  {i < 6 && <Separator orientation="vertical" className="h-4 bg-white/10 mx-4" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section
        id="features"
        ref={featuresFade.ref}
        className={`py-24 px-6 max-w-7xl mx-auto transition-all duration-700 ${featuresFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-brand-500/10 text-brand-300 border-brand-500/20 hover:bg-brand-500/15">
            What's Inside
          </Badge>
          <h2 className="font-landing text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Built for the chaos of{' '}
            <span className="bg-gradient-to-r from-brand-400 to-rose-400 bg-clip-text text-transparent">
              a real kitchen.
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Every feature was designed by watching how restaurants actually work —
            not how a product team assumes they do.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Card
              key={i}
              className="group relative overflow-hidden border-white/08 hover:border-white/15 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset',
                animationDelay: `${i * 80}ms`,
              }}
            >
              {/* Accent top line */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: f.accent }} />
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(400px circle at 50% 0%, ${f.accent}12, transparent 70%)` }} />

              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}30`, color: f.accent }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section
        id="how"
        ref={howFade.ref}
        className={`py-24 px-6 transition-all duration-700 ${howFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500/10 text-amber-300 border-amber-500/20">
              Three Steps. That's It.
            </Badge>
            <h2 className="font-landing text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              From signup to{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                first order in 20 min.
              </span>
            </h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto">
              No dev team, no onboarding call, no week-long setup.
              If you've ever printed a menu, you can deploy Khaja X.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting dashes (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px border-t-2 border-dashed border-white/10" />

            {steps.map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Number badge */}
                <div className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 z-10 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}
                >
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center">
                    {step.num.slice(1)}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-xl mb-3">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white border-0 shadow-lg shadow-brand-500/20 font-semibold"
              onClick={() => navigate('/owner/login')}
            >
              Start Setting Up <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats Counters ─────────────────────────────────────────────── */}
      <section
        ref={statsFade.ref}
        className={`py-20 px-6 transition-all duration-700 ${statsFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Orders Processed', value: orders.count, ref: orders.ref, suffix: '+', prefix: '', color: '#e11d48', format: (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n.toLocaleString() },
            { label: 'Restaurants', value: restaurants.count, ref: restaurants.ref, suffix: '+', prefix: '', color: '#f59e0b', format: (n) => n.toLocaleString() },
            { label: 'Platform Uptime', value: uptime.count, ref: uptime.ref, suffix: '%', prefix: '', color: '#10b981', format: (n) => n.toFixed(1) },
            { label: 'Avg. Pickup Time', value: avgTime.count, ref: avgTime.ref, suffix: 's', prefix: '~', color: '#06b6d4', format: (n) => n },
          ].map((stat, i) => (
            <div
              key={i}
              ref={stat.ref}
              className="text-center p-8 rounded-2xl border border-white/06 transition-all duration-300 hover:border-white/12 hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.025)' }}
            >
              <div className="font-landing text-5xl font-black mb-2" style={{ color: stat.color }}>
                {stat.prefix}{stat.format(stat.value)}{stat.suffix}
              </div>
              <p className="text-white/50 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        ref={pricingFade.ref}
        className={`py-24 px-6 transition-all duration-700 ${pricingFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-300 border-purple-500/20">
              Pricing
            </Badge>
            <h2 className="font-landing text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              Pay for outcomes,{' '}
              <span className="bg-gradient-to-r from-purple-400 to-brand-400 bg-clip-text text-transparent">
                not promises.
              </span>
            </h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto">
              Start for free and upgrade only when your restaurant is thriving.
              No contracts, no lock-in, cancel with a click.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {pricing.map((tier, i) => (
              <div
                key={i}
                className="relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: tier.highlighted ? 'rgba(225,29,72,0.06)' : 'rgba(255,255,255,0.03)',
                  border: tier.highlighted ? '1px solid rgba(225,29,72,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: tier.highlighted ? '0 0 0 1px rgba(225,29,72,0.15), 0 20px 60px rgba(225,29,72,0.12)' : 'none',
                }}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-500 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg shadow-brand-500/30">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-landing font-bold text-xl text-white mb-1">{tier.name}</h3>
                  <p className="text-white/40 text-sm mb-5">{tier.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="font-landing font-black text-4xl text-white">{tier.price}</span>
                    {tier.price !== 'Custom' && (
                      <span className="text-white/40 text-sm mb-1.5">/{tier.sub.split(' ')[0]}</span>
                    )}
                  </div>
                  {tier.price === 'Custom' && (
                    <p className="text-white/40 text-sm">{tier.sub}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feat, fi) => (
                    <li key={fi} className="flex items-center gap-2.5 text-sm text-white/65">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-brand-400" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button
                  className={tier.highlighted
                    ? 'w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white border-0 font-semibold shadow-lg shadow-brand-500/25'
                    : 'w-full bg-white/05 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 font-semibold'
                  }
                  size="lg"
                  onClick={() => navigate('/owner/login')}
                >
                  {tier.cta} {tier.highlighted && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section
        ref={testimonialFade.ref}
        className={`py-24 px-6 transition-all duration-700 ${testimonialFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
              Real Owners. Real Words.
            </Badge>
            <h2 className="font-landing text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              Don't take our word{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                for it.
              </span>
            </h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto">
              Hundreds of restaurant owners switched. Here's what they said after their first week.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card
                key={i}
                className="relative p-6 border-white/08 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 flex flex-col"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.rating)].map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-white/70 text-sm leading-relaxed flex-1 mb-6 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/06">
                    <Avatar className="w-10 h-10 border border-brand-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-brand-600 to-brand-800 text-white font-bold text-sm">
                        {t.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white text-sm">{t.name}</p>
                      <p className="text-white/40 text-xs">{t.restaurant}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section
        id="faq"
        ref={faqFade.ref}
        className={`py-24 px-6 transition-all duration-700 ${faqFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
              Got Questions?
            </Badge>
            <h2 className="font-landing text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              We've heard them{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                all before.
              </span>
            </h2>
            <p className="text-white/50">
              Clear, honest answers — no marketing fluff, no fine print.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} index={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section
        id="contact"
        ref={contactFade.ref}
        className={`py-24 px-6 transition-all duration-700 ${contactFade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-brand-500/10 text-brand-300 border-brand-500/20">
              Get In Touch
            </Badge>
            <h2 className="font-landing text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              Have a question?{' '}
              <span className="bg-gradient-to-r from-brand-400 to-rose-400 bg-clip-text text-transparent">
                We're right here.
              </span>
            </h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto">
              Whether you're curious about features, pricing, or want a live walkthrough —
              our team responds within 2 hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Left — contact info cards */}
            <div className="space-y-4">
              {[
                {
                  icon: <Mail className="w-5 h-5" />,
                  label: 'Email Us',
                  value: 'hello@khajax.app',
                  sub: 'We reply within 2 hours on weekdays.',
                  accent: '#e11d48',
                  href: 'mailto:hello@khajax.app',
                },
                {
                  icon: <Phone className="w-5 h-5" />,
                  label: 'Call / WhatsApp',
                  value: '+977 98XXXXXXXX',
                  sub: 'Sun–Fri, 9am – 6pm Nepal Time.',
                  accent: '#10b981',
                  href: 'tel:+97798XXXXXXXX',
                },
                {
                  icon: <MapPin className="w-5 h-5" />,
                  label: 'Our Office',
                  value: 'Kathmandu, Nepal',
                  sub: 'CodeYatra PVT. LTD., New Baneshwor.',
                  accent: '#f59e0b',
                  href: '#',
                },
              ].map((c, i) => (
                <a
                  key={i}
                  href={c.href}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-white/08 hover:border-white/18 transition-all duration-300 hover:-translate-y-0.5 group"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${c.accent}18`, border: `1px solid ${c.accent}30`, color: c.accent }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-0.5">{c.label}</p>
                    <p className="font-semibold text-white text-base">{c.value}</p>
                    <p className="text-white/40 text-sm mt-0.5">{c.sub}</p>
                  </div>
                </a>
              ))}

              {/* Social proof callout */}
              <div
                className="mt-2 p-5 rounded-2xl border border-brand-500/20 flex items-center gap-4"
                style={{ background: 'rgba(225,29,72,0.05)' }}
              >
                <MessageSquare className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <p className="text-sm text-white/55 leading-relaxed">
                  Prefer a live demo? Book a{' '}
                  <a href="#" className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-2 transition-colors">
                    15-minute walkthrough
                  </a>{' '}
                  and we'll show you Khaja X running live on your own menu.
                </p>
              </div>
            </div>

            {/* Right — contact form */}
            <div
              className="rounded-2xl p-8 border border-white/08"
              style={{ background: 'rgba(255,255,255,0.025)' }}
            >
              <h3 className="font-landing font-bold text-xl text-white mb-6">Send us a message</h3>
              <form
                onSubmit={e => { e.preventDefault(); alert('Message sent! We will get back to you within 2 hours.') }}
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Raj Shrestha"
                      id="contact-name"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="raj@restaurant.com"
                      id="contact-email"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Restaurant Name</label>
                  <input
                    type="text"
                    placeholder="Himalayan Bites"
                    id="contact-restaurant"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us what you need or ask any question…"
                    id="contact-message"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white border-0 font-semibold shadow-lg shadow-brand-500/20"
                >
                  Send Message <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(225,29,72,0.18), transparent 70%)',
          }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-sm font-medium mb-6">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>500+ restaurants. 1M+ orders. Zero regrets.</span>
          </div>
          <h2 className="font-landing text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6">
            Your competition is already{' '}
            <span className="bg-gradient-to-r from-brand-400 to-rose-400 bg-clip-text text-transparent">
              moving faster.
            </span>
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto">
            Every day without Khaja X is a day of miscommunication, missed orders, and money left on the table.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-xl shadow-brand-500/30 border-0 text-base font-semibold px-8 py-3.5 h-auto animate-glow"
              onClick={() => navigate('/owner/login')}
            >
              Start Free Today <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 text-base font-semibold px-8 py-3.5 h-auto backdrop-blur-sm"
            >
              <Clock className="w-4 h-4" />
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/06 py-14 px-6" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand col */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-400">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <span className="font-landing font-bold text-lg text-white">Khaja X</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                The smart QR restaurant management platform built for modern Nepali restaurants.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Product</p>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'How It Works', 'Changelog'].map(l => (
                  <li key={l}><a href="#" className="text-white/40 hover:text-white text-sm transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Portals */}
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Portals</p>
              <ul className="space-y-2.5">
                {[
                  { label: 'Owner Login', href: '/owner/login' },
                  { label: 'Kitchen Login', href: '/kitchen/login' },
                  { label: 'Browse Menu', href: '/menu' },
                ].map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-white/40 hover:text-white text-sm transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Company</p>
              <ul className="space-y-2.5">
                {['About', 'Privacy Policy', 'Terms of Service', 'Contact'].map(l => (
                  <li key={l}><a href="#" className="text-white/40 hover:text-white text-sm transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <Separator className="bg-white/06 mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-xs">
              © 2026 CodeYatra PVT. LTD. All rights reserved.
            </p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-white/30 text-xs">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
