'use client'

import { useState, useEffect } from 'react'
import { X, Bell } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'

interface NotificationSettingsProps {
  onClose: () => void
}

interface PreferenceToggle {
  key: string
  label: string
  description: string
  defaultEnabled: boolean
}

const PREFERENCE_TOGGLES: PreferenceToggle[] = [
  {
    key: 'lead_created',
    label: 'New Lead Alerts',
    description: 'Get notified when a new lead is captured',
    defaultEnabled: true,
  },
  {
    key: 'missed_call',
    label: 'Missed Call Alerts',
    description: 'Get notified when a call is missed',
    defaultEnabled: true,
  },
  {
    key: 'invoice_paid',
    label: 'Invoice Paid',
    description: 'Get notified when an invoice is paid',
    defaultEnabled: true,
  },
  {
    key: 'review_received',
    label: 'Review Received',
    description: 'Get notified when a new review comes in',
    defaultEnabled: true,
  },
  {
    key: 'briefing_ready',
    label: 'Morning Briefing Ready',
    description: 'Daily summary notification is ready',
    defaultEnabled: true,
  },
  {
    key: 'overdue_followup',
    label: 'Overdue Follow-Up Alerts',
    description: 'Get notified about overdue follow-ups',
    defaultEnabled: true,
  },
  {
    key: 'invoice_overdue',
    label: 'Invoice Overdue Alerts',
    description: 'Get notified when invoices become overdue',
    defaultEnabled: true,
  },
  {
    key: 'automation_completed',
    label: 'Automation Completed',
    description: 'Get notified when automations finish executing',
    defaultEnabled: false,
  },
]

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { profile } = useAuth()
  const userId = profile?.id || ''
  const organizationId = profile?.organization_id || ''

  const [preferences, setPreferences] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREFERENCE_TOGGLES.map((t) => [t.key, t.defaultEnabled]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load existing preferences
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences((prev) => ({ ...prev, ...profile.notification_preferences }))
    }
  }, [profile])

  async function handleToggle(key: string) {
    const newPrefs = { ...preferences, [key]: !preferences[key] }
    setPreferences(newPrefs)

    setSaving(true)
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    await supabase
      .from('users')
      .update({ notification_preferences: newPrefs })
      .eq('id', userId)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="w-80 bg-[#111827] border-l border-[rgba(148,163,184,0.1)] shadow-xl shadow-black/50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#2DD4BF]" />
              <span className="text-sm font-semibold text-[#F8FAFC]">Notification Settings</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Saved toast */}
          {saved && (
            <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <span>✓</span> Preferences saved
            </div>
          )}

          {/* Toggles */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
            {PREFERENCE_TOGGLES.map((toggle) => (
              <div
                key={toggle.key}
                className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex-1 pr-3">
                  <p className="text-sm font-medium text-[#F8FAFC]">{toggle.label}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">{toggle.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(toggle.key)}
                  disabled={saving}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/40 ${
                    preferences[toggle.key]
                      ? 'bg-[#2DD4BF]'
                      : 'bg-[rgba(148,163,184,0.2)]'
                  }`}
                  aria-checked={preferences[toggle.key]}
                  role="switch"
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      preferences[toggle.key] ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[rgba(148,163,184,0.1)] px-5 py-4">
            <p className="text-xs text-[#64748B] text-center">
              Changes apply immediately and are saved to your profile.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
