// ============================================================
// OIOS Client Dashboard — Automation Email Templates
// Returns subject + bodyPrompt for Claude Haiku to render
// ============================================================

export interface AutomationContext {
  businessName: string
  customerName: string
  customerEmail: string
  metadata: Record<string, unknown>
}

export interface AutomationTemplate {
  subject: string
  bodyPrompt: string
}

// ── follow_up_email ──────────────────────────────────────────
// Thank-you email sent after service completion
export function follow_up_email(context: AutomationContext): AutomationTemplate {
  const { businessName, customerName, metadata } = context
  const serviceType = (metadata.service_type as string) || 'your recent service'
  const techName = (metadata.tech_name as string) || ''

  return {
    subject: `Thank you for choosing ${businessName}!`,
    bodyPrompt: `Write a warm, professional thank-you email in clean HTML for a customer named ${customerName} who just had "${serviceType}" completed by ${businessName}${techName ? ` (technician: ${techName})` : ''}.

The email should:
- Open with a genuine thank-you
- Briefly mention the service performed
- Invite them to reach out if anything needs attention
- Close warmly with the business name

Keep it concise (3–4 short paragraphs). Use a simple HTML layout with inline styles — white background, dark text, readable font. No images. Include a soft footer with the business name. Do not include a subject line in the HTML.`,
  }
}

// ── review_request ───────────────────────────────────────────
// Ask customer to leave a Google review
export function review_request(context: AutomationContext): AutomationTemplate {
  const { businessName, customerName, metadata } = context
  const reviewUrl = (metadata.review_url as string) || 'https://g.page/r/review'
  const serviceType = (metadata.service_type as string) || 'your recent service'

  return {
    subject: `Quick favor — share your experience with ${businessName}?`,
    bodyPrompt: `Write a friendly, brief review-request email in clean HTML for a customer named ${customerName} who used ${businessName} for "${serviceType}".

The email should:
- Open by expressing hope that they were happy with the work
- Politely ask them to leave a Google review using this link: ${reviewUrl}
- Explain it only takes 1 minute and helps the small business
- Thank them in advance

Keep it short (2–3 paragraphs). Use a simple HTML layout with inline styles — white background, dark text, readable font. Make the review link a clearly visible button or bolded anchor. No images. Include a soft footer with the business name. Do not include a subject line in the HTML.`,
  }
}

// ── invoice_reminder ─────────────────────────────────────────
// Payment reminder for an outstanding invoice
export function invoice_reminder(context: AutomationContext): AutomationTemplate {
  const { businessName, customerName, metadata } = context
  const invoiceNumber = (metadata.invoice_number as string) || ''
  const amount = (metadata.amount as number) ?? null
  const dueDate = (metadata.due_date as string) || ''
  const paymentUrl = (metadata.payment_url as string) || ''

  const amountStr = amount !== null ? `$${Number(amount).toFixed(2)}` : 'the outstanding balance'
  const invoiceRef = invoiceNumber ? ` (Invoice #${invoiceNumber})` : ''
  const dueDateStr = dueDate ? ` due on ${dueDate}` : ''
  const paymentLine = paymentUrl
    ? `Payment can be made here: ${paymentUrl}`
    : 'Please contact us to arrange payment.'

  return {
    subject: `Payment reminder from ${businessName}${invoiceRef}`,
    bodyPrompt: `Write a polite but clear invoice reminder email in clean HTML for a customer named ${customerName} with a payment of ${amountStr}${dueDateStr} owed to ${businessName}${invoiceRef}.

The email should:
- Politely remind them of the outstanding balance
- Include the amount and due date clearly
- Provide the payment instruction: ${paymentLine}
- Offer to answer any questions and provide a contact email or phone if appropriate
- Stay professional and friendly — not aggressive

Keep it concise (2–3 paragraphs). Use a simple HTML layout with inline styles. If a payment URL was provided, render it as a prominent button or bold link. No images. Include a soft footer with the business name. Do not include a subject line in the HTML.`,
  }
}

// ── lead_nurture ─────────────────────────────────────────────
// Follow up with a lead who hasn't converted
export function lead_nurture(context: AutomationContext): AutomationTemplate {
  const { businessName, customerName, metadata } = context
  const serviceInterest = (metadata.service_interest as string) || 'our services'
  const lastContactDays = (metadata.last_contact_days as number) ?? null
  const offerText = (metadata.offer as string) || ''

  const timeRef = lastContactDays ? ` about ${lastContactDays} days ago` : ' recently'

  return {
    subject: `Still thinking it over? ${businessName} is here to help`,
    bodyPrompt: `Write a gentle, non-pushy lead nurture email in clean HTML for a prospect named ${customerName} who inquired about "${serviceInterest}" from ${businessName}${timeRef} but hasn't moved forward yet.

The email should:
- Open by checking in and acknowledging they may still be deciding
- Briefly remind them what ${businessName} offers and why customers choose them
${offerText ? `- Mention this special offer or value: ${offerText}` : '- Highlight reliability, quality, or a key differentiator'}
- Include a soft call-to-action inviting them to reply or book a free estimate
- Close warmly, with no pressure

Keep it concise (3 paragraphs). Use a simple HTML layout with inline styles — approachable, warm tone. No images. Include a soft footer with the business name. Do not include a subject line in the HTML.`,
  }
}

// ── appointment_reminder ─────────────────────────────────────
// Remind customer their appointment is tomorrow
export function appointment_reminder(context: AutomationContext): AutomationTemplate {
  const { businessName, customerName, metadata } = context
  const serviceType = (metadata.service_type as string) || 'your appointment'
  const appointmentDate = (metadata.appointment_date as string) || 'tomorrow'
  const appointmentTime = (metadata.appointment_time as string) || ''
  const address = (metadata.address as string) || ''
  const techName = (metadata.tech_name as string) || ''
  const contactPhone = (metadata.contact_phone as string) || ''

  const timeStr = appointmentTime ? ` at ${appointmentTime}` : ''
  const addressStr = address ? ` at ${address}` : ''
  const techStr = techName ? ` Your technician will be ${techName}.` : ''
  const rescheduleStr = contactPhone
    ? ` If you need to reschedule, call us at ${contactPhone}.`
    : ' If you need to reschedule, please reply to this email.'

  return {
    subject: `Reminder: Your ${businessName} appointment is ${appointmentDate}`,
    bodyPrompt: `Write a friendly appointment reminder email in clean HTML for a customer named ${customerName} who has "${serviceType}" scheduled ${appointmentDate}${timeStr}${addressStr} with ${businessName}.${techStr}

The email should:
- Open with a friendly reminder about the upcoming appointment
- Clearly state the date, time, and location details
- Let them know what to expect (brief arrival window, any prep needed if relevant)
- Include reschedule instructions: ${rescheduleStr}
- Close warmly

Keep it concise (2–3 short paragraphs). Use a simple HTML layout with inline styles. Highlight the date/time in bold. No images. Include a soft footer with the business name. Do not include a subject line in the HTML.`,
  }
}

// ── prospect_outreach ────────────────────────────────────────
// Cold outreach to OIOS prospects — pain-question framing
export function prospect_outreach(context: AutomationContext): AutomationTemplate {
  const { customerName, metadata } = context
  const company = (metadata.company as string) || ''
  const notes = (metadata.notes as string) || ''
  const source = (metadata.source as string) || ''

  const companyRef = company ? ` at ${company}` : ''
  const contextLine = notes
    ? `Additional context about this prospect: ${notes}`
    : source
      ? `They were found via ${source}.`
      : ''

  return {
    subject: `Quick question for you${companyRef}`,
    bodyPrompt: `Write a short, personalized cold outreach email in clean HTML from OIOS (an AI operations company for small businesses) to a prospect named ${customerName}${companyRef}.

TONE: Conversational, direct, zero corporate jargon. Like a smart friend who runs a tech company reaching out — not a SaaS marketing email. Short sentences. Plain English.

The email MUST:
- Open with a single provocative question: "What's the one thing you do every day that you wish you didn't have to?"
- Briefly explain that OIOS finds repetitive tasks in small businesses and automates them with AI — phones, follow-ups, scheduling, pipeline, whatever eats their time
- Mention that most small business owners are doing the job of 4 people and OIOS fills the roles they can't afford to hire
- NOT mention pricing, tiers, or specific features
- End with a simple CTA: "Want to see what it sounds like when AI answers your phone? I can set up a 2-minute demo call — just reply."
- Be signed by "Wes Overstreet, OIOS" with no title

${contextLine}

Keep it under 150 words. Use a simple HTML layout with inline styles — white background, dark text, readable font. No images, no logos, no fancy formatting. This should feel like a personal email, not a marketing blast. Do not include a subject line in the HTML.`,
  }
}

// ============================================================
// Campaign & Review Response Templates (Phase 6)
// ============================================================

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  channel: 'Email' | 'SMS' | 'Both'
  subject?: string
  body: string
  previewLines: string[]
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'review-request',
    name: 'Review Request',
    description: 'Ask happy customers to leave a review',
    channel: 'Both',
    subject: 'Quick favor — share your experience?',
    body: 'Hi [name], we hope you loved your recent service! Could you take 30 seconds to leave us a quick review? It really helps small businesses like ours. [link]',
    previewLines: [
      'Hi [name],',
      'We hope you loved your recent service!',
      'Leave us a quick review → [link]',
      'Thanks so much!',
    ],
  },
  {
    id: 're-engagement',
    name: 'Re-engagement',
    description: 'Reach out to dormant or inactive customers',
    channel: 'Email',
    subject: "It's been a while — we'd love to catch up!",
    body: "Hi [name], it's been a while since we heard from you. We just wanted to check in and let you know we're here if you ever need us. Same great service, same friendly team!",
    previewLines: [
      "Hi [name], it's been a while!",
      'Just checking in — we miss you.',
      'Same great service, same friendly team.',
      'Reply to book anytime → [link]',
    ],
  },
  {
    id: 'seasonal-promotion',
    name: 'Seasonal Promotion',
    description: 'Seasonal offer or holiday greeting',
    channel: 'Both',
    subject: 'Happy [season] from [business]!',
    body: "Hi [name], happy [season] from all of us at [business]! As our way of saying thanks, we're offering [discount] off your next service. Valid through [date]. Book now → [link]",
    previewLines: [
      'Hi [name],',
      'Happy [season] from [business]!',
      '[discount] off your next service.',
      'Book now → [link]',
    ],
  },
  {
    id: 'win-back',
    name: 'Win-back',
    description: 'Loyalty offer to win back lost customers',
    channel: 'Email',
    subject: "We'd love to have you back, [name]!",
    body: "Hi [name], we noticed you haven't been by in a while. We'd love to have you back! As a special thank-you, enjoy [discount] on your next visit. No strings attached. Book now → [link]",
    previewLines: [
      'Hi [name],',
      "We'd love to have you back!",
      '[discount] off your next visit.',
      'No strings attached. Book now → [link]',
    ],
  },
  {
    id: 'monthly-newsletter',
    name: 'Monthly Newsletter',
    description: 'Regular updates, tips, and news',
    channel: 'Email',
    subject: '[Business] Monthly Update — [Month]',
    body: "Hi [name], here's what's new at [business] this month:\n\n• [Tip or news item 1]\n• [Tip or news item 2]\n• [Special offer for subscribers]\n\nHave questions? Reply anytime. We're happy to help!",
    previewLines: [
      "Hi [name], here's what's new:",
      '• [News/tip 1]',
      '• [News/tip 2]',
      '• [Subscriber special]',
    ],
  },
]

// ── Review response builder ───────────────────────────────────

export function buildReviewResponseTemplate(
  reviewerName: string,
  rating: number,
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
): string {
  const templates: Record<string, string> = {
    positive: `Hi ${reviewerName}, thank you so much for your wonderful ${rating}-star review! We're thrilled to hear about your positive experience. Our team takes great pride in delivering top-quality service, and your kind words mean the world to us. We look forward to serving you again soon!`,
    neutral: `Hi ${reviewerName}, thank you for taking the time to share your feedback. We appreciate your input and always strive to improve. If there's anything we could have done better, please don't hesitate to reach out directly. We'd love to hear from you!`,
    negative: `Hi ${reviewerName}, we're sorry to hear your experience didn't meet your expectations. That's not the standard we hold ourselves to, and we take this seriously. Please reach out to us directly so we can make this right. We value your business and want to ensure every interaction is a positive one.`,
    urgent: `Hi ${reviewerName}, we are so sorry about your experience. This is absolutely not how we do business, and we take full responsibility. Please contact us immediately at [phone] so we can address this directly. Your satisfaction is our top priority, and we will make this right.`,
  }
  return templates[sentiment] || templates.neutral
}
