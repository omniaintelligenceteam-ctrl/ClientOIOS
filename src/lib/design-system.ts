/**
 * OIOS Design System — Phase Alpha
 * Glass morphism, shadows, gradients, animation utilities
 */

// ---------------------------------------------------------------------------
// Card Variants
// ---------------------------------------------------------------------------

/** Base glass morphism card */
export const glassCard =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 transition-all duration-300'

/** Glass card with hover glow */
export const glassCardHover =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.1] hover:shadow-[0_0_24px_rgba(45,212,191,0.08)] hover:scale-[1.005] cursor-pointer'

/** Tighter glass card (no padding — add your own) */
export const glassCardRaw =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl transition-all duration-300'

/** Stat card — glass + subtle glow on hover */
export const statCard =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-teal-400/20 hover:shadow-[0_0_20px_rgba(45,212,191,0.06)] group'

/** Legacy surface card (used as fallback) */
export const surfaceCard =
  'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

/** Sidebar glass */
export const sidebarGlass =
  'backdrop-blur-2xl bg-[rgba(11,17,32,0.85)] border-r border-white/[0.06]'

/** Header glass */
export const headerGlass =
  'backdrop-blur-xl bg-[rgba(11,17,32,0.7)] border-b border-white/[0.06]'

// ---------------------------------------------------------------------------
// Shadow Utilities
// ---------------------------------------------------------------------------

export const shadows = {
  teal: '0 0 20px rgba(45,212,191,0.15)',
  tealStrong: '0 0 40px rgba(45,212,191,0.25)',
  orange: '0 0 20px rgba(249,115,22,0.15)',
  card: '0 4px 24px rgba(0,0,0,0.4)',
  deep: '0 8px 48px rgba(0,0,0,0.6)',
  glow: {
    teal: 'shadow-[0_0_20px_rgba(45,212,191,0.15)]',
    orange: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    green: 'shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    red: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  },
}

// ---------------------------------------------------------------------------
// Gradient Text
// ---------------------------------------------------------------------------

export const gradients = {
  teal: 'bg-gradient-to-r from-[#2DD4BF] to-[#5EEAD4] bg-clip-text text-transparent',
  revenue: 'bg-gradient-to-r from-[#2DD4BF] via-[#5EEAD4] to-[#67E8F9] bg-clip-text text-transparent',
  orange: 'bg-gradient-to-r from-[#f97316] to-[#fb923c] bg-clip-text text-transparent',
  hero: 'bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] bg-clip-text text-transparent',
}

// ---------------------------------------------------------------------------
// Animation Delay Utilities
// ---------------------------------------------------------------------------

export const animDelay = {
  none: '',
  xs: 'animation-delay-75',
  sm: 'animation-delay-100',
  md: 'animation-delay-200',
  lg: 'animation-delay-300',
  xl: 'animation-delay-500',
}

/** Returns inline style for animation delay in ms */
export const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` })

// ---------------------------------------------------------------------------
// Icon Container
// ---------------------------------------------------------------------------

export const iconContainer = {
  teal: 'p-2 rounded-lg bg-[rgba(45,212,191,0.08)]',
  orange: 'p-2 rounded-lg bg-[rgba(249,115,22,0.08)]',
  green: 'p-2 rounded-lg bg-[rgba(34,197,94,0.08)]',
  red: 'p-2 rounded-lg bg-[rgba(239,68,68,0.08)]',
  purple: 'p-2 rounded-lg bg-[rgba(139,92,246,0.08)]',
}

// ---------------------------------------------------------------------------
// Status Colors
// ---------------------------------------------------------------------------

export const statusColors = {
  active: 'text-green-400 bg-green-500/10 border border-green-500/20',
  inactive: 'text-slate-400 bg-slate-500/10 border border-slate-500/20',
  warning: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
  error: 'text-red-400 bg-red-500/10 border border-red-500/20',
  info: 'text-teal-400 bg-teal-500/10 border border-teal-500/20',
}
