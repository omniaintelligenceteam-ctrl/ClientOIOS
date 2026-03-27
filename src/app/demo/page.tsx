'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { DEMO_ORG_SLUG } from '@/lib/demo-constants'

export default function DemoPage() {
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const startDemo = async () => {
      const supabase = createSupabaseBrowserClient()
      const email = process.env.NEXT_PUBLIC_DEMO_EMAIL
      const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD

      if (!email || !password) {
        setError('Demo is not configured yet.')
        return
      }

      // Check if already signed in as demo user
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === email) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      // Sign out any existing session
      if (user) {
        await supabase.auth.signOut()
      }

      // Sign in as demo user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Demo is temporarily unavailable. Please try again later.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    }

    startDemo()
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] px-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-8 shadow-2xl shadow-black/40">
            <h1 className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              OIOS
            </h1>
            <p className="mt-4 text-sm text-red-400">{error}</p>
            <a
              href="https://getoios.com"
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30"
            >
              Visit getoios.com
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1120] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-3xl" />
      </div>
      <div className="relative z-10 text-center">
        <h1 className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          OIOS
        </h1>
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
          <p className="text-sm text-slate-400">Loading your demo dashboard...</p>
        </div>
      </div>
    </div>
  )
}
