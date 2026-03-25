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
