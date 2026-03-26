'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Check, X, PenLine, Trash2 } from 'lucide-react'
import type { Invoice } from '@/lib/types'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

function EstimateContent() {
  const searchParams = useSearchParams()
  const estimateId = searchParams.get('estimate_id')

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'signing' | 'approved' | 'changes'>('idle')
  const [hasSignature, setHasSignature] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!estimateId) {
      setError('No estimate ID provided')
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setError('Unable to connect')
      setLoading(false)
      return
    }

    supabase
      .from('invoices')
      .select('*')
      .eq('id', estimateId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Estimate not found')
        } else {
          setInvoice(data as Invoice)
        }
        setLoading(false)
      })
  }, [estimateId])

  // Canvas drawing
  function getPoint(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    isDrawing.current = true
    lastPoint.current = getPoint(e)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const pt = getPoint(e)
    if (!ctx || !pt || !lastPoint.current) return

    ctx.strokeStyle = '#2DD4BF'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()

    lastPoint.current = pt
    setHasSignature(true)
  }

  function endDraw() {
    isDrawing.current = false
    lastPoint.current = null
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleApprove() {
    if (!hasSignature || !invoice) return
    setSubmitting(true)

    const supabase = createSupabaseBrowserClient()
    if (supabase) {
      await supabase
        .from('invoices')
        .update({ status: 'sent', notes: (invoice.notes || '') + '\n[Approved via portal]' })
        .eq('id', invoice.id)
    }

    setSubmitting(false)
    setStatus('approved')
  }

  async function handleRequestChanges() {
    if (!comment.trim() || !invoice) return
    setSubmitting(true)

    const supabase = createSupabaseBrowserClient()
    if (supabase) {
      await supabase
        .from('invoices')
        .update({ notes: `${invoice.notes || ''}\n[Changes requested]: ${comment}` })
        .eq('id', invoice.id)
    }

    setSubmitting(false)
    setStatus('changes')
  }

  if (!estimateId) {
    return (
      <div className="text-center py-16" style={{ color: '#94A3B8' }}>
        No estimate ID provided.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ background: '#111827', height: 100 }} />
        ))}
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <p style={{ color: '#F8FAFC' }}>{error || 'Estimate not found'}</p>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div
        className="rounded-2xl p-10 text-center space-y-4"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(34,197,94,0.15)' }}
        >
          <Check size={32} style={{ color: '#22c55e' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>
          Estimate Approved!
        </h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          We&apos;ll reach out to schedule your service shortly.
        </p>
      </div>
    )
  }

  if (status === 'changes') {
    return (
      <div
        className="rounded-2xl p-10 text-center space-y-4"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(249,115,22,0.1)' }}
        >
          <X size={32} style={{ color: '#f97316' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>
          Change Request Sent
        </h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          We&apos;ll review your comments and follow up with a revised estimate.
        </p>
      </div>
    )
  }

  const lineItems = (invoice.line_items || []) as LineItem[]
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>
              Service Estimate
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              #{invoice.invoice_number}
            </p>
          </div>
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize"
            style={{ background: 'rgba(45,212,191,0.1)', color: '#2DD4BF' }}
          >
            {invoice.status}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#94A3B8' }}>
          Service Details
        </h2>
        <div className="space-y-3">
          {lineItems.length > 0 ? (
            lineItems.map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm" style={{ color: '#F8FAFC' }}>
                    {item.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                    {item.quantity} × ${item.unit_price.toFixed(2)}
                  </p>
                </div>
                <p className="text-sm font-medium flex-shrink-0" style={{ color: '#F8FAFC' }}>
                  ${item.total.toFixed(2)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: '#64748B' }}>
              No line items
            </p>
          )}
        </div>

        <div
          className="mt-4 pt-4 space-y-1"
          style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: '#94A3B8' }}>Subtotal</span>
            <span style={{ color: '#F8FAFC' }}>${subtotal.toFixed(2)}</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#94A3B8' }}>Tax</span>
              <span style={{ color: '#F8FAFC' }}>${invoice.tax_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1">
            <span style={{ color: '#F8FAFC' }}>Total</span>
            <span style={{ color: '#2DD4BF' }}>${invoice.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div
          className="rounded-2xl p-5"
          style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>
            Tech Notes
          </p>
          <p className="text-sm" style={{ color: '#F8FAFC' }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Signature */}
      {status === 'idle' && (
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine size={16} style={{ color: '#2DD4BF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>
                Digital Signature
              </h2>
            </div>
            {hasSignature && (
              <button
                onClick={clearSignature}
                className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                style={{ color: '#64748B' }}
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={380}
            height={120}
            className="w-full rounded-xl touch-none"
            style={{
              background: '#0B1120',
              border: `1px solid ${hasSignature ? 'rgba(45,212,191,0.3)' : 'rgba(148,163,184,0.15)'}`,
              cursor: 'crosshair',
            }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasSignature && (
            <p className="text-xs text-center" style={{ color: '#64748B' }}>
              Sign above to approve this estimate
            </p>
          )}

          {/* Approve button */}
          <button
            onClick={handleApprove}
            disabled={!hasSignature || submitting}
            className="w-full py-4 rounded-xl font-bold text-base transition-all"
            style={{
              background: hasSignature ? '#22c55e' : 'rgba(148,163,184,0.1)',
              color: hasSignature ? '#fff' : '#64748B',
              cursor: hasSignature ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Approving...' : '✓ Approve Estimate'}
          </button>

          {/* Request changes */}
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Describe what you'd like changed..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
              style={{
                background: '#0B1120',
                border: '1px solid rgba(148,163,184,0.15)',
                color: '#F8FAFC',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)' }}
            />
            <button
              onClick={handleRequestChanges}
              disabled={!comment.trim() || submitting}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all"
              style={{
                background: comment.trim() ? 'rgba(249,115,22,0.1)' : 'rgba(148,163,184,0.05)',
                color: comment.trim() ? '#f97316' : '#64748B',
                border: `1px solid ${comment.trim() ? 'rgba(249,115,22,0.2)' : 'rgba(148,163,184,0.1)'}`,
                cursor: comment.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Request Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EstimateApprovalPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: '#111827', height: 100 }} />
          ))}
        </div>
      }
    >
      <EstimateContent />
    </Suspense>
  )
}
