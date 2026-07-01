export type UpstashCreds = { email: string; apiKey: string }
export type OpenRouterCreds = { apiKey: string; model: string }
export type QStashCreds = { token: string }
export type Config = {
  upstash: UpstashCreds | null
  openrouter: OpenRouterCreds | null
  qstash: QStashCreds | null
}

// Strong planner that supports OpenRouter structured outputs (Opus 4.1+).
const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-opus-4.8"

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim()
}

export function loadConfig(): Config {
  const email = readEnv("UPSTASH_EMAIL")
  const apiKey = readEnv("UPSTASH_API_KEY")
  const upstash: UpstashCreds | null = email && apiKey ? { email, apiKey } : null

  const openrouterApiKey = readEnv("OPENROUTER_API_KEY")
  const openrouterModel = readEnv("OPENROUTER_MODEL")
  const openrouter: OpenRouterCreds | null = openrouterApiKey
    ? { apiKey: openrouterApiKey, model: openrouterModel || DEFAULT_OPENROUTER_MODEL }
    : null

  const qstashToken = readEnv("QSTASH_TOKEN")
  const qstash: QStashCreds | null = qstashToken ? { token: qstashToken } : null

  return { upstash, openrouter, qstash }
}
