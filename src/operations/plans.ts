import type { OperationPlan, RedisDatabase } from "../types.ts"

export function renamePlan(db: RedisDatabase, newName: string): OperationPlan {
  return {
    title: `Rename "${db.name}" to "${newName}"`,
    summary: `Rename database "${db.name}" (${db.id}) to "${newName}".`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "redis.rename", databaseId: db.id, newName }],
  }
}

export function toggleEvictionPlan(db: RedisDatabase, enabled: boolean): OperationPlan {
  const verb = enabled ? "Enable" : "Disable"
  return {
    title: `${verb} eviction on "${db.name}"`,
    summary: `${verb} eviction for database "${db.name}" (${db.id}).`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "redis.toggleEviction", databaseId: db.id, enabled }],
  }
}

export function updateBudgetPlan(db: RedisDatabase, budget: number): OperationPlan {
  return {
    title: `Set budget for "${db.name}" to $${budget}`,
    summary: `Update the monthly budget for database "${db.name}" (${db.id}) to $${budget}.`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "redis.updateBudget", databaseId: db.id, budget }],
  }
}

export function generateEnvPlan(db: RedisDatabase): OperationPlan {
  return {
    title: `Generate .env for "${db.name}"`,
    summary: `Fetch credentials for database "${db.name}" (${db.id}) and write a .env.local snippet.`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "redis.generateEnv", databaseId: db.id }],
  }
}

export function createPlan(input: { name: string; region?: string; plan?: string }): OperationPlan {
  return {
    title: `Create database "${input.name}"`,
    summary: `Create a new Redis database named "${input.name}"${input.region ? ` in region ${input.region}` : ""}${input.plan ? ` on the ${input.plan} plan` : ""}. This may incur cost.`,
    risk: "paid",
    requiresConfirmation: true,
    operations: [{ type: "redis.create", name: input.name, region: input.region, plan: input.plan }],
  }
}

export function deletePlan(db: RedisDatabase): OperationPlan {
  return {
    title: `Delete "${db.name}"`,
    summary: `Permanently delete database "${db.name}" (${db.id}). This cannot be undone.`,
    risk: "destructive",
    requiresConfirmation: true,
    operations: [{ type: "redis.delete", databaseId: db.id, name: db.name }],
  }
}
