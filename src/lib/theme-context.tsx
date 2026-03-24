'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ThemeConfig {
  primaryColor: string
  logoUrl: string | null
  companyName: string
}

interface ThemeContextValue extends ThemeConfig {
  /** True while auth is still loading org data */
  isLoading: boolean
}

/* ------------------------------------------------------------------ */
/*  Defaults (OIOS branding)                                           */
/* ------------------------------------------------------------------ */

const OIOS_DEFAULTS: ThemeConfig = {
  primaryColor: '#2DD4BF',
  logoUrl: null,
  companyName: 'OIOS',
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ThemeContext = createContext<ThemeContextValue>({
  ...OIOS_DEFAULTS,
  isLoading: true,
})

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useAuth()

  // Derive theme from organization data.
  // Today the Organization type doesn't have branding columns yet —
  // when an `org_branding` table (or columns) is added, read from
  // (organization as any).primary_color / logo_url here.
  const theme = useMemo<ThemeContextValue>(() => {
    if (!organization) {
      return { ...OIOS_DEFAULTS, isLoading }
    }

    const branding = organization as unknown as Record<string, unknown>

    return {
      primaryColor:
        (typeof branding.primary_color === 'string' && branding.primary_color) ||
        OIOS_DEFAULTS.primaryColor,
      logoUrl:
        (typeof branding.logo_url === 'string' && branding.logo_url) ||
        OIOS_DEFAULTS.logoUrl,
      companyName:
        (typeof branding.company_name === 'string' && branding.company_name) ||
        organization.name ||
        OIOS_DEFAULTS.companyName,
      isLoading,
    }
  }, [organization, isLoading])

  // Apply CSS custom properties so any component can use
  // var(--theme-primary) for runtime color overrides.
  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--theme-primary', theme.primaryColor)

    // Derive a translucent version for hover / ring / glow effects
    root.style.setProperty('--theme-primary-10', `${theme.primaryColor}1A`) // 10 %
    root.style.setProperty('--theme-primary-20', `${theme.primaryColor}33`) // 20 %

    return () => {
      root.style.removeProperty('--theme-primary')
      root.style.removeProperty('--theme-primary-10')
      root.style.removeProperty('--theme-primary-20')
    }
  }, [theme.primaryColor])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTheme() {
  return useContext(ThemeContext)
}
