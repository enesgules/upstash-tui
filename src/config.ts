export type UpstashCreds = { email: string; apiKey: string }
export type OpenRouterCreds = { apiKey: string; model: string }
export type QStashCreds = { token: string; baseUrl?: string }
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
  const qstashUrl = readEnv("QSTASH_URL")
  const qstash: QStashCreds | null = qstashToken
    ? { token: qstashToken, baseUrl: qstashUrl || undefined }
    : null

  return { upstash, openrouter, qstash }
}

// Which Upstash env vars are missing, using the same trimming as loadConfig.
export function missingUpstashVars(): string[] {
  return [
    readEnv("UPSTASH_EMAIL") ? null : "UPSTASH_EMAIL",
    readEnv("UPSTASH_API_KEY") ? null : "UPSTASH_API_KEY",
  ].filter((v): v is string => v !== null)
}
