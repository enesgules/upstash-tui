import { describe, expect, test } from "bun:test"
import { mapDatabase } from "./upstash.ts"
import type { RawRedisDatabase } from "./upstash.ts"

describe("mapDatabase", () => {
  test("maps a payg AWS database with a request limit and budget", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-123",
      database_name: "my-cache",
      primary_region: "us-east-1",
      type: "payg",
      db_request_limit: 100000,
      db_disk_threshold: 268435456,
      budget: 50,
    }

    expect(mapDatabase(raw)).toEqual({
      id: "db-123",
      name: "my-cache",
      region: "us-east-1",
      provider: "AWS",
      plan: "Pay as You Go",
      pinned: false,
    eviction: false,
      prodPack: false,
      commands: { limit: 100000, used: null },
      storage: { usedBytes: null, limitBytes: 268435456 },
      cost: { current: null, budget: 50 },
    })
  })

  test("maps a payg database with no request limit (null) and no budget", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-456",
      database_name: "no-limits",
      primary_region: "us-east-1",
      type: "payg",
      db_request_limit: null,
      db_disk_threshold: null,
      budget: null,
    }

    const mapped = mapDatabase(raw)
    expect(mapped.commands.limit).toBeNull()
    expect(mapped.storage.limitBytes).toBeNull()
    expect(mapped.cost.budget).toBeNull()
  })

  test("maps plan label for free", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-free",
      database_name: "free-db",
      primary_region: "us-east-1",
      type: "free",
    }
    expect(mapDatabase(raw).plan).toBe("Free")
  })

  test("maps plan label for pro/paid", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-pro",
      database_name: "pro-db",
      primary_region: "us-east-1",
      type: "pro",
    }
    expect(mapDatabase(raw).plan).toBe("Pro")

    const rawPaid: RawRedisDatabase = {
      database_id: "db-paid",
      database_name: "paid-db",
      primary_region: "us-east-1",
      type: "paid",
    }
    expect(mapDatabase(rawPaid).plan).toBe("Pro")
  })

  test("infers AWS provider from an AWS-style region when platform is absent", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-aws",
      database_name: "aws-db",
      primary_region: "us-east-1",
      type: "payg",
    }
    expect(mapDatabase(raw).provider).toBe("AWS")
  })

  test("uses the platform field (uppercased) for GCP databases", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-gcp",
      database_name: "gcp-db",
      primary_region: "us-central1",
      platform: "gcp",
      type: "payg",
    }
    expect(mapDatabase(raw).provider).toBe("GCP")
  })

  test("infers GCP provider from a GCP-style region when platform is absent", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-gcp2",
      database_name: "gcp-db-2",
      primary_region: "us-central1",
      type: "payg",
    }
    expect(mapDatabase(raw).provider).toBe("GCP")
  })

  test("always maps usage/current fields to null regardless of input", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-usage",
      database_name: "usage-db",
      primary_region: "us-east-1",
      type: "payg",
      db_request_limit: 999,
      db_disk_threshold: 999,
      budget: 999,
    }
    const mapped = mapDatabase(raw)
    expect(mapped.commands.used).toBeNull()
    expect(mapped.storage.usedBytes).toBeNull()
    expect(mapped.cost.current).toBeNull()
  })

  test("always maps pinned to false", () => {
    const raw: RawRedisDatabase = {
      database_id: "db-pin",
      database_name: "pin-db",
      primary_region: "us-east-1",
      type: "free",
    }
    expect(mapDatabase(raw).pinned).toBe(false)
  })
})
