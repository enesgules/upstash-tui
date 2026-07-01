import { expect, test } from "bun:test"
import { withSyntheticStats } from "./synthStats.ts"
import type { RedisDatabase } from "./types.ts"

function liveDb(overrides: Partial<RedisDatabase> = {}): RedisDatabase {
  return {
    id: "db_live_1",
    name: "live-1",
    plan: "Pay as You Go",
    provider: "AWS",
    region: "us-east-1",
    pinned: false,
    eviction: false,
    prodPack: false,
    commands: { used: null, limit: null },
    storage: { usedBytes: null, limitBytes: null },
    cost: { current: null, budget: null },
    ...overrides,
  }
}

test("fills missing usage and stats and flags synthetic", () => {
  const out = withSyntheticStats(liveDb())
  expect(out.synthetic).toBe(true)
  expect(out.commands.used).not.toBeNull()
  expect(out.storage.usedBytes).not.toBeNull()
  expect(out.cost.current).not.toBeNull()
  expect(out.stats?.throughput.length ?? 0).toBeGreaterThan(0)
})

test("is deterministic for the same id", () => {
  expect(withSyntheticStats(liveDb())).toEqual(withSyntheticStats(liveDb()))
})

test("different ids produce different usage", () => {
  const a = withSyntheticStats(liveDb({ id: "db_a" }))
  const b = withSyntheticStats(liveDb({ id: "db_b" }))
  expect(a.commands.used).not.toBe(b.commands.used)
})

test("keeps synthesized usage within a finite limit", () => {
  const out = withSyntheticStats(liveDb({ commands: { used: null, limit: 10_000_000 } }))
  expect(out.commands.used!).toBeGreaterThan(0)
  expect(out.commands.used!).toBeLessThanOrEqual(10_000_000)
})

test("leaves a fully-populated database untouched", () => {
  const full = liveDb({
    commands: { used: 5, limit: null },
    storage: { usedBytes: 5, limitBytes: null },
    cost: { current: 5, budget: null },
    stats: { throughput: [{ x: 0, y: 1 }] },
  })
  const out = withSyntheticStats(full)
  expect(out).toBe(full)
  expect(out.synthetic).toBeUndefined()
})
