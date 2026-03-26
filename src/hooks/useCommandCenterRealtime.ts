'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export interface CommandCenterTask {
  id: string
  organization_id: string
  title: string
  description: string | null
  task_type: string
  status: 'pending' | 'assigned' | 'in_progress' | 'awaiting_approval' | 'completed' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_platform: 'openclaw' | 'claude-code' | 'claude-cowork' | 'wes' | null
  assigned_agent: string | null
  result_summary: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  completed_at: string | null
  organization?: { name: string; tier: string }
}

export interface TaskCounts {
  pending: number
  in_progress: number
  awaiting_approval: number
  completed: number
  failed: number
}

interface UseCommandCenterRealtimeOptions {
  organizationId?: string
  onTaskInsert?: () => void
  onTaskUpdate?: () => void
}

interface UseCommandCenterRealtimeResult {
  tasks: CommandCenterTask[]
  connected: boolean
  taskCounts: TaskCounts
  refetch: () => void
}

function computeCounts(tasks: CommandCenterTask[]): TaskCounts {
  return tasks.reduce(
    (acc, task) => {
      if (task.status in acc) {
        acc[task.status as keyof TaskCounts] += 1
      }
      return acc
    },
    { pending: 0, in_progress: 0, awaiting_approval: 0, completed: 0, failed: 0 }
  )
}

export function useCommandCenterRealtime(
  options: UseCommandCenterRealtimeOptions = {}
): UseCommandCenterRealtimeResult {
  const [tasks, setTasks] = useState<CommandCenterTask[]>([])
  const [connected, setConnected] = useState(false)
  const { organizationId } = options

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (organizationId) params.set('org_id', organizationId)
      params.set('limit', '50')
      const res = await fetch(`/api/command-center/tasks?${params}`)
      if (res.ok) {
        const { tasks: data } = await res.json()
        if (data) setTasks(data as CommandCenterTask[])
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    }
  }, [organizationId])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    fetchTasks()

    const channelName = organizationId
      ? `cc-tasks-${organizationId}`
      : 'cc-tasks-all'

    let insertConfig: Record<string, string> = {
      event: 'INSERT',
      schema: 'public',
      table: 'command_center_tasks',
    }
    let updateConfig: Record<string, string> = {
      event: 'UPDATE',
      schema: 'public',
      table: 'command_center_tasks',
    }

    if (organizationId) {
      insertConfig.filter = `organization_id=eq.${organizationId}`
      updateConfig.filter = `organization_id=eq.${organizationId}`
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        insertConfig,
        (payload: { new: Record<string, unknown> }) => {
          setTasks((prev) =>
            [payload.new as unknown as CommandCenterTask, ...prev].slice(0, 50)
          )
          options.onTaskInsert?.()
        }
      )
      .on(
        'postgres_changes' as any,
        updateConfig,
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as CommandCenterTask
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          )
          options.onTaskUpdate?.()
        }
      )
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const taskCounts = computeCounts(tasks)

  return { tasks, connected, taskCounts, refetch: fetchTasks }
}
