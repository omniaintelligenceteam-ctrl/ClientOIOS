const SONNET_PATTERNS = [
  /\b(analyz|analysis|compare|trend|strategy|recommend|suggest|explain|draft|write|plan|forecast|insight|optimize|summarize|evaluate)\b/i,
  /\b(this week vs|compared to|month over month|week over week|performance|growth|decline|improve)\b/i,
  /\b(what should|how can|how do|why (are|is|did|do)|what('s| is) wrong)\b/i,
]

export type ModelChoice = 'haiku' | 'sonnet'

export interface ModelConfig {
  model: string
  maxTokens: number
}

const MODELS: Record<ModelChoice, ModelConfig> = {
  haiku: {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
  },
  sonnet: {
    model: 'claude-sonnet-4-5-20241022',
    maxTokens: 2048,
  },
}

export function routeModel(message: string): ModelChoice {
  for (const pattern of SONNET_PATTERNS) {
    if (pattern.test(message)) return 'sonnet'
  }
  return 'haiku'
}

export function getModelConfig(choice: ModelChoice): ModelConfig {
  return MODELS[choice]
}
