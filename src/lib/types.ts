// ============================================================
// OIOS Client Dashboard — Type Definitions
// ============================================================

export type Tier = 'answering_service' | 'receptionist' | 'office_manager' | 'coo'
export type OnboardingStatus = 'pending' | 'configuring' | 'testing' | 'live' | 'paused'
export type UserRole = 'owner' | 'admin' | 'manager' | 'technician' | 'viewer'
export type CallStatus = 'answered' | 'missed' | 'voicemail' | 'abandoned' | 'transferred'
export type CallDirection = 'inbound' | 'outbound'
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'urgent'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost' | 'dormant'
export type LeadPriority = 'hot' | 'warm' | 'cold'
export type LeadSource = 'phone_call' | 'web_form' | 'referral' | 'social_media' | 'walk_in' | 'marketing_campaign' | 'manual'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid'
export type ReviewPlatform = 'google' | 'yelp' | 'facebook' | 'homeadvisor' | 'angi' | 'bbb' | 'other'
export type ReviewResponseStatus = 'pending' | 'drafted' | 'approved' | 'posted' | 'skipped'
export type FollowUpType = 'sms' | 'email' | 'call' | 'review_request' | 'payment_reminder' | 'satisfaction_check' | 'seasonal_reminder' | 'referral_request'
export type Importance = 'low' | 'medium' | 'high' | 'critical'

export interface Organization {
  id: string
  name: string
  slug: string
  trade: string
  tier: Tier
  phone_number: string | null
  forwarding_number: string | null
  timezone: string
  business_hours: Record<string, { open: string; close: string }> | null
  service_area: string[] | null
  services_offered: string[] | null
  emergency_keywords: string[] | null
  emergency_phone: string | null
  ai_agent_name: string
  ai_agent_voice_id: string | null
  ai_agent_personality: string | null
  onboarding_status: OnboardingStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  monthly_minutes_included: number
  monthly_minutes_used: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  notification_preferences: Record<string, boolean> | null
  is_super_admin?: boolean
  created_at: string
}

export interface Call {
  id: string
  organization_id: string
  external_call_id: string | null
  caller_phone: string
  caller_name: string | null
  direction: CallDirection
  status: CallStatus
  duration_seconds: number
  started_at: string
  ended_at: string | null
  recording_url: string | null
  transcript: string | null
  transcript_summary: string | null
  sentiment: Sentiment
  intent: string | null
  extracted_data: Record<string, unknown> | null
  ai_agent_handled: boolean
  escalated_to_human: boolean
  escalation_reason: string | null
  lead_id: string | null
  appointment_id: string | null
  tags: string[] | null
  created_at: string
}

export interface Lead {
  id: string
  organization_id: string
  customer_id: string | null
  source: LeadSource
  status: LeadStatus
  priority: LeadPriority
  score: number
  score_reasons: string[] | null
  first_name: string
  last_name: string
  phone: string
  email: string | null
  address: string | null
  service_needed: string
  estimated_value: number
  notes: string | null
  follow_up_date: string | null
  follow_up_count: number
  last_contact_at: string | null
  won_at: string | null
  lost_at: string | null
  lost_reason: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  tags: string[] | null
  total_jobs: number
  total_revenue: number
  lifetime_value: number
  first_contact_at: string | null
  last_contact_at: string | null
  satisfaction_score: number | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  organization_id: string
  customer_id: string
  lead_id: string | null
  assigned_to: string | null
  service_type: string
  status: AppointmentStatus
  scheduled_date: string
  scheduled_time_start: string
  scheduled_time_end: string
  actual_start: string | null
  actual_end: string | null
  address: string
  estimated_value: number | null
  actual_value: number | null
  notes: string | null
  reminder_sent: boolean
  confirmation_sent: boolean
  customer_confirmed: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  organization_id: string
  customer_id: string
  appointment_id: string | null
  invoice_number: string
  status: InvoiceStatus
  amount: number
  amount_paid: number
  tax_amount: number
  line_items: { description: string; quantity: number; unit_price: number; total: number }[]
  due_date: string
  sent_at: string | null
  paid_at: string | null
  payment_method: string | null
  reminder_count: number
  last_reminder_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  organization_id: string
  customer_id: string | null
  platform: ReviewPlatform
  rating: number
  review_text: string | null
  reviewer_name: string
  review_url: string | null
  response_text: string | null
  response_status: ReviewResponseStatus
  responded_at: string | null
  sentiment: Sentiment
  review_date: string
  request_sent: boolean
  created_at: string
}

export interface ActivityFeedItem {
  id: string
  organization_id: string
  actor: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  importance: Importance
  read: boolean
  created_at: string
}

export interface DailyReport {
  id: string
  organization_id: string
  report_date: string
  report_type: string
  content: Record<string, unknown>
  narrative: string
  metrics: Record<string, number>
  delivered_via: string[]
  delivered_at: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  organization_id: string
  user_id: string | null
  name: string
  phone: string
  email: string | null
  role: string
  skills: string[] | null
  service_area: string[] | null
  availability: Record<string, unknown> | null
  is_on_call: boolean
  performance_score: number | null
  total_jobs_completed: number
  average_review_score: number | null
  created_at: string
}

// Chat types
export interface ChatConversation {
  id: string
  organization_id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  model_used: string | null
  context_tokens: number | null
  created_at: string
}

// Notification types
export type NotificationType = 'call_answered' | 'lead_created' | 'briefing_ready' | 'invoice_paid' | 'review_received' | 'automation_completed' | 'system'

export interface AppNotification {
  id: string
  organization_id: string
  user_id: string | null
  type: NotificationType
  title: string
  body: string
  icon: string | null
  href: string | null
  metadata: Record<string, unknown>
  read: boolean
  pushed: boolean
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  organization_id: string
  endpoint: string
  keys_p256dh: string
  keys_auth: string
  user_agent: string | null
  created_at: string
}

// Automation types
export type AutomationActionType = 'follow_up_email' | 'review_request' | 'invoice_reminder' | 'lead_nurture' | 'appointment_reminder'
export type AutomationMode = 'auto' | 'approve'
export type AutomationQueueStatus = 'pending' | 'approved' | 'executed' | 'rejected' | 'failed'
export type AutomationLogStatus = 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked'

export interface AutomationRule {
  id: string
  organization_id: string
  action_type: AutomationActionType
  mode: AutomationMode
  enabled: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AutomationQueueItem {
  id: string
  organization_id: string
  rule_id: string
  action_type: AutomationActionType
  status: AutomationQueueStatus
  target_entity_type: string
  target_entity_id: string
  payload: Record<string, unknown>
  scheduled_for: string | null
  approved_by: string | null
  approved_at: string | null
  executed_at: string | null
  error: string | null
  created_at: string
}

export interface AutomationLogEntry {
  id: string
  organization_id: string
  queue_item_id: string | null
  action_type: AutomationActionType
  status: AutomationLogStatus
  target_name: string | null
  target_contact: string | null
  details: string | null
  created_at: string
}

// Business Intelligence types
export type RevenueEventType = 'invoice_paid' | 'job_completed' | 'subscription_payment'
export type RevenueSource = 'phone_call' | 'web_form' | 'referral' | 'social_media' | 'walk_in' | 'marketing_campaign' | 'manual'

export interface RevenueEvent {
  id: string
  organization_id: string
  customer_id: string | null
  lead_id: string | null
  invoice_id: string | null
  event_type: RevenueEventType
  amount: number
  cost: number
  source: string | null
  event_date: string
  created_at: string
}

export interface BusinessMetricsDaily {
  id: string
  organization_id: string
  metric_date: string
  calls_total: number
  calls_answered: number
  calls_missed: number
  avg_call_duration_seconds: number
  leads_created: number
  leads_converted: number
  appointments_booked: number
  appointments_completed: number
  revenue: number
  invoices_sent: number
  invoices_paid: number
  invoices_overdue: number
  reviews_received: number
  avg_review_rating: number
  automations_executed: number
}

// ============================================
// Command Center Types
// ============================================

export type TaskType =
  | 'health_check' | 'prompt_update' | 'prompt_deploy' | 'report' | 'weekly_report'
  | 'outreach' | 'onboarding_step' | 'monitoring' | 'content' | 'client_comms'
  | 'escalation' | 'invoice' | 'follow_up' | 'research' | 'call_analysis'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled'

export type PlatformId = 'openclaw' | 'claude-code' | 'claude-cowork' | 'wes'

export type MessageType = 'request' | 'response' | 'notification' | 'escalation' | 'handoff' | 'status_update'

export type MessageStatus = 'sent' | 'received' | 'processing' | 'resolved' | 'failed'

export interface CommandCenterTask {
  id: string
  organization_id: string | null
  title: string
  description: string | null
  task_type: TaskType
  priority: TaskPriority
  status: TaskStatus
  assigned_platform: PlatformId | null
  assigned_agent: string | null
  routed_by: string
  created_by_platform: PlatformId
  trigger_type: string | null
  trigger_ref: string | null
  started_at: string | null
  completed_at: string | null
  result: Record<string, unknown> | null
  result_summary: string | null
  error_message: string | null
  requires_approval: boolean
  approved_by: string | null
  parent_task_id: string | null
  metadata: Record<string, unknown>
  due_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  organization?: Organization
}

export interface TaskRoutingRule {
  id: string
  rule_name: string
  task_type: string
  conditions: Record<string, unknown>
  target_platform: PlatformId
  target_agent: string | null
  priority: number
  enabled: boolean
  requires_approval: boolean
  created_at: string
}

export interface AgentMessage {
  id: string
  organization_id: string | null
  task_id: string | null
  from_platform: PlatformId | 'system'
  from_agent: string | null
  to_platform: PlatformId
  to_agent: string | null
  message_type: MessageType
  subject: string
  body: string
  in_reply_to: string | null
  status: MessageStatus
  metadata: Record<string, unknown>
  created_at: string
}

export interface ClientHealthScore {
  id: string
  organization_id: string
  score_date: string
  overall_score: number
  call_volume_score: number | null
  response_quality_score: number | null
  prompt_health_score: number | null
  alerts: Array<{ type: string; severity: string; message: string }>
  recommendations: Array<{ action: string; reason: string }>
  created_at: string
}

// Supabase Database type (simplified for direct use)
export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> }
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      calls: { Row: Call; Insert: Partial<Call>; Update: Partial<Call> }
      leads: { Row: Lead; Insert: Partial<Lead>; Update: Partial<Lead> }
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> }
      appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment> }
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> }
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> }
      activity_feed: { Row: ActivityFeedItem; Insert: Partial<ActivityFeedItem>; Update: Partial<ActivityFeedItem> }
      daily_reports: { Row: DailyReport; Insert: Partial<DailyReport>; Update: Partial<DailyReport> }
      team_members: { Row: TeamMember; Insert: Partial<TeamMember>; Update: Partial<TeamMember> }
      chat_conversations: { Row: ChatConversation; Insert: Partial<ChatConversation>; Update: Partial<ChatConversation> }
      chat_messages: { Row: ChatMessage; Insert: Partial<ChatMessage>; Update: Partial<ChatMessage> }
    }
  }
}
