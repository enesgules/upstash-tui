export type Risk = "safe" | "paid" | "destructive"

export type RedisDatabase = {
  id: string
  name: string
  plan: string
  provider: string
  region: string
  pinned: boolean
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
    | { type: "redis.generateEnv"; databaseId: string }
    | { type: "redis.delete"; databaseId: string; name: string }
  >
  generatedFiles?: Array<{ path: string; content: string }>
}
