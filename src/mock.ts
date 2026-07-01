import type { RedisDatabase } from "./types.ts"
import type { QStashSchedule, QStashUrlGroup, QStashDlqMessage } from "./api/qstash.ts"
import type { VectorIndex } from "./api/vector.ts"
import type { WorkflowRun } from "./api/workflow.ts"

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
    prodPack: true,
    stats: {
      throughput: [40, 120, 90, 200, 160, 240, 180, 260, 210, 300, 250, 320].map((y, x) => ({ x, y })),
    },
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
    prodPack: false,
    stats: {
      throughput: [10, 60, 20, 80, 30, 90, 40, 100, 50, 110, 45, 95].map((y, x) => ({ x, y })),
    },
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
    prodPack: false,
    stats: {
      throughput: [5, 6, 5, 7, 6, 6, 7, 6, 5, 6, 7, 6].map((y, x) => ({ x, y })),
    },
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
    prodPack: true,
    stats: {
      throughput: [80, 90, 140, 130, 200, 190, 260, 240, 300, 280, 340, 360].map((y, x) => ({ x, y })),
    },
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
  { id: "scd_entra", cron: "*/10 * * * *", destination: "https://context7.com/api/qstash/entra-group-sync", paused: false, createdAt: 1717200000000 },
  { id: "scd_daily_stats", cron: "0 0 * * *", destination: "https://context7.com/api/qstash/daily-stats", paused: false, createdAt: 1717200000000 },
  { id: "scd_mcp_stats", cron: "0 0 * * *", destination: "https://context7.com/api/qstash/mcp-stats", paused: false, createdAt: 1717200000000 },
  { id: "scd_cli_stats", cron: "0 0 * * *", destination: "https://context7.com/api/qstash/cli-stats", paused: false, createdAt: 1717200000000 },
  { id: "scd_quota", cron: "0 0 * * *", destination: "https://context7.com/api/qstash/free-quota-bonus", paused: false, createdAt: 1717200000000 },
  { id: "scd_cleanup", cron: "0 3 * * *", destination: "https://context7.com/api/qstash/private-repos-cleanup", paused: false, createdAt: 1717200000000 },
  { id: "scd_billing", cron: "0 0 1 * *", destination: "https://context7.com/api/qstash/billing", paused: true, createdAt: 1717200000000 },
]

export const mockQStashMetrics = {
  messages: 470,
  workflowRuns: 0,
  bandwidthBytes: 32 * 1024,
  cost: 0.01,
}

export const mockVectorMetrics = {
  count: 318_000_000,
  requests: 5_900_000,
  bandwidthBytes: 89 * GB,
  reranks: 0,
  storageBytes: 2 * 1024 ** 4,
  cost: 0.24,
}

export const mockUrlGroups: QStashUrlGroup[] = [
  { name: "notifications", endpointCount: 3, createdAt: 1717200000000, updatedAt: 1717200000000 },
  { name: "webhooks", endpointCount: 1, createdAt: 1717200000000, updatedAt: 1717200000000 },
]

export const mockDlq: QStashDlqMessage[] = [
  { id: "dlq_1", url: "https://api.context7.com/webhook", createdAt: 1717200000000, topicName: "webhooks", scheduleId: null, responseStatus: 500 },
  { id: "dlq_2", url: "https://api.context7.com/cron/digest", createdAt: 1717200000000, topicName: null, scheduleId: "scd_daily_digest", responseStatus: 429 },
]

export const mockIndexes: VectorIndex[] = [
  { id: "idx_docs", name: "context7-docs", region: "us-east-1", dimensions: 1536, similarityFunction: "COSINE", type: "payg", endpoint: "context7-docs-12345.upstash.io", indexType: "DENSE", embeddingModel: "MXBAI_EMBED_LARGE_V1", maxVectorCount: 10_000_000, maxDailyQueries: 1_000_000, maxDailyUpdates: 1_000_000, createdAt: 1717200000000 },
  { id: "idx_search", name: "context7-search", region: "eu-west-1", dimensions: 1024, similarityFunction: "DOT_PRODUCT", type: "fixed", endpoint: "context7-search-67890.upstash.io", indexType: "DENSE", embeddingModel: null, maxVectorCount: 50_000_000, maxDailyQueries: 5_000_000, maxDailyUpdates: 2_000_000, createdAt: 1716000000000 },
  { id: "idx_hybrid", name: "context7-hybrid", region: "us-east-1", dimensions: null, similarityFunction: null, type: "payg", endpoint: "context7-hybrid-24680.upstash.io", indexType: "SPARSE", embeddingModel: "BGE_M3", maxVectorCount: null, maxDailyQueries: null, maxDailyUpdates: null, createdAt: 1717804800000 },
]

export const mockWorkflowRuns: WorkflowRun[] = [
  { id: "wfr_8f21", url: "https://context7.com/api/workflow/index-repo", state: "RUN_SUCCESS", createdAt: 1719835200000 },
  { id: "wfr_7c04", url: "https://context7.com/api/workflow/index-repo", state: "RUN_STARTED", createdAt: 1719835100000 },
  { id: "wfr_5a9b", url: "https://context7.com/api/workflow/summarize-docs", state: "RUN_SUCCESS", createdAt: 1719834800000 },
  { id: "wfr_3d12", url: "https://context7.com/api/workflow/summarize-docs", state: "RUN_FAILED", createdAt: 1719834600000 },
  { id: "wfr_1e77", url: "https://context7.com/api/workflow/embed-batch", state: "RUN_SUCCESS", createdAt: 1719834200000 },
]

export const mockWorkflowMetrics = {
  messages: 0,
  runs: mockWorkflowRuns.length,
  bandwidthBytes: 32 * 1024,
  cost: 0.01,
}
