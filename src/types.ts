export type Risk = "safe" | "paid" | "destructive"

export type MetricPoint = { x: number; y: number }
export type RedisStats = { throughput: MetricPoint[] }

export type RedisDatabase = {
  id: string
  name: string
  plan: string
  provider: string
  region: string
  pinned: boolean
  eviction: boolean
  prodPack: boolean
  stats?: RedisStats
  synthetic?: boolean
  commands: { used: number | null; limit: number | null }
  storage: { usedBytes: number | null; limitBytes: number | null }
  cost: { current: number | null; budget: number | null }
}

export type OperationPlan = {
  title: string
  summary: string
  risk: Risk
  requiresConfirmation: boolean
  operations: Array<
    | { type: "redis.create"; name: string; region?: string; plan?: string }
    | { type: "redis.rename"; databaseId: string; newName: string }
    | { type: "redis.toggleEviction"; databaseId: string; enabled: boolean }
    | { type: "redis.updateBudget"; databaseId: string; budget: number }
    | { type: "redis.delete"; databaseId: string; name: string }
    | { type: "qstash.publish"; destination: string; body: string; delaySeconds?: number }
    | { type: "qstash.pauseSchedule"; scheduleId: string; name: string }
    | { type: "qstash.resumeSchedule"; scheduleId: string; name: string }
    | { type: "qstash.deleteSchedule"; scheduleId: string; name: string }
    | { type: "qstash.deleteDlq"; dlqId: string; name: string }
  >
  generatedFiles?: Array<{ path: string; content: string }>
}
