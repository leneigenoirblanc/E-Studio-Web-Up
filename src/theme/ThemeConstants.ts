/**
 * E-Studio Centralized Design Tokens & Theme Constants
 * 
 * Strict enforcement of:
 * - 60-30-10 Color Distribution (Neutral surface 60%, Content/Structure 30%, High-intent Accents 10%)
 * - 4/8/12/16/20/24/32 Spacing Scale
 * - Typographic Hierarchy & Monospace Data alignment
 * - Zero-Pill Discipline for passive metadata
 * - Nested Border Radius Math (r_inner = r_outer - padding)
 */

export const THEME_SPACING = {
  none: '0px',
  xs: '4px',    // 1 (Tailwind)
  sm: '8px',    // 2
  md: '12px',   // 3
  base: '16px', // 4
  lg: '20px',   // 5
  xl: '24px',   // 6
  '2xl': '32px',// 8
  '3xl': '48px',// 12
  '4xl': '64px',// 16
} as const;

export const THEME_SPACING_CLASSES = {
  containerPadding: 'p-4 sm:p-6 lg:p-8',
  cardPadding: 'p-5 sm:p-6',
  cardPaddingDense: 'p-3 sm:p-4',
  stackGap: 'gap-4',
  stackGapTight: 'gap-2',
  stackGapLoose: 'gap-6',
  inlineGap: 'gap-2 sm:gap-3',
  inputPadding: 'px-3 py-2',
  buttonPaddingSm: 'px-2.5 py-1.5',
  buttonPaddingMd: 'px-4 py-2',
  buttonPaddingLg: 'px-5 py-2.5',
} as const;

export const THEME_COLORS = {
  // 60% Canvas & Neutral Surfaces
  canvas: {
    base: '#f8fafc',      // slate-50
    subtle: '#f1f5f9',    // slate-100
    dark: '#0f172a',      // slate-900
    darkSubtle: '#1e293b',// slate-800
  },
  surface: {
    card: '#ffffff',
    cardDark: '#1e293b',
    overlay: 'rgba(15, 23, 42, 0.65)',
    divider: '#e2e8f0',   // slate-200
    dividerDark: '#334155',// slate-700
  },

  // 30% Structural Typography & Hierarchy
  content: {
    primary: '#0f172a',   // slate-900
    secondary: '#475569', // slate-600
    muted: '#64748b',     // slate-500
    inverse: '#ffffff',
    inverseMuted: '#94a3b8', // slate-400
  },

  // 10% Intent-Driven Semantic Accents
  accent: {
    // Primary Action (Blue)
    primary: {
      DEFAULT: '#2563eb', // blue-600
      hover: '#1d4ed8',   // blue-700
      active: '#1e40af',  // blue-800
      subtle: '#eff6ff',  // blue-50
      border: '#93c5fd',  // blue-300
      text: '#1d4ed8',    // blue-700
    },
    // Success / Validation (Emerald)
    success: {
      DEFAULT: '#059669', // emerald-600
      hover: '#047857',   // emerald-700
      subtle: '#ecfdf5',  // emerald-50
      border: '#a7f3d0',  // emerald-200
      text: '#047857',    // emerald-700
    },
    // Warning / Attention (Amber)
    warning: {
      DEFAULT: '#d97706', // amber-600
      hover: '#b45309',   // amber-700
      subtle: '#fffbeb',  // amber-50
      border: '#fde68a',  // amber-200
      text: '#b45309',    // amber-700
    },
    // Danger / Destructive (Rose)
    danger: {
      DEFAULT: '#e11d48', // rose-600
      hover: '#be123c',   // rose-700
      subtle: '#fff1f2',  // rose-50
      border: '#fecdd3',  // rose-200
      text: '#be123c',    // rose-700
    },
    // Info / Data (Sky)
    info: {
      DEFAULT: '#0284c7', // sky-600
      hover: '#0369a1',   // sky-700
      subtle: '#f0f9ff',  // sky-50
      border: '#bae6fd',  // sky-200
      text: '#0369a1',    // sky-700
    },
  },
} as const;

export const THEME_TYPOGRAPHY = {
  fontFamily: {
    sans: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

export const THEME_RADIUS = {
  none: '0px',
  sm: '4px',    // rounded-sm
  md: '6px',    // rounded-md
  lg: '8px',    // rounded-lg
  xl: '12px',   // rounded-xl
  '2xl': '16px',// rounded-2xl
  full: '9999px',
} as const;

export const THEME_SHADOWS = {
  none: 'none',
  '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  xs: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
  sm: '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

export const THEME_SHADOW_CLASSES = {
  none: 'shadow-none',
  '2xs': 'shadow-2xs',
  xs: 'shadow-xs',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
} as const;

export const THEME_CLASSES = {
  // Focus rings strictly conforming to WCAG AA visibility
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
  focusRingDark: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-slate-900',
  
  // Transition presets
  transitionFast: 'transition-all duration-150 ease-in-out',
  transitionNormal: 'transition-all duration-200 ease-in-out',

  // Zero-pill metadata styling
  metadataContainer: 'flex items-center gap-1.5 text-xs text-slate-500 font-medium',
  metadataSeparator: 'text-slate-300 select-none mx-0.5',

  // Monospace data figures
  tabularFigures: 'font-mono tracking-tight tabular-nums',
} as const;

export const ThemeConstants = {
  spacing: THEME_SPACING,
  spacingClasses: THEME_SPACING_CLASSES,
  colors: THEME_COLORS,
  typography: THEME_TYPOGRAPHY,
  radius: THEME_RADIUS,
  shadows: THEME_SHADOWS,
  shadowClasses: THEME_SHADOW_CLASSES,
  classes: THEME_CLASSES,
};

export default ThemeConstants;
