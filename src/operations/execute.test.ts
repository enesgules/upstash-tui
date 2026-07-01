import { describe, expect, mock, test } from "bun:test"
import type { UpstashCreds } from "../config.ts"
import type { OperationPlan } from "../types.ts"
import { executePlan, type ExecuteDeps } from "./execute.ts"

const creds: UpstashCreds = { email: "a@b.com", apiKey: "key" }

function fakeApi(overrides: Partial<ExecuteDeps["api"]> = {}): ExecuteDeps["api"] {
  return {
    getDatabase: mock(async () => ({})),
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
    const writeFile = mock(async () => {})
    const plan: OperationPlan = {
      title: "Rename",
      summary: "Rename db",
      risk: "safe",
      requiresConfirmation: true,
      operations: [{ type: "redis.rename", databaseId: "db-1", newName: "new-name" }],
    }

    const result = await executePlan(plan, { mode: "demo", creds, deps: { api, writeFile } })

    expect(result.ok).toBe(true)
    expect(result.messages[0]).toContain("Demo mode")
    expect(result.files).toEqual([])
    expect(api.renameDatabase).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
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

  test("generateEnv fetches the db, writes the file, and reports it", async () => {
    const api = fakeApi({
      getDatabase: mock(async () => ({
        database_name: "my-cache",
        endpoint: "example.upstash.io",
        port: 6379,
        password: "secret",
        rest_token: "token-123",
      })),
    })
    const generateEnv = mock((_name: string, _secrets: unknown) => "FAKE_ENV_CONTENT\n")
    const writeFile = mock(async () => {})

    const plan: OperationPlan = {
      title: "Generate env",
      summary: "Generate env",
      risk: "safe",
      requiresConfirmation: true,
      operations: [{ type: "redis.generateEnv", databaseId: "db-1" }],
    }

    const result = await executePlan(plan, { mode: "live", creds, deps: { api, generateEnv, writeFile } })

    expect(api.getDatabase).toHaveBeenCalledWith(creds, "db-1")
    expect(generateEnv).toHaveBeenCalledWith("my-cache", {
      endpoint: "example.upstash.io",
      port: 6379,
      password: "secret",
      restToken: "token-123",
    })
    expect(writeFile).toHaveBeenCalledWith(".env.local", "FAKE_ENV_CONTENT\n")
    expect(result.ok).toBe(true)
    expect(result.files).toEqual([{ path: ".env.local", content: "FAKE_ENV_CONTENT\n" }])
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
