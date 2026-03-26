# Database Schema — OIOS Client Dashboard

This document details all database tables inferred from the TypeScript type definitions in `types.ts`. The schema is designed for multi-tenancy using Supabase (PostgreSQL) with Row Level Security (RLS).

## Core Multi-Tenancy Pattern
All tables include `organization_id` to scope data to a specific client organization. Row Level Security (RLS) policies restrict access to rows where `organization_id` matches the authenticated user's organization.

## Tables Overview

### 1. `organizations`
Core client organization record.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| name | string | Business name |
| slug | string | URL‑safe identifier |
| trade | string | Trade/service category (HVAC, plumbing, etc.) |
| tier | Enum: 'answering_service' → 'coo' | Subscription tier |
| phone_number | string? | Main business phone |
| forwarding_number | string? | Call‑forwarding number |
| timezone | string | Business timezone (e.g., "America/New_York") |
| business_hours | JSON? | Weekly schedule: `{"monday": {"open": "09:00", "close": "17:00"}, …}` |
| service_area | string[]? | Array of ZIP codes or city names |
| services_offered | string[]? | Array of offered services |
| emergency_keywords | string[]? | Keywords that trigger emergency routing |
| emergency_phone | string? | After‑hours emergency number |
| ai_agent_name | string | AI agent display name |
| ai_agent_voice_id | string? | Voice provider identifier |
| ai_agent_personality | string? | Personality prompt |
| onboarding_status | Enum: 'pending' → 'paused' | Current onboarding phase |
| stripe_customer_id | string? | Stripe customer identifier |
| stripe_subscription_id | string? | Active subscription ID |
| monthly_minutes_included | number | Monthly minutes included in plan |
| monthly_minutes_used | number | Minutes used this month |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last update time |

**Relationships:**
- One‑to‑many → `users`, `calls`, `leads`, `customers`, `appointments`, `invoices`, `reviews`, `activity_feed`, `daily_reports`, `team_members`, `chat_conversations`, `automation_rules`, `automation_queue`, `automation_logs`, `revenue_events`, `business_metrics_daily`
- Foreign key: `organization_id` on all child tables

### 2. `users`
Authenticated users within an organization.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key (matches Supabase Auth `auth.users.id`) |
| organization_id | string | References `organizations.id` |
| full_name | string | Display name |
| email | string | Email address (unique per organization) |
| phone | string? | Phone number |
| role | Enum: 'owner' → 'viewer' | User role |
| avatar_url | string? | Profile image URL |
| notification_preferences | JSON? | `{"email": true, "push": false, …}` |
| is_super_admin | boolean? | Global admin flag |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- One‑to‑many → `appointments` (`created_by`), `automation_queue` (`approved_by`)
- Foreign key: `assigned_to` in `leads`, `appointments` references `users.id`

### 3. `calls`
Call log from voice AI system (VAPI).

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| external_call_id | string? | VAPI/Zoom/etc. identifier |
| caller_phone | string | Caller phone number |
| caller_name | string? | Caller name if recognized |
| direction | Enum: 'inbound'/'outbound' | Call direction |
| status | Enum: 'answered' → 'transferred' | Final call status |
| duration_seconds | number | Call length in seconds |
| started_at | timestamp | Call start time |
| ended_at | timestamp? | Call end time |
| recording_url | string? | Cloud recording URL |
| transcript | string? | Full transcript |
| transcript_summary | string? | AI‑generated summary |
| sentiment | Enum: 'positive' → 'urgent' | Call sentiment |
| intent | string? | AI‑detected intent (e.g., "book appointment") |
| extracted_data | JSON? | Structured data extracted (contact info, service needed) |
| ai_agent_handled | boolean | Whether AI handled the call |
| escalated_to_human | boolean | Whether call was escalated |
| escalation_reason | string? | Reason for escalation |
| lead_id | string? | References `leads.id` if lead created |
| appointment_id | string? | References `appointments.id` if appointment booked |
| tags | string[]? | Custom tags |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `leads`, `appointments`

### 4. `leads`
Prospect/potential customer records.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| customer_id | string? | References `customers.id` if converted |
| source | Enum: 'phone_call' → 'manual' | Lead source |
| status | Enum: 'new' → 'dormant' | Pipeline stage |
| priority | Enum: 'hot'/'warm'/'cold' | Manual priority flag |
| score | number (0‑100) | Lead score |
| score_reasons | string[]? | Reasons for score |
| first_name | string | First name |
| last_name | string | Last name |
| phone | string | Primary contact phone |
| email | string? | Email address |
| address | string? | Service address |
| service_needed | string | Description of needed service |
| estimated_value | number | Estimated job value |
| notes | string? | Internal notes |
| follow_up_date | timestamp? | Next follow‑up date |
| follow_up_count | number | Number of follow‑up attempts |
| last_contact_at | timestamp? | Last contact timestamp |
| won_at | timestamp? | Date lead was won |
| lost_at | timestamp? | Date lead was lost |
| lost_reason | string? | Reason for loss |
| assigned_to | string? | References `users.id` |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last update time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `customers`
- One‑to‑many → `calls`, `appointments`, `revenue_events`

### 5. `customers`
Converted customers with service history.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| first_name | string | First name |
| last_name | string | Last name |
| phone | string | Primary contact phone |
| email | string? | Email address |
| address | string? | Service address |
| notes | string? | Internal notes |
| tags | string[]? | Segmentation tags |
| total_jobs | number | Count of completed jobs |
| total_revenue | number | Total revenue from customer |
| lifetime_value | number | Calculated LTV |
| first_contact_at | timestamp? | First contact date |
| last_contact_at | timestamp? | Most recent contact |
| satisfaction_score | number? (0‑10) | Average satisfaction score |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last update time |

**Relationships:**
- Many‑to‑one → `organizations`
- One‑to‑many → `leads`, `appointments`, `invoices`, `reviews`, `revenue_events`

### 6. `appointments`
Scheduled service appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| customer_id | string | References `customers.id` |
| lead_id | string? | References `leads.id` |
| assigned_to | string? | References `users.id` or `team_members.id` |
| service_type | string | Type of service |
| status | Enum: 'scheduled' → 'rescheduled' | Appointment status |
| scheduled_date | date | Appointment date |
| scheduled_time_start | time | Start time |
| scheduled_time_end | time | End time |
| actual_start | timestamp? | Actual start time |
| actual_end | timestamp? | Actual end time |
| address | string | Service address |
| estimated_value | number? | Estimated job value |
| actual_value | number? | Actual billed amount |
| notes | string? | Internal notes |
| reminder_sent | boolean | Whether reminder was sent |
| confirmation_sent | boolean | Whether confirmation was sent |
| customer_confirmed | boolean | Whether customer confirmed |
| created_by | string | References `users.id` |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last update time |

**Relationships:**
- Many‑to‑one → `organizations`, `customers`
- Optional many‑to‑one → `leads`
- One‑to‑many → `invoices`, `revenue_events`

### 7. `invoices`
Billing invoices.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| customer_id | string | References `customers.id` |
| appointment_id | string? | References `appointments.id` |
| invoice_number | string | Unique invoice number (e.g., INV‑2025‑001) |
| status | Enum: 'draft' → 'partially_paid' | Invoice status |
| amount | number | Total amount |
| amount_paid | number | Amount paid to date |
| tax_amount | number | Tax amount |
| line_items | JSON | Array of `{description, quantity, unit_price, total}` |
| due_date | date | Due date |
| sent_at | timestamp? | When invoice was sent |
| paid_at | timestamp? | When fully paid |
| payment_method | string? | Payment method used |
| reminder_count | number | Number of reminders sent |
| last_reminder_at | timestamp? | Last reminder timestamp |
| notes | string? | Internal notes |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last update time |

**Relationships:**
- Many‑to‑one → `organizations`, `customers`
- Optional many‑to‑one → `appointments`
- One‑to‑many → `revenue_events`

### 8. `reviews`
Customer reviews from various platforms.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| customer_id | string? | References `customers.id` |
| platform | Enum: 'google' → 'other' | Review platform |
| rating | number (1‑5) | Star rating |
| review_text | string? | Review text |
| reviewer_name | string | Reviewer display name |
| review_url | string? | URL to original review |
| response_text | string? | Business response text |
| response_status | Enum: 'pending' → 'skipped' | Response workflow status |
| responded_at | timestamp? | When response was posted |
| sentiment | Enum: 'positive' → 'urgent' | AI sentiment analysis |
| review_date | timestamp | Date review was posted |
| request_sent | boolean | Whether review request was sent |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `customers`

### 9. `activity_feed`
Real‑time activity stream for dashboard.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| actor | string | User or system that performed action |
| action | string | Verb (e.g., "created_lead", "sent_invoice") |
| entity_type | string | Table name (e.g., "leads", "calls") |
| entity_id | string? | ID of affected row |
| metadata | JSON? | Additional context |
| importance | Enum: 'low' → 'critical' | Priority for notification |
| read | boolean | Whether user has seen this |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`

### 10. `daily_reports`
AI‑generated daily briefings.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| report_date | date | Date the report covers |
| report_type | string | Report type (e.g., "morning_briefing", "end_of_day") |
| content | JSON | Structured data |
| narrative | string | Natural‑language summary |
| metrics | JSON | Key metrics snapshot |
| delivered_via | string[] | Delivery channels: `["push", "email", "dashboard"]` |
| delivered_at | timestamp? | When delivered |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`

### 11. `team_members`
Field technicians and staff.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| user_id | string? | References `users.id` if linked to auth user |
| name | string | Full name |
| phone | string | Contact phone |
| email | string? | Email address |
| role | string | Job title/role |
| skills | string[]? | Array of skills |
| service_area | string[]? | ZIP codes or areas they service |
| availability | JSON? | Weekly availability schedule |
| is_on_call | boolean | Whether currently on call |
| performance_score | number? (0‑10) | Performance rating |
| total_jobs_completed | number | Total jobs completed |
| average_review_score | number? (0‑5) | Average review score |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `users`
- Foreign key: `assigned_to` in `appointments` may reference `team_members.id`

### 12. `chat_conversations`
AI chat conversation threads.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| user_id | string | References `users.id` |
| title | string? | Conversation title |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last message timestamp |

**Relationships:**
- Many‑to‑one → `organizations`, `users`
- One‑to‑many → `chat_messages`

### 13. `chat_messages`
Individual messages within a chat conversation.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| conversation_id | string | References `chat_conversations.id` |
| role | Enum: 'user'/'assistant' | Message sender |
| content | string | Message text |
| model_used | string? | AI model used (e.g., "claude-3-sonnet") |
| context_tokens | number? | Token count of context |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `chat_conversations`

### 14. `notifications`
User notifications (in‑app and push).

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| user_id | string? | References `users.id` (null for broadcast) |
| type | Enum: 'call_answered' → 'system' | Notification category |
| title | string | Notification title |
| body | string | Notification body |
| icon | string? | Icon name/URL |
| href | string? | Link target |
| metadata | JSON | Additional data |
| read | boolean | Whether user has read it |
| pushed | boolean | Whether push notification was sent |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `users`

### 15. `push_subscriptions`
Browser push notification subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| user_id | string | References `users.id` |
| organization_id | string | References `organizations.id` |
| endpoint | string | Push service endpoint |
| keys_p256dh | string | Public key |
| keys_auth | string | Authentication secret |
| user_agent | string? | Browser user agent |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `users`, `organizations`

### 16. `automation_rules`
Automation workflow rules.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| action_type | Enum: 'follow_up_email' → 'appointment_reminder' | Automation type |
| mode | Enum: 'auto'/'approve' | Execution mode |
| enabled | boolean | Whether rule is active |
| config | JSON | Rule configuration |
| created_at | timestamp | Row creation time |
| updated_at | timestamp | Last update time |

**Relationships:**
- Many‑to‑one → `organizations`
- One‑to‑many → `automation_queue`

### 17. `automation_queue`
Pending automation actions.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| rule_id | string | References `automation_rules.id` |
| action_type | Enum: 'follow_up_email' → 'appointment_reminder' | Automation type |
| status | Enum: 'pending' → 'failed' | Queue status |
| target_entity_type | string | Table name (e.g., "leads", "invoices") |
| target_entity_id | string | Row ID of target |
| payload | JSON | Action‑specific data |
| scheduled_for | timestamp? | When to execute |
| approved_by | string? | References `users.id` |
| approved_at | timestamp? | Approval timestamp |
| executed_at | timestamp? | Execution timestamp |
| error | string? | Error message if failed |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`, `automation_rules`
- Optional many‑to‑one → `users` (`approved_by`)

### 18. `automation_logs`
Executed automation actions log.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| queue_item_id | string? | References `automation_queue.id` |
| action_type | Enum: 'follow_up_email' → 'appointment_reminder' | Automation type |
| status | Enum: 'sent' → 'clicked' | Delivery status |
| target_name | string? | Recipient name |
| target_contact | string? | Email/phone number |
| details | string? | Additional details |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `automation_queue`

### 19. `revenue_events`
Financial transactions for revenue attribution.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| customer_id | string? | References `customers.id` |
| lead_id | string? | References `leads.id` |
| invoice_id | string? | References `invoices.id` |
| event_type | Enum: 'invoice_paid'/'job_completed'/'subscription_payment' | Event type |
| amount | number | Revenue amount |
| cost | number | Associated cost |
| source | string? | Source attribution |
| event_date | timestamp | Date revenue occurred |
| created_at | timestamp | Row creation time |

**Relationships:**
- Many‑to‑one → `organizations`
- Optional many‑to‑one → `customers`, `leads`, `invoices`

### 20. `business_metrics_daily`
Daily aggregated business KPIs.

| Column | Type | Description |
|--------|------|-------------|
| id | string (UUID) | Primary key |
| organization_id | string | References `organizations.id` |
| metric_date | date | Date of metrics |
| calls_total | number | Total calls |
| calls_answered | number | Answered calls |
| calls_missed | number | Missed calls |
| avg_call_duration_seconds | number | Average call duration |
| leads_created | number | New leads created |
| leads_converted | number | Leads converted to customers |
| appointments_booked | number | Appointments booked |
| appointments_completed | number | Appointments completed |
| revenue | number | Daily revenue |
| invoices_sent | number | Invoices sent |
| invoices_paid | number | Invoices paid |
| invoices_overdue | number | Overdue invoices |
| reviews_received | number | New reviews |
| avg_review_rating | number | Average review rating |
| automations_executed | number | Automations executed |

**Relationships:**
- Many‑to‑one → `organizations`

## Index Recommendations

```sql
-- Essential indexes for performance
CREATE INDEX idx_calls_org_date ON calls (organization_id, started_at DESC);
CREATE INDEX idx_leads_org_status ON leads (organization_id, status);
CREATE INDEX idx_leads_follow_up ON leads (organization_id, follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_appointments_org_date ON appointments (organization_id, scheduled_date);
CREATE INDEX idx_invoices_org_due ON invoices (organization_id, due_date);
CREATE INDEX idx_reviews_org_date ON reviews (organization_id, review_date DESC);
CREATE INDEX idx_activity_org_importance ON activity_feed (organization_id, importance DESC, created_at DESC);
CREATE INDEX idx_business_metrics_org_date ON business_metrics_daily (organization_id, metric_date DESC);
```

## Supabase RLS Policies

All tables should have Row Level Security enabled with policies similar to:

```sql
-- Example: organizations table (users can only read their own org)
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));
```

Each child table should have a policy restricting access to rows where `organization_id` matches the user's organization.

## Schema Evolution

When adding new columns or tables:
1. Update `src/lib/types.ts` first
2. Create migration using Supabase CLI
3. Update this document
4. Update any affected queries in the application
