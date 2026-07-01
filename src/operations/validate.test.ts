import { expect, test } from "bun:test"
import { PlanValidationError, validatePlan } from "./validate.ts"

function basePlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Do a thing",
    summary: "Does a thing to a database",
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "redis.generateEnv", databaseId: "db_1" }],
    ...overrides,
  }
}

test("accepts a valid redis.create plan", () => {
  const plan = validatePlan(
    basePlan({
      title: "Create database",
      risk: "paid",
      operations: [{ type: "redis.create", name: "my-db", region: "us-east-1", plan: "free" }],
    }),
  )
  expect(plan.operations[0]).toEqual({ type: "redis.create", name: "my-db", region: "us-east-1", plan: "free" })
})

test("accepts a valid redis.rename plan", () => {
  const plan = validatePlan(
    basePlan({ operations: [{ type: "redis.rename", databaseId: "db_1", newName: "new-name" }] }),
  )
  expect(plan.operations[0]).toEqual({ type: "redis.rename", databaseId: "db_1", newName: "new-name" })
})

test("accepts a valid redis.toggleEviction plan", () => {
  const plan = validatePlan(
    basePlan({ operations: [{ type: "redis.toggleEviction", databaseId: "db_1", enabled: true }] }),
  )
  expect(plan.operations[0]).toEqual({ type: "redis.toggleEviction", databaseId: "db_1", enabled: true })
})

test("accepts a valid redis.updateBudget plan", () => {
  const plan = validatePlan(
    basePlan({ operations: [{ type: "redis.updateBudget", databaseId: "db_1", budget: 25 }] }),
  )
  expect(plan.operations[0]).toEqual({ type: "redis.updateBudget", databaseId: "db_1", budget: 25 })
})

test("accepts a valid redis.generateEnv plan", () => {
  const plan = validatePlan(basePlan())
  expect(plan.operations[0]).toEqual({ type: "redis.generateEnv", databaseId: "db_1" })
})

test("accepts valid generatedFiles", () => {
  const plan = validatePlan(
    basePlan({ generatedFiles: [{ path: ".env.local", content: "UPSTASH_REDIS_REST_URL=..." }] }),
  )
  expect(plan.generatedFiles).toEqual([{ path: ".env.local", content: "UPSTASH_REDIS_REST_URL=..." }])
})

test("rejects a non-object", () => {
  expect(() => validatePlan("not a plan")).toThrow(PlanValidationError)
  expect(() => validatePlan(null)).toThrow(PlanValidationError)
  expect(() => validatePlan([1, 2, 3])).toThrow(PlanValidationError)
})

test("rejects a bad risk value", () => {
  expect(() => validatePlan(basePlan({ risk: "extreme" }))).toThrow(PlanValidationError)
})

test("rejects empty operations", () => {
  expect(() => validatePlan(basePlan({ operations: [] }))).toThrow(PlanValidationError)
})

test("rejects an unknown op type", () => {
  expect(() => validatePlan(basePlan({ operations: [{ type: "redis.delete", databaseId: "db_1" }] }))).toThrow(
    PlanValidationError,
  )
})

test("rejects wrong param types (numeric budget as string)", () => {
  expect(() =>
    validatePlan(basePlan({ operations: [{ type: "redis.updateBudget", databaseId: "db_1", budget: "25" }] })),
  ).toThrow(PlanValidationError)
})

test("rejects malformed generatedFiles", () => {
  expect(() => validatePlan(basePlan({ generatedFiles: [{ path: ".env.local" }] }))).toThrow(PlanValidationError)
  expect(() => validatePlan(basePlan({ generatedFiles: "not-an-array" }))).toThrow(PlanValidationError)
})

test("rejects missing title/summary", () => {
  expect(() => validatePlan(basePlan({ title: 123 }))).toThrow(PlanValidationError)
  expect(() => validatePlan(basePlan({ summary: undefined }))).toThrow(PlanValidationError)
})

test("rejects non-boolean requiresConfirmation", () => {
  expect(() => validatePlan(basePlan({ requiresConfirmation: "yes" }))).toThrow(PlanValidationError)
})
