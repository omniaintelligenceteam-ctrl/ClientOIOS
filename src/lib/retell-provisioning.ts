const RETELL_API_KEY = process.env.RETELL_API_KEY || ''
const WEBHOOK_URL = 'https://client-oios.vercel.app/api/webhooks/retell'

export interface BusinessConfig {
  businessName: string
  trade: string
  ownerName: string
  services: string[]
  businessHours: string
  timezone: string
  phone: string
  faq: { question: string; answer: string }[]
  emergencyKeywords?: string[]
  agentPersonality?: string
}

/**
 * Generates a Retell agent prompt customized for a specific client business.
 */
export function generateAgentPrompt(config: BusinessConfig): string {
  const serviceList = config.services.map((s) => `- ${s}`).join('\n')
  const faqList = config.faq
    .map((f) => `Caller asks: "${f.question}"\nAnswer: "${f.answer}"`)
    .join('\n\n')
  const emergencyWords = config.emergencyKeywords?.join(', ') || 'emergency, flood, fire, gas leak, burst pipe, no heat, no AC'
  const personality = config.agentPersonality || 'Professional and warm. Like the best receptionist anyone has ever talked to.'

  return `## Identity

You are Sarah, the AI receptionist for ${config.businessName}. You answer every call professionally and make callers feel like everything is handled. You work for ${config.ownerName}.

---

## Voice Rules

- ${personality}
- Maximum 50 words per response. Two to three sentences, then pause.
- One thought at a time. Never monologue.
- Sound human. Use contractions. Be conversational.
- Ask ONE question at a time.
- Use their name once you get it, but do not overuse it.
- Mirror the caller's energy.

---

## Business Information

**Business:** ${config.businessName}
**Industry:** ${config.trade}
**Hours:** ${config.businessHours}
**Phone:** ${config.phone}
**Timezone:** ${config.timezone}

**Services offered:**
${serviceList}

---

## Conversation Flow

### Answering
Pick up and say: "Thanks for calling ${config.businessName}, this is Sarah. How can I help you today?"

### Common Scenarios

**Caller wants to schedule:** "I would be happy to help you with that. Let me grab a few details. What is your name?" Then get: name, phone number, what service they need, and when works best for them. Confirm the details back.

**Caller has a question about services:** Answer using the business information and FAQ below. If you do not know the specific answer, say: "That is a great question. Let me have ${config.ownerName} follow up with you on that. Can I grab your name and number?"

**Caller wants pricing:** "Pricing depends on the specifics of what you need. I can have ${config.ownerName} put together a quote for you. Can I get your name and a good callback number?"

**Caller wants to speak to ${config.ownerName}:** "${config.ownerName} is not available right now, but I can make sure they get back to you quickly. Can I grab your name and number and what it is regarding?"

**Returning caller:** If they mention a previous call or job, acknowledge it: "Welcome back! Let me help you with that."

### Emergency Handling
If the caller mentions any of these: ${emergencyWords} — treat it as urgent. Say: "That sounds urgent. Let me get your information right away so we can get someone out to you." Get name, address, phone, and nature of the emergency. Flag as priority.

---

## FAQ

${faqList || 'No specific FAQs configured yet. For questions you cannot answer, offer to have the owner follow up.'}

---

## Information to Capture on Every Call

Always try to get:
1. Caller's name
2. Phone number
3. What they need (service, question, or issue)
4. How urgent it is
5. Best time to reach them if a callback is needed

---

## What You Never Do

- Never make up pricing or give specific dollar amounts unless provided in FAQ
- Never commit ${config.ownerName} to a specific time without checking
- Never be rude or dismissive
- Never say "I am just an AI" dismissively
- Never transfer to voicemail if you can help
- Never rush the conversation
- Never share other customers' information`
}

/**
 * Creates a new Retell agent with a business-specific prompt,
 * configures call analysis, and optionally purchases a phone number.
 */
export async function provisionAgent(config: BusinessConfig): Promise<{
  agentId: string
  phoneNumber: string | null
  llmId: string | null
}> {
  const prompt = generateAgentPrompt(config)

  // Step 1: Create the agent with the custom prompt
  const agentResp = await fetch('https://api.retellai.com/create-agent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_name: `Sarah - ${config.businessName}`,
      response_engine: {
        type: 'retell-llm',
        llm_id: undefined, // Retell creates a new LLM automatically
      },
      voice_id: '11labs-Adrian', // Default warm professional voice
      webhook_url: WEBHOOK_URL,
      post_call_analysis_data: [
        { type: 'system-presets', name: 'call_summary', description: 'Write a 1-3 sentence summary of the call.' },
        { type: 'system-presets', name: 'call_successful', description: 'Evaluate whether the agent had a successful call.' },
        { type: 'system-presets', name: 'user_sentiment', description: 'Evaluate user sentiment, mood and satisfaction.' },
        { type: 'string', name: 'caller_name', description: 'Extract the full name of the caller. If not stated, return Unknown.' },
        { type: 'string', name: 'service_needed', description: 'What service or help does the caller need? 5-15 words.' },
        { type: 'string', name: 'urgency', choices: ['emergency', 'urgent', 'normal', 'low'], description: 'Rate urgency based on caller tone and issue.' },
        { type: 'boolean', name: 'appointment_requested', description: 'Did the caller want to schedule an appointment?' },
      ],
    }),
  })

  if (!agentResp.ok) {
    const err = await agentResp.json().catch(() => ({}))
    throw new Error(`Retell agent creation failed: ${JSON.stringify(err)}`)
  }

  const agent = await agentResp.json()
  const agentId = agent.agent_id
  const llmId = agent.response_engine?.llm_id || null

  // Step 2: Update the LLM with the custom prompt
  if (llmId) {
    const llmResp = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        general_prompt: prompt,
        begin_message: `Thanks for calling ${config.businessName}, this is Sarah. How can I help you today?`,
      }),
    })

    if (!llmResp.ok) {
      console.error('LLM prompt update failed:', await llmResp.text())
    }
  }

  // Step 3: Purchase a phone number (if available)
  let phoneNumber: string | null = null
  try {
    const phoneResp = await fetch('https://api.retellai.com/create-phone-number', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        area_code: config.phone?.slice(1, 4) || '480', // Try to match the business's area code
      }),
    })

    if (phoneResp.ok) {
      const phoneData = await phoneResp.json()
      phoneNumber = phoneData.phone_number || null
    }
  } catch (err) {
    console.error('Phone number purchase failed (non-fatal):', err)
  }

  return { agentId, phoneNumber, llmId }
}
