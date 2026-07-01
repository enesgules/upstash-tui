import { expect, test } from "bun:test"
import { databases, redisSummary } from "./mock.ts"

test("databases have unique ids and required fields", () => {
  expect(databases.length).toBeGreaterThanOrEqual(3)
  const ids = new Set(databases.map((d) => d.id))
  expect(ids.size).toBe(databases.length)
  for (const db of databases) {
    expect(db.name.length).toBeGreaterThan(0)
    expect(db.region.length).toBeGreaterThan(0)
  }
})

test("at least one database is pinned", () => {
  expect(databases.some((d) => d.pinned)).toBe(true)
})

test("every database has a prodPack flag and non-empty throughput stats", () => {
  for (const db of databases) {
    expect(typeof db.prodPack).toBe("boolean")
    expect(db.stats?.throughput.length ?? 0).toBeGreaterThan(0)
    for (const point of db.stats!.throughput) {
      expect(typeof point.x).toBe("number")
      expect(typeof point.y).toBe("number")
    }
  }
})

test("at least one database has prodPack enabled and one disabled", () => {
  expect(databases.some((d) => d.prodPack)).toBe(true)
  expect(databases.some((d) => !d.prodPack)).toBe(true)
})

test("redisSummary aggregates the databases", () => {
  const commands = databases.reduce((s, d) => s + (d.commands.used ?? 0), 0)
  const storage = databases.reduce((s, d) => s + (d.storage.usedBytes ?? 0), 0)
  const cost = databases.reduce((s, d) => s + (d.cost.current ?? 0), 0)
  expect(redisSummary.commands).toBe(commands)
  expect(redisSummary.storageBytes).toBe(storage)
  expect(redisSummary.cost).toBeCloseTo(cost, 5)
})
