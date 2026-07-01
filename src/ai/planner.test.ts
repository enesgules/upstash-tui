import { expect, test } from "bun:test"
import { planFromCommand } from "./planner.ts"
import type { ChatFn, PlannerContext } from "./planner.ts"
import type { OperationPlan } from "../types.ts"

const context: PlannerContext = {
  selectedDatabase: { id: "db_1", name: "my-db", region: "us-east-1" },
  regions: ["us-east-1", "eu-west-1"],
}

test("valid plan JSON from chat -> returns validated plan", async () => {
  const validPlan: OperationPlan = {
    title: "Rename database",
    summary: "Renames my-db to renamed-db",
    risk: "safe",
    requiresConfirmation: true,
    operations: [{ type: "redis.rename", databaseId: "db_1", newName: "renamed-db" }],
  }
  const chat: ChatFn = async () => JSON.stringify(validPlan)

  const result = await planFromCommand("rename this database to renamed-db", context, chat)

  expect(result).toEqual({ kind: "plan", plan: validPlan })
})

test("answer shape from chat -> returns an answer, not a plan", async () => {
  const chat: ChatFn = async () => JSON.stringify({ kind: "answer", text: "You have 4 databases." })

  const result = await planFromCommand("how many databases do I have?", context, chat)

  expect(result).toEqual({ kind: "answer", text: "You have 4 databases." })
})

test("chat emits a well-formed delete op -> refused (never reachable via command bar)", async () => {
  const deletePlan: OperationPlan = {
    title: "Delete database",
    summary: "Deletes my-db",
    risk: "destructive",
    requiresConfirmation: true,
    operations: [{ type: "redis.delete", databaseId: "db_1", name: "my-db" }],
  }
  const chat: ChatFn = async () => JSON.stringify(deletePlan)

  await expect(planFromCommand("delete my-db", context, chat)).rejects.toThrow(/isn't supported from the command bar/)
})

test("chat returns error object -> throws with the error message", async () => {
  const chat: ChatFn = async () => JSON.stringify({ error: "unsupported" })

  await expect(planFromCommand("do something impossible", context, chat)).rejects.toThrow("unsupported")
})

test("chat returns non-JSON garbage -> throws a helpful error", async () => {
  const chat: ChatFn = async () => "not json at all {{{"

  await expect(planFromCommand("do a thing", context, chat)).rejects.toThrow(/Couldn't turn that into a valid plan/)
})

test("chat returns JSON that fails validation -> throws a helpful error", async () => {
  const chat: ChatFn = async () => JSON.stringify({ title: "Missing fields" })

  await expect(planFromCommand("do a thing", context, chat)).rejects.toThrow(/Couldn't turn that into a valid plan/)
})

test("system prompt passed to chat includes context and allowed op types", async () => {
  let capturedSystem = ""
  const chat: ChatFn = async (system) => {
    capturedSystem = system
    return JSON.stringify({ error: "n/a" })
  }

  await expect(planFromCommand("anything", context, chat)).rejects.toThrow()

  expect(capturedSystem).toContain("redis.create")
  expect(capturedSystem).toContain("redis.rename")
  expect(capturedSystem).toContain("redis.toggleEviction")
  expect(capturedSystem).toContain("redis.updateBudget")
  expect(capturedSystem).toContain("db_1")
  expect(capturedSystem).toContain("my-db")
  expect(capturedSystem).toContain("us-east-1")
})
