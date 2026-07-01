import { describe, expect, test } from "bun:test"
import type { RedisDatabase } from "../types.ts"
import { createPlan, deletePlan, generateEnvPlan, renamePlan, toggleEvictionPlan, updateBudgetPlan } from "./plans.ts"

const db: RedisDatabase = {
  id: "db-1",
  name: "my-cache",
  plan: "Pro",
  provider: "AWS",
  region: "us-east-1",
  pinned: false,
  commands: { used: null, limit: null },
  storage: { usedBytes: null, limitBytes: null },
  cost: { current: null, budget: null },
}

function assertBasics(plan: { title: string; summary: string; risk: string; requiresConfirmation: boolean }) {
  expect(plan.title.length).toBeGreaterThan(0)
  expect(plan.summary.length).toBeGreaterThan(0)
  expect(plan.requiresConfirmation).toBe(true)
}

describe("renamePlan", () => {
  test("builds a safe rename op", () => {
    const plan = renamePlan(db, "new-name")
    assertBasics(plan)
    expect(plan.risk).toBe("safe")
    expect(plan.operations).toHaveLength(1)
    expect(plan.operations[0]).toEqual({ type: "redis.rename", databaseId: "db-1", newName: "new-name" })
  })
})

describe("toggleEvictionPlan", () => {
  test("enable reflects in title", () => {
    const plan = toggleEvictionPlan(db, true)
    assertBasics(plan)
    expect(plan.risk).toBe("safe")
    expect(plan.title.toLowerCase()).toContain("enable")
    expect(plan.operations[0]).toEqual({ type: "redis.toggleEviction", databaseId: "db-1", enabled: true })
  })

  test("disable reflects in title", () => {
    const plan = toggleEvictionPlan(db, false)
    assertBasics(plan)
    expect(plan.risk).toBe("safe")
    expect(plan.title.toLowerCase()).toContain("disable")
    expect(plan.operations[0]).toEqual({ type: "redis.toggleEviction", databaseId: "db-1", enabled: false })
  })
})

describe("updateBudgetPlan", () => {
  test("builds a safe budget op", () => {
    const plan = updateBudgetPlan(db, 100)
    assertBasics(plan)
    expect(plan.risk).toBe("safe")
    expect(plan.operations[0]).toEqual({ type: "redis.updateBudget", databaseId: "db-1", budget: 100 })
  })
})

describe("generateEnvPlan", () => {
  test("builds a safe generateEnv op", () => {
    const plan = generateEnvPlan(db)
    assertBasics(plan)
    expect(plan.risk).toBe("safe")
    expect(plan.operations[0]).toEqual({ type: "redis.generateEnv", databaseId: "db-1" })
  })
})

describe("createPlan", () => {
  test("builds a paid create op", () => {
    const plan = createPlan({ name: "new-db", region: "us-east-1", plan: "pro" })
    assertBasics(plan)
    expect(plan.risk).toBe("paid")
    expect(plan.operations[0]).toEqual({ type: "redis.create", name: "new-db", region: "us-east-1", plan: "pro" })
  })
})

describe("deletePlan", () => {
  test("builds a destructive delete op carrying the name", () => {
    const plan = deletePlan(db)
    assertBasics(plan)
    expect(plan.risk).toBe("destructive")
    expect(plan.operations[0]).toEqual({ type: "redis.delete", databaseId: "db-1", name: "my-cache" })
  })
})
