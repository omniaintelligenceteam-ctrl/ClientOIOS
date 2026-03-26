'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface PortalShareButtonProps {
  appointmentId: string
  variant?: 'button' | 'icon'
  className?: string
}

export function PortalShareButton({
  appointmentId,
  variant = 'button',
  className = '',
}: PortalShareButtonProps) {
  const [copied, setCopied] = useState(false)

  function getPortalUrl() {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || ''
    return `${base}/portal?job=${appointmentId}`
  }

  async function handleShare() {
    const url = getPortalUrl()

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: show the URL in a prompt
      window.prompt('Copy this portal link:', url)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className={`p-2 rounded-lg transition-all ${className}`}
        style={{
          background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.05)',
          color: copied ? '#22c55e' : '#94A3B8',
          border: `1px solid ${copied ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.1)'}`,
        }}
        title="Copy portal link"
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${className}`}
      style={{
        background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.05)',
        color: copied ? '#22c55e' : '#94A3B8',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.1)'}`,
      }}
    >
      {copied ? (
        <>
          <Check size={14} />
          Copied!
        </>
      ) : (
        <>
          <Copy size={14} />
          Share Portal Link
        </>
      )}
    </button>
  )
}
