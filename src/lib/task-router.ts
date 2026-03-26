import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface RouteResult {
  assigned_platform: string
  assigned_agent: string | null
  requires_approval: boolean
}

export async function routeTask(taskType: string, conditions?: Record<string, unknown>): Promise<RouteResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: rules } = await supabase
    .from('task_routing_rules')
    .select('*')
    .eq('task_type', taskType)
    .eq('enabled', true)
    .order('priority', { ascending: false })
    .limit(1)

  if (rules && rules.length > 0) {
    const rule = rules[0]
    return {
      assigned_platform: rule.target_platform,
      assigned_agent: rule.target_agent,
      requires_approval: rule.requires_approval,
    }
  }

  // No matching rule — escalate to Wes
  return {
    assigned_platform: 'wes',
    assigned_agent: null,
    requires_approval: false,
  }
}
