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

// -- QStash plan builders -------------------------------------------------

export function publishPlan(input: { destination: string; body: string; delaySeconds?: number }): OperationPlan {
  const when = input.delaySeconds ? ` after a ${input.delaySeconds}s delay` : ""
  return {
    title: `Publish message to ${input.destination}`,
    summary: `Deliver a message to ${input.destination}${when}. This sends a real request and may incur cost.`,
    risk: "paid",
    requiresConfirmation: true,
    operations: [
      { type: "qstash.publish", destination: input.destination, body: input.body, delaySeconds: input.delaySeconds },
    ],
  }
}

export function pauseSchedulePlan(scheduleId: string, name: string): OperationPlan {
  return {
    title: `Pause schedule ${name}`,
    summary: `Pause the schedule for ${name}. It will stop firing until resumed.`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "qstash.pauseSchedule", scheduleId, name }],
  }
}

export function resumeSchedulePlan(scheduleId: string, name: string): OperationPlan {
  return {
    title: `Resume schedule ${name}`,
    summary: `Resume the paused schedule for ${name}.`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "qstash.resumeSchedule", scheduleId, name }],
  }
}

export function deleteSchedulePlan(scheduleId: string, name: string): OperationPlan {
  return {
    title: `Delete schedule ${name}`,
    summary: `Permanently delete the schedule for ${name}. This cannot be undone.`,
    risk: "destructive",
    requiresConfirmation: true,
    operations: [{ type: "qstash.deleteSchedule", scheduleId, name }],
  }
}

export function deleteDlqPlan(dlqId: string, name: string): OperationPlan {
  return {
    title: `Delete DLQ message`,
    summary: `Remove the failed message ${name} from the dead-letter queue.`,
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "qstash.deleteDlq", dlqId, name }],
  }
}
