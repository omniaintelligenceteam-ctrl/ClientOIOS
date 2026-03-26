'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Copy, Download, Pencil, Send, Loader2, CheckCircle } from 'lucide-react'
import type { Lead } from '@/lib/types'

interface ProposalGeneratorProps {
  lead: Lead
  businessName?: string
  onGenerated?: (proposal: string) => void
}

function buildFallbackProposal(
  lead: Lead,
  service: string,
  value: number,
  notes: string,
  businessName: string
): string {
  const name = `${lead.first_name} ${lead.last_name}`
  return `# Proposal for ${name}

Dear ${lead.first_name},

Thank you for reaching out to us. Based on our conversation about **${service}**, we are pleased to submit the following proposal.

---

## Scope of Work

We propose to provide the following services:

**Service:** ${service}
**Estimated Investment:** $${value.toLocaleString()}

${notes ? `**Additional Notes:**\n${notes}\n` : ''}

## Why Choose Us

- Professional, licensed, and insured team
- Transparent pricing with no hidden fees
- Satisfaction guaranteed
- Fast response and reliable service

## Next Steps

1. Review this proposal and reach out with any questions
2. Schedule a site visit or consultation
3. Sign agreement and confirm start date

---

We look forward to working with you, ${lead.first_name}. Please don't hesitate to reach out with any questions.

**Best regards,**
${businessName}

*This proposal is valid for 30 days from the date of issue.*`
}

export function ProposalGenerator({ lead, businessName = 'Our Team', onGenerated }: ProposalGeneratorProps) {
  const [service, setService] = useState(lead.service_needed ?? '')
  const [value, setValue] = useState(String(lead.estimated_value ?? ''))
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [proposal, setProposal] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProposal, setEditedProposal] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    const name = `${lead.first_name} ${lead.last_name}`

    try {
      const res = await fetch('/api/dashboard/ai/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: name,
          service,
          value: parseFloat(value) || 0,
          notes,
          businessName,
          phone: lead.phone,
          email: lead.email,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const generated = data.proposal
        setProposal(generated)
        setEditedProposal(generated)
        onGenerated?.(generated)
      } else {
        throw new Error('API unavailable')
      }
    } catch {
      // Fallback to template
      const fallback = buildFallbackProposal(lead, service, parseFloat(value) || 0, notes, businessName)
      setProposal(fallback)
      setEditedProposal(fallback)
      onGenerated?.(fallback)
    } finally {
      setGenerating(false)
    }
  }, [lead, service, value, notes, businessName, onGenerated])

  const handleCopy = useCallback(async () => {
    const text = isEditing ? editedProposal : (proposal ?? '')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [proposal, editedProposal, isEditing])

  const handleDownload = useCallback(() => {
    const text = isEditing ? editedProposal : (proposal ?? '')
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proposal-${lead.first_name}-${lead.last_name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [proposal, editedProposal, isEditing, lead])

  const displayProposal = isEditing ? editedProposal : proposal

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">
          Generate Proposal for {lead.first_name} {lead.last_name}
        </h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#64748B] mb-1 block">Service Type</label>
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40"
              placeholder="e.g., HVAC repair, plumbing inspection"
            />
          </div>

          <div>
            <label className="text-xs text-[#64748B] mb-1 block">Estimated Value ($)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs text-[#64748B] mb-1 block">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40"
              placeholder="Any special requirements or context..."
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !service}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1120] transition-all hover:bg-[#5EEAD4] disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating proposal...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate Proposal
              </>
            )}
          </button>
        </div>
      </div>

      {displayProposal && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-wider">
              Generated Proposal
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors"
              >
                <Pencil size={12} />
                {isEditing ? 'Preview' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors"
              >
                {copied ? <CheckCircle size={12} className="text-[#2DD4BF]" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors"
              >
                <Download size={12} />
                Download
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#2DD4BF] hover:bg-[#2DD4BF]/10 transition-colors"
              >
                <Send size={12} />
                Send
              </button>
            </div>
          </div>

          {isEditing ? (
            <textarea
              value={editedProposal}
              onChange={(e) => setEditedProposal(e.target.value)}
              rows={16}
              className="w-full resize-y rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2 text-sm font-mono text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/40"
            />
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-lg bg-[#0B1120] p-4">
              <pre className="whitespace-pre-wrap text-sm text-[#94A3B8] font-sans leading-relaxed">
                {displayProposal}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
