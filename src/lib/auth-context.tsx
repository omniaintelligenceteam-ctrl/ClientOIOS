'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Organization, User } from '@/lib/types'

interface AuthContext {
  user: SupabaseUser | null
  profile: User | null
  organization: Organization | null
  isLoading: boolean
  isSuperAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext>({
  user: null,
  profile: null,
  organization: null,
  isLoading: true,
  isSuperAdmin: false,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileData) {
          setProfile(profileData as unknown as User)

          // Fetch organization
          const orgId = (profileData as any).organization_id
          if (orgId) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', orgId)
              .single()

            setOrganization(orgData as unknown as Organization)
          }
        }
      }

      setIsLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        setUser(session?.user ?? null)
        if (!session?.user) {
          setProfile(null)
          setOrganization(null)
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

  return (
    <AuthContext.Provider value={{ user, profile, organization, isLoading, isSuperAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
