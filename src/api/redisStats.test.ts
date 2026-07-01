import { describe, expect, test } from "bun:test"
import { mapRedisUsage } from "./redisStats.ts"
import type { RawRedisStats } from "./redisStats.ts"

describe("mapRedisUsage", () => {
  test("maps a realistic full stats response to scalar usage values", () => {
    // Trimmed to the fields we care about, but shaped like a real
    // GET /v2/redis/stats/{id} response (time-series arrays included to
    // confirm they're ignored, not mistaken for scalars).
    const raw: RawRedisStats = {
      monitor_count: [{ x: "2025-08-31 15:12:52.799480932 +0000 UTC", y: 320 }],
      daily_net_commands: 7,
      daily_read_requests: 7,
      daily_write_requests: 0,
      keyspace: [{ x: "2025-08-31 15:12:52.799480932 +0000 UTC", y: 0 }],
      dailyrequests: [
        { x: "2025-08-31 15:12:52.799480932 +0000 UTC", y: 0 },
        { x: "2025-09-04 15:12:52.76649148 +0000 UTC", y: 7 },
      ],
      dailybilling: [
        { x: "2025-08-31 15:12:52.799480932 +0000 UTC", y: 0 },
        { x: "2025-09-04 15:12:52.76649148 +0000 UTC", y: 1.333 },
      ],
      dailybandwidth: 50444740913,
      total_monthly_bandwidth: 7,
      total_monthly_requests: 12345,
      total_monthly_read_requests: 7,
      total_monthly_write_requests: 0,
      total_monthly_script_requests: 0,
      queue_optimized: false,
      total_monthly_storage: 0,
      current_storage: 2048576,
      total_monthly_billing: 222.33902763855485,
      command_counts: [{ metric_identifier: "EXISTS", data_points: [] }],
    }

    expect(mapRedisUsage(raw)).toEqual({
      commands: 12345,
      storageBytes: 2048576,
      cost: 222.33902763855485,
    })
  })

  test("maps missing fields to null instead of fabricating values", () => {
    const raw: RawRedisStats = {
      daily_net_commands: 7,
    }

    expect(mapRedisUsage(raw)).toEqual({
      commands: null,
      storageBytes: null,
      cost: null,
    })
  })

  test("treats non-numeric values (e.g. null from the API) as null", () => {
    const raw: RawRedisStats = {
      total_monthly_requests: null,
      current_storage: null,
      total_monthly_billing: null,
    }

    expect(mapRedisUsage(raw)).toEqual({
      commands: null,
      storageBytes: null,
      cost: null,
    })
  })

  test("maps a zero-usage free-tier database without treating 0 as missing", () => {
    const raw: RawRedisStats = {
      total_monthly_requests: 0,
      current_storage: 0,
      total_monthly_billing: 0,
    }

    expect(mapRedisUsage(raw)).toEqual({
      commands: 0,
      storageBytes: 0,
      cost: 0,
    })
  })
})
