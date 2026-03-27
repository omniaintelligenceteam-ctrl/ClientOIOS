'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Organization, User } from '@/lib/types'
import { DEMO_ORG_SLUG } from '@/lib/demo-constants'

interface AuthContext {
  user: SupabaseUser | null
  profile: User | null
  organization: Organization | null
  isLoading: boolean
  isSuperAdmin: boolean
  isDemoMode: boolean
  error: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext>({
  user: null,
  profile: null,
  organization: null,
  isLoading: true,
  isSuperAdmin: false,
  isDemoMode: false,
  error: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function loadUserData(authUser: SupabaseUser) {
      setIsLoading(true)
      setError(null)
      setUser(authUser)

      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError || !profileData) {
          setError('Failed to load user profile')
          setIsLoading(false)
          return
        }

        // The Supabase client is typed with Database, so .from('users').select('*').single()
        // returns the Row type. We narrow by checking profileData is truthy above.
        const typedProfile = profileData as User
        setProfile(typedProfile)

        // Fetch organization
        const orgId = typedProfile.organization_id
        if (orgId) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single()

          if (orgError) {
            setError('Failed to load organization')
          } else if (orgData) {
            setOrganization(orgData as Organization)
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error loading user data'
        setError(message)
      }

      setIsLoading(false)
    }

    const getSession = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        await loadUserData(authUser)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
          await loadUserData(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setOrganization(null)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setOrganization(null)
    window.location.href = '/login'
  }

  const isSuperAdmin = profile?.is_super_admin === true
  const isDemoMode = organization?.slug === DEMO_ORG_SLUG

  return (
    <AuthContext.Provider value={{ user, profile, organization, isLoading, isSuperAdmin, isDemoMode, error, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
