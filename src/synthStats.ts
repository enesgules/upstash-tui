import type { RedisDatabase, RedisStats } from "./types.ts"

// Synthetic usage stats for databases whose real usage/time-series the list
// endpoint doesn't return. Everything is derived deterministically from the
// database id, so a given database always renders identical numbers. This is a
// seam: once the real get_database_stats fetcher populates `used` and `stats`,
// withSyntheticStats returns those databases untouched.

const GB = 1024 ** 3
const THROUGHPUT_POINTS = 14

// FNV-1a hash → 32-bit seed.
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32 — deterministic float in [0, 1).
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

function synthThroughput(rng: () => number): RedisStats {
  const base = between(rng, 40, 240)
  const points: RedisStats["throughput"] = []
  for (let x = 0; x < THROUGHPUT_POINTS; x++) {
    const trend = base * (0.7 + 0.5 * (x / THROUGHPUT_POINTS))
    const noise = between(rng, -0.25, 0.25) * base
    points.push({ x, y: Math.max(0, Math.round(trend + noise)) })
  }
  return { throughput: points }
}

export function withSyntheticStats(db: RedisDatabase): RedisDatabase {
  const needsUsage =
    db.commands.used === null || db.storage.usedBytes === null || db.cost.current === null
  const needsSeries = db.stats === undefined
  if (!needsUsage && !needsSeries) return db

  const rng = makeRng(hashString(db.id))

  const commandsUsed =
    db.commands.used ??
    (db.commands.limit !== null
      ? Math.round(between(rng, 0.2, 0.8) * db.commands.limit)
      : Math.round(between(rng, 1_000_000, 60_000_000)))

  const storageUsed =
    db.storage.usedBytes ??
    (db.storage.limitBytes !== null
      ? Math.round(between(rng, 0.1, 0.7) * db.storage.limitBytes)
      : Math.round(between(rng, 0.5 * GB, 200 * GB)))

  // Derive cost from the synthesized usage so the three numbers read coherently.
  const costCurrent =
    db.cost.current ??
    Math.round(((commandsUsed / 1_000_000) * 0.2 + (storageUsed / GB) * 0.1) * 100) / 100

  return {
    ...db,
    synthetic: true,
    commands: { ...db.commands, used: commandsUsed },
    storage: { ...db.storage, usedBytes: storageUsed },
    cost: { ...db.cost, current: costCurrent },
    stats: db.stats ?? synthThroughput(rng),
  }
}
