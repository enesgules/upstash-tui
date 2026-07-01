import type { UpstashCreds } from "../config.ts"
import type { RedisDatabase } from "../types.ts"
import { apiRequest, basicAuthHeader } from "./http.ts"

const BASE_URL = "https://api.upstash.com/v2/redis"

export type RawRedisDatabase = {
  database_id: string
  database_name: string
  primary_region: string
  platform?: string
  type?: string
  db_request_limit?: number | null
  db_disk_threshold?: number | null
  budget?: number | null
  eviction?: boolean
  endpoint?: string
  port?: number
  password?: string
  rest_token?: string
  read_only_rest_token?: string
  [key: string]: unknown
}

function auth(creds: UpstashCreds): string {
  return basicAuthHeader(creds.email, creds.apiKey)
}

function inferProvider(raw: RawRedisDatabase): string {
  if (raw.platform) return raw.platform.toUpperCase()
  const region = raw.primary_region ?? ""
  if (/-\d/.test(region)) return "AWS"
  if (/[a-z]\d+$/.test(region)) return "GCP"
  return "AWS"
}

function planLabel(type: string | undefined): string {
  switch (type) {
    case "free":
      return "Free"
    case "payg":
      return "Pay as You Go"
    case "pro":
    case "paid":
      return "Pro"
    default:
      return type ?? ""
  }
}

export function mapDatabase(raw: RawRedisDatabase): RedisDatabase {
  return {
    id: raw.database_id,
    name: raw.database_name,
    region: raw.primary_region,
    provider: inferProvider(raw),
    plan: planLabel(raw.type),
    pinned: false,
    eviction: raw.eviction ?? false,
    prodPack: Boolean(raw.prod_pack),
    commands: {
      limit: raw.db_request_limit ?? null,
      used: null,
    },
    storage: {
      usedBytes: null,
      limitBytes: raw.db_disk_threshold ?? null,
    },
    cost: {
      current: null,
      budget: raw.budget ?? null,
    },
  }
}

export async function listDatabases(creds: UpstashCreds): Promise<RedisDatabase[]> {
  const raw = await apiRequest<RawRedisDatabase[]>({
    method: "GET",
    url: `${BASE_URL}/databases`,
    auth: auth(creds),
  })
  return raw.map(mapDatabase)
}

export async function getDatabase(creds: UpstashCreds, id: string): Promise<RawRedisDatabase> {
  return apiRequest<RawRedisDatabase>({
    method: "GET",
    url: `${BASE_URL}/database/${id}`,
    auth: auth(creds),
  })
}

export async function createDatabase(
  creds: UpstashCreds,
  input: { name: string; platform: "aws" | "gcp"; primaryRegion: string; plan?: string; tls?: boolean },
): Promise<RedisDatabase> {
  const raw = await apiRequest<RawRedisDatabase>({
    method: "POST",
    url: `${BASE_URL}/database`,
    auth: auth(creds),
    body: {
      database_name: input.name,
      platform: input.platform,
      primary_region: input.primaryRegion,
      ...(input.plan !== undefined ? { plan: input.plan } : {}),
      ...(input.tls !== undefined ? { tls: input.tls } : {}),
    },
  })
  return mapDatabase(raw)
}

export async function renameDatabase(creds: UpstashCreds, id: string, name: string): Promise<void> {
  await apiRequest<unknown>({
    method: "POST",
    url: `${BASE_URL}/rename/${id}`,
    auth: auth(creds),
    body: { name },
  })
}

export async function enableEviction(creds: UpstashCreds, id: string): Promise<void> {
  await apiRequest<unknown>({
    method: "POST",
    url: `${BASE_URL}/enable-eviction/${id}`,
    auth: auth(creds),
  })
}

export async function disableEviction(creds: UpstashCreds, id: string): Promise<void> {
  await apiRequest<unknown>({
    method: "POST",
    url: `${BASE_URL}/disable-eviction/${id}`,
    auth: auth(creds),
  })
}

export async function updateBudget(creds: UpstashCreds, id: string, budget: number): Promise<void> {
  await apiRequest<unknown>({
    method: "PATCH",
    url: `${BASE_URL}/update-budget/${id}`,
    auth: auth(creds),
    body: { budget },
  })
}

export async function deleteDatabase(creds: UpstashCreds, id: string): Promise<void> {
  await apiRequest<unknown>({
    method: "DELETE",
    url: `${BASE_URL}/database/${id}`,
    auth: auth(creds),
  })
}
