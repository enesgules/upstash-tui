import type { UpstashCreds } from "../config.ts"
import { apiRequest, basicAuthHeader } from "./http.ts"

const BASE_URL = "https://api.upstash.com/v2/vector"

export type RawVectorIndex = {
  customer_id: string
  id: string
  name: string
  similarity_function?: "COSINE" | "EUCLIDEAN" | "DOT_PRODUCT"
  dimension_count?: number
  embedding_model?: string
  sparse_embedding_model?: string
  endpoint?: string
  token?: string
  read_only_token?: string
  type?: "free" | "payg" | "fixed"
  region: string
  max_vector_count?: number
  max_daily_updates?: number
  max_daily_queries?: number
  max_monthly_bandwidth?: number
  max_writes_per_second?: number
  max_query_per_second?: number
  max_reads_per_request?: number
  max_writes_per_request?: number
  max_total_metadata_size?: number
  reserved_price?: number
  creation_time?: number
  index_type?: "DENSE" | "SPARSE" | "HYBRID"
  throughput_vector?: unknown[]
  [key: string]: unknown
}

export type VectorIndex = {
  id: string
  name: string
  region: string
  dimensions: number | null
  similarityFunction: string | null
  type: string | null
  endpoint: string | null
}

function auth(creds: UpstashCreds): string {
  return basicAuthHeader(creds.email, creds.apiKey)
}

export function mapIndex(raw: RawVectorIndex): VectorIndex {
  return {
    id: raw.id,
    name: raw.name,
    region: raw.region,
    dimensions: raw.dimension_count ?? null,
    similarityFunction: raw.similarity_function ?? null,
    type: raw.type ?? null,
    endpoint: raw.endpoint ?? null,
  }
}

export async function listIndexes(creds: UpstashCreds): Promise<VectorIndex[]> {
  const raw = await apiRequest<RawVectorIndex[]>({
    method: "GET",
    url: `${BASE_URL}/index`,
    auth: auth(creds),
  })
  return raw.map(mapIndex)
}

// GET /v2/vector/index/stats (operation getGlobalVectorStats) returns a
// GlobalStats object already aggregated by the API across all indexes
// belonging to the account, so no client-side aggregation is needed.
export type RawVectorGlobalStats = {
  record_count?: number
  request?: number
  bandwidth?: number
  storage?: number
  billing?: number
  rerank_count?: number
  [key: string]: unknown
}

export type VectorMetrics = {
  count: number | null
  requests: number | null
  bandwidthBytes: number | null
  reranks: number | null
  storageBytes: number | null
  cost: number | null
}

export function mapGlobalStats(raw: RawVectorGlobalStats): VectorMetrics {
  return {
    count: raw.record_count ?? null,
    requests: raw.request ?? null,
    bandwidthBytes: raw.bandwidth ?? null,
    reranks: raw.rerank_count ?? null,
    storageBytes: raw.storage ?? null,
    cost: raw.billing ?? null,
  }
}

export async function getVectorMetrics(creds: UpstashCreds): Promise<VectorMetrics> {
  const raw = await apiRequest<RawVectorGlobalStats>({
    method: "GET",
    url: `${BASE_URL}/index/stats`,
    auth: auth(creds),
  })
  return mapGlobalStats(raw)
}
