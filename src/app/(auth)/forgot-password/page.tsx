'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Demo — no real email sent
    setTimeout(() => {
      setIsLoading(false)
      setSubmitted(true)
    }, 1500)
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
            <p className="mt-2 text-slate-400">Reset Password</p>
          </div>

          {submitted ? (
            /* Success state */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10">
                <CheckCircle size={32} className="text-teal-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                If an account exists for <span className="text-slate-300">{email}</span>,
                we sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-teal-400 transition-colors hover:text-teal-300"
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <p className="mb-6 text-center text-sm text-slate-400">
                Enter your email address and we&apos;ll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-400"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-slate-700 bg-[#0B1120] py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Send size={18} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-teal-400 transition-colors hover:text-teal-300"
                >
                  <ArrowLeft size={16} />
                  Back to login
                </Link>
              </div>
            </>
          )}
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
