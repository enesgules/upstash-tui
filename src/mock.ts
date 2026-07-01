import type { RedisDatabase } from "./types.ts"
import type { QStashSchedule, QStashUrlGroup, QStashDlqMessage } from "./api/qstash.ts"
import type { VectorIndex } from "./api/vector.ts"

const GB = 1024 ** 3

export const databases: RedisDatabase[] = [
  {
    id: "db_prod",
    name: "context7-prod",
    plan: "Pay as You Go",
    provider: "AWS",
    region: "us-east-1",
    pinned: true,
    eviction: false,
    commands: { used: 12_400_000, limit: null },
    storage: { usedBytes: 8 * GB, limitBytes: 100 * GB },
    cost: { current: 41.2, budget: 5000 },
  },
  {
    id: "db_ratelimit",
    name: "context7-prod-ratelimit",
    plan: "Pay as You Go",
    provider: "AWS",
    region: "us-east-1",
    pinned: true,
    eviction: false,
    commands: { used: 2_000_000, limit: null },
    storage: { usedBytes: 3 * GB, limitBytes: 100 * GB },
    cost: { current: 4.14, budget: 5000 },
  },
  {
    id: "db_sessions",
    name: "context7-mcp-sessions",
    plan: "Free",
    provider: "AWS",
    region: "eu-west-1",
    pinned: false,
    eviction: false,
    commands: { used: 480_000, limit: 10_000_000 },
    storage: { usedBytes: 0.4 * GB, limitBytes: 0.25 * GB },
    cost: { current: 0, budget: null },
  },
  {
    id: "db_analytics",
    name: "context7-analytics",
    plan: "Pay as You Go",
    provider: "GCP",
    region: "us-central1",
    pinned: false,
    eviction: false,
    commands: { used: 30_100_000, limit: null },
    storage: { usedBytes: 199 * GB, limitBytes: 1000 * GB },
    cost: { current: 160.21, budget: 500 },
  },
]

export const redisSummary = {
  commands: databases.reduce((s, d) => s + (d.commands.used ?? 0), 0),
  storageBytes: databases.reduce((s, d) => s + (d.storage.usedBytes ?? 0), 0),
  cost: databases.reduce((s, d) => s + (d.cost.current ?? 0), 0),
}

export const mockSchedules: QStashSchedule[] = [
  { id: "scd_daily_digest", cron: "0 9 * * *", destination: "https://api.context7.com/cron/digest", paused: false, createdAt: 1717200000000 },
  { id: "scd_cleanup", cron: "*/15 * * * *", destination: "https://api.context7.com/cron/cleanup", paused: false, createdAt: 1717200000000 },
  { id: "scd_billing", cron: "0 0 1 * *", destination: "https://api.context7.com/cron/billing", paused: true, createdAt: 1717200000000 },
]

export const mockUrlGroups: QStashUrlGroup[] = [
  { name: "notifications", endpointCount: 3, createdAt: 1717200000000, updatedAt: 1717200000000 },
  { name: "webhooks", endpointCount: 1, createdAt: 1717200000000, updatedAt: 1717200000000 },
]

export const mockDlq: QStashDlqMessage[] = [
  { id: "dlq_1", url: "https://api.context7.com/webhook", createdAt: 1717200000000, topicName: "webhooks", scheduleId: null, responseStatus: 500 },
  { id: "dlq_2", url: "https://api.context7.com/cron/digest", createdAt: 1717200000000, topicName: null, scheduleId: "scd_daily_digest", responseStatus: 429 },
]

export const mockIndexes: VectorIndex[] = [
  { id: "idx_docs", name: "context7-docs", region: "us-east-1", dimensions: 1536, similarityFunction: "COSINE", type: "DENSE", endpoint: "context7-docs-12345.upstash.io" },
  { id: "idx_search", name: "context7-search", region: "eu-west-1", dimensions: 1024, similarityFunction: "DOT_PRODUCT", type: "DENSE", endpoint: "context7-search-67890.upstash.io" },
  { id: "idx_hybrid", name: "context7-hybrid", region: "us-east-1", dimensions: null, similarityFunction: null, type: "SPARSE", endpoint: "context7-hybrid-24680.upstash.io" },
]
