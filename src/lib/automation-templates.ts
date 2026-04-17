// ============================================================
// OIOS Client Dashboard — Automation Email Templates
// Returns subject + ready-to-send HTML (no AI generation needed)
// ============================================================

import { unsubscribeUrl, senderPhysicalAddress } from './compliance'

export interface AutomationContext {
  businessName: string
  customerName: string
  customerEmail: string
  metadata: Record<string, unknown>
}

export interface AutomationTemplate {
  subject: string
  html: string
  unsubscribeUrl: string
}

// ---------------------------------------------------------------------------
// Shared email wrapper — clean, inline-styled HTML that works everywhere
// ---------------------------------------------------------------------------

function emailWrap(businessName: string, body: string, recipientEmail: string): string {
  const unsubUrl = unsubscribeUrl(recipientEmail)
  const address = senderPhysicalAddress()
  const footer = `
<tr><td style="padding:0 28px 24px;">
<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#71717a;">
You received this email from ${businessName}. If you'd rather not receive these, <a href="${unsubUrl}" style="color:#71717a;text-decoration:underline;">unsubscribe here</a>.
</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">${address}</p>
</td></tr>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="padding:32px 28px 24px;">
${body}
</td></tr>
${footer}
</table>
</td></tr>
</table>
</body>
</html>`
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#27272a;">${text}</p>`
}

function greeting(name: string): string {
  return p(`Hi ${name},`)
}

function signoff(name: string): string {
  return `<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#27272a;">Best,<br><strong>${name}</strong></p>`
}

function wesSignoff(): string {
  return `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#27272a;"><strong>Wes Overstreet</strong><br>CEO, OIOS<br><a href="https://getoios.com" style="color:#0d9488;text-decoration:none;">getoios.com</a></p>`
}

function button(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#0d9488;border-radius:6px;padding:12px 24px;"><a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${text}</a></td></tr></table>`
}

// ── follow_up_email ──────────────────────────────────────────
export function follow_up_email(ctx: AutomationContext): AutomationTemplate {
  const { businessName, customerName, customerEmail, metadata } = ctx
  const serviceType = (metadata.service_type as string) || 'your recent service'
  const techName = (metadata.tech_name as string) || ''

  const techLine = techName ? ` ${techName} and the` : ' The'

  return {
    subject: `Thank you for choosing ${businessName}!`,
    html: emailWrap(businessName, [
      greeting(customerName),
      p(`Thank you for trusting ${businessName} with ${serviceType}.${techLine} team enjoyed working with you, and we hope everything exceeded your expectations.`),
      p(`If anything needs attention or you have questions about the work, don't hesitate to reach out — we're always happy to help.`),
      p(`We appreciate your business and look forward to serving you again.`),
      signoff(businessName),
    ].join(''), customerEmail),
    unsubscribeUrl: unsubscribeUrl(customerEmail),
  }
}

// ── review_request ───────────────────────────────────────────
export function review_request(ctx: AutomationContext): AutomationTemplate {
  const { businessName, customerName, customerEmail, metadata } = ctx
  const reviewUrl = (metadata.review_url as string) || 'https://g.page/r/review'

  return {
    subject: `Quick favor — share your experience with ${businessName}?`,
    html: emailWrap(businessName, [
      greeting(customerName),
      p(`We hope you were happy with your recent experience! If you have a minute, we'd really appreciate a quick Google review. It only takes about 30 seconds and makes a huge difference for a small business like ours.`),
      button('Leave a Review', reviewUrl),
      p(`Thank you so much — it means the world to us.`),
      signoff(businessName),
    ].join(''), customerEmail),
    unsubscribeUrl: unsubscribeUrl(customerEmail),
  }
}

// ── invoice_reminder ─────────────────────────────────────────
export function invoice_reminder(ctx: AutomationContext): AutomationTemplate {
  const { businessName, customerName, customerEmail, metadata } = ctx
  const invoiceNumber = (metadata.invoice_number as string) || ''
  const amount = (metadata.amount as number) ?? null
  const dueDate = (metadata.due_date as string) || ''
  const paymentUrl = (metadata.payment_url as string) || ''

  const amountStr = amount !== null ? `$${Number(amount).toFixed(2)}` : 'the outstanding balance'
  const invoiceRef = invoiceNumber ? ` (Invoice #${invoiceNumber})` : ''
  const dueLine = dueDate ? ` This was due on <strong>${dueDate}</strong>.` : ''

  return {
    subject: `Payment reminder from ${businessName}${invoiceRef}`,
    html: emailWrap(businessName, [
      greeting(customerName),
      p(`This is a friendly reminder that <strong>${amountStr}</strong> is outstanding with ${businessName}${invoiceRef}.${dueLine}`),
      paymentUrl ? button('Make a Payment', paymentUrl) : '',
      p(paymentUrl
        ? `If you've already sent payment, please disregard this message. Questions? Just reply to this email.`
        : `Please contact us to arrange payment at your earliest convenience. If you've already sent payment, please disregard this message.`),
      signoff(businessName),
    ].join(''), customerEmail),
    unsubscribeUrl: unsubscribeUrl(customerEmail),
  }
}

// ── lead_nurture ─────────────────────────────────────────────
export function lead_nurture(ctx: AutomationContext): AutomationTemplate {
  const { customerName, customerEmail, metadata } = ctx
  const company = (metadata.company as string) || ''

  const name = customerName === 'Valued Customer' ? '' : customerName
  const greetName = name || (company ? company : '')
  const greetLine = greetName ? p(`Hey ${greetName},`) : p(`Hey there,`)
  const companyMention = company || 'your business'

  return {
    subject: `AI COO for ${companyMention}`,
    html: emailWrap('OIOS', [
      greetLine,
      p(`I wanted to thank you for your time and personally introduce you to OIOS — the AI COO for small businesses like yours, at the cost of a part-time employee.`),
      p(`We designed it to be user-friendly, even for someone with zero AI knowledge. Our goal is to show companies where AI business automation is today and work alongside you to implement new capabilities as they come.`),
      p(`Our products are designed to pay for themselves — and give you and your employees time and money back to focus on growing the business. We can answer the phone 24/7, automate back-office operations, help with content, keep finances organized, handle client onboarding and follow-ups, invoicing and payment reminders, and more. We're expanding our portfolio every day.`),
      p(`We offer a risk-free 30-day trial to show you how we can take ${companyMention} to the next level. We build it custom for you. If you like it, it's all yours. If not, no hard feelings.`),
      wesSignoff(),
    ].join(''), customerEmail),
    unsubscribeUrl: unsubscribeUrl(customerEmail),
  }
}

// ── appointment_reminder ─────────────────────────────────────
export function appointment_reminder(ctx: AutomationContext): AutomationTemplate {
  const { businessName, customerName, customerEmail, metadata } = ctx
  const serviceType = (metadata.service_type as string) || 'your appointment'
  const appointmentDate = (metadata.appointment_date as string) || 'tomorrow'
  const appointmentTime = (metadata.appointment_time as string) || ''
  const address = (metadata.address as string) || ''
  const techName = (metadata.tech_name as string) || ''
  const contactPhone = (metadata.contact_phone as string) || ''

  const timeStr = appointmentTime ? ` at <strong>${appointmentTime}</strong>` : ''
  const addressStr = address ? ` at ${address}` : ''
  const techStr = techName ? ` Your technician will be <strong>${techName}</strong>.` : ''
  const rescheduleStr = contactPhone
    ? `Need to reschedule? Call us at <strong>${contactPhone}</strong>.`
    : 'Need to reschedule? Just reply to this email.'

  return {
    subject: `Reminder: Your ${businessName} appointment is ${appointmentDate}`,
    html: emailWrap(businessName, [
      greeting(customerName),
      p(`Just a friendly reminder that your <strong>${serviceType}</strong> with ${businessName} is coming up on <strong>${appointmentDate}</strong>${timeStr}${addressStr}.${techStr}`),
      p(`We'll make sure everything goes smoothly. ${rescheduleStr}`),
      p(`See you soon!`),
      signoff(businessName),
    ].join(''), customerEmail),
    unsubscribeUrl: unsubscribeUrl(customerEmail),
  }
}

// ── prospect_outreach ────────────────────────────────────────
export function prospect_outreach(ctx: AutomationContext): AutomationTemplate {
  const { customerName, customerEmail, metadata } = ctx
  const company = (metadata.company as string) || ''

  const name = customerName === 'Valued Customer' ? '' : customerName
  const greetName = name || (company ? company : '')
  const greetLine = greetName ? p(`Hey ${greetName},`) : p(`Hey there,`)
  const companyMention = company || 'your business'

  return {
    subject: `AI COO for ${companyMention}`,
    html: emailWrap('OIOS', [
      greetLine,
      p(`I wanted to thank you for your time and personally introduce you to OIOS — the AI COO for small businesses like yours, at the cost of a part-time employee.`),
      p(`We designed it to be user-friendly, even for someone with zero AI knowledge. Our goal is to show companies where AI business automation is today and work alongside you to implement new capabilities as they come.`),
      p(`Our products are designed to pay for themselves — and give you and your employees time and money back to focus on growing the business. We can answer the phone 24/7, automate back-office operations, help with content, keep finances organized, handle client onboarding and follow-ups, invoicing and payment reminders, and more. We're expanding our portfolio every day.`),
      p(`We offer a risk-free 30-day trial to show you how we can take ${companyMention} to the next level. We build it custom for you. If you like it, it's all yours. If not, no hard feelings.`),
      wesSignoff(),
    ].join(''), customerEmail),
    unsubscribeUrl: unsubscribeUrl(customerEmail),
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
