'use client'

import { useState, useCallback } from 'react'
import {
  LayoutDashboard,
  GitBranch,
  Layers,
  Activity,
  Zap,
  Plus,
  X,
} from 'lucide-react'
import { AutomationDashboard } from '@/components/dashboard/automations/automation-dashboard'
import { AutomationRuleBuilder } from '@/components/dashboard/automations/rule-builder'
import { AutomationTemplates } from '@/components/dashboard/automations/templates'
import { AutomationActivityLog } from '@/components/dashboard/automation-activity-log'
import { useAuth } from '@/lib/auth-context'
import type { AutomationRuleDraft } from '@/components/dashboard/automations/rule-builder'

/* ------------------------------------------------------------------ */
/*  Tabs                                                                */
/* ------------------------------------------------------------------ */

type TabId = 'dashboard' | 'my_rules' | 'templates' | 'activity'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my_rules', label: 'My Rules', icon: GitBranch },
  { id: 'templates', label: 'Templates', icon: Layers },
  { id: 'activity', label: 'Activity Log', icon: Activity },
]

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function AutomationsPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [showBuilder, setShowBuilder] = useState(false)

  const organizationId = profile?.organization_id ?? ''

  const handleSaveRule = useCallback((rule: AutomationRuleDraft) => {
    const stored = JSON.parse(localStorage.getItem('automation_rules') ?? '[]') as AutomationRuleDraft[]
    const idx = stored.findIndex((r) => r.id === rule.id)
    if (idx >= 0) {
      stored[idx] = rule
    } else {
      stored.push(rule)
    }
    localStorage.setItem('automation_rules', JSON.stringify(stored))
    setShowBuilder(false)
    setActiveTab('my_rules')
  }, [])

  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Header */}
      <div className="border-b border-[rgba(148,163,184,0.08)] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
              <Zap size={20} className="text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Automations</h1>
              <p className="text-sm text-slate-500">Build rules that work while you sleep</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowBuilder(true)
              setActiveTab('my_rules')
            }}
            className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 px-4 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors"
          >
            <Plus size={16} />
            New Rule
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-[rgba(148,163,184,0.08)] px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id !== 'my_rules') setShowBuilder(false)
                }}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-teal-400 text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'dashboard' && <AutomationDashboard />}

        {activeTab === 'my_rules' && (
          <div className="space-y-6">
            {showBuilder ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-200">New Automation Rule</h2>
                  <button
                    onClick={() => setShowBuilder(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <AutomationRuleBuilder onSave={handleSaveRule} />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-200">My Rules</h2>
                  <button
                    onClick={() => setShowBuilder(true)}
                    className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <Plus size={14} />
                    Build a rule
                  </button>
                </div>
                <AutomationDashboard />
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <AutomationTemplates
            onActivate={() => {
              // Optionally navigate to dashboard after activation
            }}
          />
        )}

        {activeTab === 'activity' && organizationId && (
          <AutomationActivityLog organizationId={organizationId} />
        )}

        {activeTab === 'activity' && !organizationId && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity size={32} className="text-slate-600 mb-3" />
            <p className="text-slate-400">Loading activity log…</p>
          </div>
        )}
      </div>
    </div>
  )
}
