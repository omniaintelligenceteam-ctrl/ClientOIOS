# OIOS Client Dashboard

## Project Overview
Client-facing AI operating system dashboard for home services businesses (HVAC, plumbing, electrical, roofing, etc.). Provides real-time call handling, lead management, appointment scheduling, invoicing, and AI-powered automation.

## Tech Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 with custom dark theme
- **Database:** Supabase (PostgreSQL + Realtime)
- **Charts:** Recharts
- **Auth:** Supabase Auth + custom AuthProvider
- **AI:** Anthropic SDK for chat and automation
- **Icons:** Lucide React
- **Animations:** Motion library

## Theme (Dark)
- Background: #0B1120
- Surface/Card: #111827
- Primary (teal): #2DD4BF
- Secondary (orange): #f97316
- Border: rgba(148,163,184,0.1)
- Text primary: #F8FAFC
- Text secondary: #94A3B8
- Text muted: #64748B

## Folder Structure
```
src/
  app/
    (auth)/           # Login, signup, forgot-password
    api/              # API routes (automations, calls, webhooks, etc.)
    dashboard/        # Main dashboard pages
      calls/          # Call log and analytics
      leads/          # Lead pipeline management
      schedule/       # Appointment schedule
      customers/      # Customer database
      invoicing/      # Invoice management
      reviews/        # Review management
      marketing/      # Marketing campaigns
      team/           # Team management
      chat/           # AI chat interface
      analytics/      # Business analytics
      reports/        # Reports
      billing/        # Billing
      settings/       # Settings
      admin/          # Admin panel
  components/
    dashboard/
      charts/         # Recharts components (CallHeatmap, LeadFunnel, RevenueTrend)
      chat/           # Chat components (ChatFAB, ChatPanel, ChatProvider)
      approval-queue.tsx
      automation-activity-log.tsx
      customer-import-wizard.tsx
      empty-state.tsx
      live-activity-feed.tsx
      morning-briefing-card.tsx
      notification-center.tsx
      roi-summary-card.tsx
  hooks/
    useNotifications.ts
    useRealtimeFeed.ts
  lib/
    types.ts          # All TypeScript types
    supabase-browser.ts
    auth-context.tsx
    theme-context.tsx
    anthropic.ts
    demo-data.ts
    analytics/
    chat/
```

## Key Conventions

### Component Patterns
- All dashboard components use 'use client' directive
- Card components use class: `bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6`
- Stat cards use same card style + animation delays
- Import types from `@/lib/types` — never redefine

### Auth Pattern
- All dashboard routes wrapped in AuthProvider via layout.tsx
- useAuth() hook provides: user, profile, organization, isSuperAdmin, signOut
- organization_id from profile.organization_id

### Supabase Usage
- Browser client: `createSupabaseBrowserClient()` from `@/lib/supabase-browser`
- All queries use organization_id scoping for multi-tenancy
- Realtime subscriptions via Supabase channel

### Key Types
Organization, User, Call, Lead, Customer, Appointment, Invoice, Review, Campaign, FollowUp, ActivityFeedItem, DailyReport, TeamMember, ChatConversation, ChatMessage, AppNotification, AutomationRule, AutomationQueueItem, RevenueEvent, BusinessMetricsDaily

## Database Tables
See src/lib/db-schema.md for full schema documentation.

## How to Run Locally
```bash
npm install
npm run dev
```
Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- OPENAI_API_KEY (for AI features)
- ANTHROPIC_API_KEY (for Claude)
- VAPI_ORG_ID, VAPI_ACCESS_TOKEN (voice)
- RESEND_API_KEY (email)
