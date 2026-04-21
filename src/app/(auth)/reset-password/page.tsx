'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type LinkStatus = 'checking' | 'valid' | 'invalid'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState<LinkStatus>('checking')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordsMatch = password === confirmPassword
  const canSubmit = password.length >= 8 && passwordsMatch && status === 'valid' && !submitting

  const helperText = useMemo(() => {
    if (password.length === 0 || confirmPassword.length === 0) return null
    if (!passwordsMatch) return 'Passwords do not match'
    if (password.length < 8) return 'Password must be at least 8 characters'
    return null
  }, [password, confirmPassword, passwordsMatch])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus('invalid')
      setError('Unable to initialize authentication.')
      return
    }

    let mounted = true

    async function initRecoverySession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const type = hash.get('type')

      if (type && type !== 'recovery') {
        if (mounted) {
          setStatus('invalid')
          setError('This link is not a valid password reset link.')
        }
        return
      }

      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (setSessionError && mounted) {
          setStatus('invalid')
          setError('Your reset link is invalid or expired.')
          return
        }
      }

      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && mounted) {
          setStatus('invalid')
          setError('Your reset link is invalid or expired.')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session?.user) {
        setStatus('valid')
      } else {
        setStatus('invalid')
        setError('Your reset link is invalid or expired.')
      }
    }

    initRecoverySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus(session?.user ? 'valid' : 'invalid')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setError('Unable to initialize authentication.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message || 'Failed to reset password.')
      return
    }

    await supabase.auth.signOut()
    setSuccess(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1120] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
              OIOS
            </h1>
            <p className="mt-2 text-slate-400">Reset Password</p>
          </div>

          {status === 'checking' && (
            <div className="text-center text-sm text-slate-400">Verifying reset link...</div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-sm text-red-300">{error || 'This reset link is invalid or expired.'}</p>
              <Link
                href="/forgot-password"
                className="inline-flex rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400"
              >
                Request New Link
              </Link>
            </div>
          )}

          {status === 'valid' && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 pr-11 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="Re-enter password"
                    className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 pr-11 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {helperText && <p className="text-xs text-red-400">{helperText}</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          )}

          {success && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-7 w-7 text-green-400" />
              </div>
              <p className="text-sm text-slate-300">Your password was reset successfully.</p>
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
