import type { UpstashCreds } from "../config.ts"
import { apiRequest, basicAuthHeader } from "./http.ts"

const BASE_URL = "https://api.upstash.com/v2/redis/stats"

// Shape of GET /v2/redis/stats/{id}. The endpoint also returns many
// time-series arrays (e.g. `keyspace`, `throughput`, `dailyrequests`,
// `command_counts`) — those are intentionally omitted here since we only
// need the scalar "current"/"current month" totals.
export type RawRedisStats = {
  // Total requests (commands) in the current calendar month.
  total_monthly_requests?: number | null
  // Current storage used, in bytes, right now.
  current_storage?: number | null
  // Total cost accrued in the current calendar month.
  total_monthly_billing?: number | null
  [key: string]: unknown
}

export type RedisUsage = {
  commands: number | null
  storageBytes: number | null
  cost: number | null
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function mapRedisUsage(raw: RawRedisStats): RedisUsage {
  return {
    commands: toNumberOrNull(raw.total_monthly_requests),
    storageBytes: toNumberOrNull(raw.current_storage),
    cost: toNumberOrNull(raw.total_monthly_billing),
  }
}

export async function getRedisUsage(creds: UpstashCreds, databaseId: string): Promise<RedisUsage> {
  const raw = await apiRequest<RawRedisStats>({
    method: "GET",
    url: `${BASE_URL}/${databaseId}`,
    auth: basicAuthHeader(creds.email, creds.apiKey),
  })
  return mapRedisUsage(raw)
}
