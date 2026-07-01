import { describe, expect, mock, test } from "bun:test"
import type { UpstashCreds } from "../config.ts"
import type { OperationPlan } from "../types.ts"
import { executePlan, type ExecuteDeps } from "./execute.ts"

const creds: UpstashCreds = { email: "a@b.com", apiKey: "key" }

function fakeApi(overrides: Partial<ExecuteDeps["api"]> = {}): ExecuteDeps["api"] {
  return {
    createDatabase: mock(async () => ({})),
    renameDatabase: mock(async () => {}),
    enableEviction: mock(async () => {}),
    disableEviction: mock(async () => {}),
    updateBudget: mock(async () => {}),
    deleteDatabase: mock(async () => {}),
    ...overrides,
  }
}

describe("executePlan demo mode", () => {
  test("performs no side effects and returns a demo message", async () => {
    const api = fakeApi()
    const plan: OperationPlan = {
      title: "Rename",
      summary: "Rename db",
      risk: "safe",
      requiresConfirmation: true,
      operations: [{ type: "redis.rename", databaseId: "db-1", newName: "new-name" }],
    }

    const result = await executePlan(plan, { mode: "demo", creds, deps: { api } })

    expect(result.ok).toBe(true)
    expect(result.messages[0]).toContain("Demo mode")
    expect(result.files).toEqual([])
    expect(api.renameDatabase).not.toHaveBeenCalled()
  })
})

describe("executePlan live mode", () => {
  test("requires credentials", async () => {
    const plan: OperationPlan = {
      title: "Rename",
      summary: "Rename db",
      risk: "safe",
      requiresConfirmation: true,
      operations: [{ type: "redis.rename", databaseId: "db-1", newName: "new-name" }],
    }
    const result = await executePlan(plan, { mode: "live", creds: null })
    expect(result.ok).toBe(false)
    expect(result.messages).toEqual(["No Upstash credentials."])
    expect(result.files).toEqual([])
  })

  test("rename calls renameDatabase with the right args", async () => {
    const api = fakeApi()
    const plan: OperationPlan = {
      title: "Rename",
      summary: "Rename db",
      risk: "safe",
      requiresConfirmation: true,
      operations: [{ type: "redis.rename", databaseId: "db-1", newName: "new-name" }],
    }

    const result = await executePlan(plan, { mode: "live", creds, deps: { api } })

    expect(api.renameDatabase).toHaveBeenCalledWith(creds, "db-1", "new-name")
    expect(result.ok).toBe(true)
    expect(result.messages[0]).toContain("new-name")
  })


  test("stops and reports failure when an api call throws", async () => {
    const api = fakeApi({
      renameDatabase: mock(async () => {
        throw new Error("boom")
      }),
    })

    const plan: OperationPlan = {
      title: "Rename",
      summary: "Rename db",
      risk: "safe",
      requiresConfirmation: true,
      operations: [{ type: "redis.rename", databaseId: "db-1", newName: "new-name" }],
    }

    const result = await executePlan(plan, { mode: "live", creds, deps: { api } })

    expect(result.ok).toBe(false)
    expect(result.messages.some((m) => m.includes("Failed") && m.includes("boom"))).toBe(true)
  })
})
