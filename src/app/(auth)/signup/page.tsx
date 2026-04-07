'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = emailRegex.test(email)
  const showEmailError = emailTouched && email.length > 0 && !isEmailValid

  const passwordsMatch = password === confirmPassword
  const canSubmit =
    fullName.length > 0 &&
    isEmailValid &&
    password.length >= 8 &&
    passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || isLoading) return
    setIsLoading(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error

      // Send confirmation email via Resend (fire-and-forget, non-blocking)
      fetch('/api/auth/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      }).catch((err) => console.error('Confirmation email failed:', err))

      router.push('/dashboard/onboarding')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1120] px-4">
      {/* Subtle radial glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-8 shadow-2xl shadow-black/40">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
              OIOS
            </h1>
            <p className="mt-2 text-slate-400">Join Your Team</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-sm font-medium text-slate-400"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@company.com"
                className={`w-full rounded-lg border bg-[#0B1120] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:ring-1 ${
                  showEmailError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-700 focus:border-teal-500 focus:ring-teal-500/20'
                }`}
              />
              {showEmailError && (
                <p className="mt-1 text-xs text-red-400">Please enter a valid email address</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-400"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 pr-11 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-slate-400"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-lg border bg-[#0B1120] px-4 py-2.5 pr-11 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:ring-1 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-700 focus:border-teal-500 focus:ring-teal-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Powered by{' '}
          <span className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text font-semibold text-transparent">
            OIOS
          </span>
        </p>
      </div>
    </div>
  )
}
