import type { OperationPlan, Risk } from "../types.ts"

export class PlanValidationError extends Error {}

const RISKS: Risk[] = ["safe", "paid", "destructive"]

const OP_TYPES = [
  "redis.create",
  "redis.rename",
  "redis.toggleEviction",
  "redis.updateBudget",
  "redis.delete",
] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new PlanValidationError(message)
}

function validateOperation(op: unknown, index: number): OperationPlan["operations"][number] {
  if (!isObject(op)) fail(`operations[${index}] must be an object`)

  const type = op.type
  if (typeof type !== "string" || !(OP_TYPES as readonly string[]).includes(type)) {
    fail(`operations[${index}].type must be one of ${OP_TYPES.join(", ")}, got ${JSON.stringify(type)}`)
  }

  switch (type) {
    case "redis.create": {
      if (typeof op.name !== "string") fail(`operations[${index}] (redis.create) requires string "name"`)
      if (op.region !== undefined && typeof op.region !== "string") {
        fail(`operations[${index}] (redis.create) "region" must be a string when present`)
      }
      if (op.plan !== undefined && typeof op.plan !== "string") {
        fail(`operations[${index}] (redis.create) "plan" must be a string when present`)
      }
      return { type: "redis.create", name: op.name, region: op.region as string | undefined, plan: op.plan as string | undefined }
    }
    case "redis.rename": {
      if (typeof op.databaseId !== "string") fail(`operations[${index}] (redis.rename) requires string "databaseId"`)
      if (typeof op.newName !== "string") fail(`operations[${index}] (redis.rename) requires string "newName"`)
      return { type: "redis.rename", databaseId: op.databaseId, newName: op.newName }
    }
    case "redis.toggleEviction": {
      if (typeof op.databaseId !== "string") fail(`operations[${index}] (redis.toggleEviction) requires string "databaseId"`)
      if (typeof op.enabled !== "boolean") fail(`operations[${index}] (redis.toggleEviction) requires boolean "enabled"`)
      return { type: "redis.toggleEviction", databaseId: op.databaseId, enabled: op.enabled }
    }
    case "redis.updateBudget": {
      if (typeof op.databaseId !== "string") fail(`operations[${index}] (redis.updateBudget) requires string "databaseId"`)
      if (typeof op.budget !== "number") fail(`operations[${index}] (redis.updateBudget) requires number "budget"`)
      return { type: "redis.updateBudget", databaseId: op.databaseId, budget: op.budget }
    }
    case "redis.delete": {
      if (typeof op.databaseId !== "string") fail(`operations[${index}] (redis.delete) requires string "databaseId"`)
      if (typeof op.name !== "string") fail(`operations[${index}] (redis.delete) requires string "name"`)
      return { type: "redis.delete", databaseId: op.databaseId, name: op.name }
    }
    default:
      fail(`operations[${index}].type must be one of ${OP_TYPES.join(", ")}, got ${JSON.stringify(type)}`)
  }
}

export function validatePlan(raw: unknown): OperationPlan {
  if (!isObject(raw)) fail("plan must be an object")

  if (typeof raw.title !== "string") fail(`"title" must be a string`)
  if (typeof raw.summary !== "string") fail(`"summary" must be a string`)

  if (typeof raw.risk !== "string" || !RISKS.includes(raw.risk as Risk)) {
    fail(`"risk" must be one of ${RISKS.join(", ")}, got ${JSON.stringify(raw.risk)}`)
  }

  if (typeof raw.requiresConfirmation !== "boolean") fail(`"requiresConfirmation" must be a boolean`)

  if (!Array.isArray(raw.operations) || raw.operations.length === 0) {
    fail(`"operations" must be a non-empty array`)
  }

  const operations = raw.operations.map((op, index) => validateOperation(op, index))

  const plan: OperationPlan = {
    title: raw.title,
    summary: raw.summary,
    risk: raw.risk as Risk,
    requiresConfirmation: raw.requiresConfirmation,
    operations,
  }

  return plan
}
