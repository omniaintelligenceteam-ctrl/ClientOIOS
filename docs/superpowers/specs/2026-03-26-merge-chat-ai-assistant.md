# Merge Chat + AI Assistant into Single AI Assistant Tab

**Date:** 2026-03-26
**Status:** Approved

## Problem
Two sidebar tabs ("Chat" and "AI Assistant") both say "ask about your business" — confusing for clients. They're functionally overlapping with different implementations.

## Solution
Merge into one **AI Assistant** tab at `/dashboard/ai` that combines:
- **From Chat:** Streaming responses, conversation history/sidebar, persistent conversations
- **From AI Assistant:** Live stats sidebar (Revenue, Pipeline, Leads, Appointments, At-Risk), PredictiveRevenue widget, business-focused suggestion chips

## Layout
Option 1 selected: Stats live inside the conversation sidebar, below the conversation list.

```
┌──────────────────┬──────────────────────────┐
│ [+ New Chat]     │                          │
│ Conversation 1   │     Chat Messages        │
│ Conversation 2   │                          │
│ ...              │                          │
│                  │                          │
│ ─── Live Stats ──│                          │
│ Revenue MTD  $5k │                          │
│ Pipeline    $12k │                          │
│ Leads/wk      8  │     [Input Bar]          │
│ Appts today   3  │                          │
│ At-risk       1  │                          │
│ 30/60/90 Fcst    │                          │
└──────────────────┴──────────────────────────┘
```

Mobile: Stats accessible via toggle button in chat header.

## Files Changed

| File | Action |
|------|--------|
| `conversation-sidebar.tsx` | Add StatsSidebar + PredictiveRevenue below conversation list |
| `chat-empty-state.tsx` | Rebrand to "AI Assistant", merge best suggestions from both pages |
| `chat-full-page.tsx` | Add mobile stats toggle button in header |
| `/dashboard/ai/page.tsx` | Rewrite: ChatProvider + ChatFullPage, tier-gated |
| `/dashboard/chat/page.tsx` | Replace with redirect to `/dashboard/ai` |
| `layout.tsx` | Remove Chat from NAV_ITEMS |
| `bottom-nav.tsx` | Change Chat -> AI Assistant (Bot icon, `/dashboard/ai`) |
| `chat-panel.tsx` | Update "Open full" link from `/dashboard/chat` to `/dashboard/ai` |

## Files Untouched
- All `/api/dashboard/chat/` routes (streaming, conversations, messages)
- ChatProvider, ChatMessages, ChatInput, ChatTypingIndicator
- ChatFAB (floating bubble — still works via ChatProvider in layout)
- `context-builder.ts`, `system-prompt.ts`, `model-router.ts`
