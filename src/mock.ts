import type { RedisDatabase } from "./types.ts"

const GB = 1024 ** 3

export const databases: RedisDatabase[] = [
  {
    id: "db_prod",
    name: "context7-prod",
    plan: "Pay as You Go",
    provider: "AWS",
    region: "us-east-1",
    pinned: true,
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
    commands: { used: 30_100_000, limit: null },
    storage: { usedBytes: 199 * GB, limitBytes: 1000 * GB },
    cost: { current: 160.21, budget: 500 },
  },
]

export const redisSummary = {
  commands: databases.reduce((s, d) => s + d.commands.used, 0),
  storageBytes: databases.reduce((s, d) => s + d.storage.usedBytes, 0),
  cost: databases.reduce((s, d) => s + d.cost.current, 0),
}
