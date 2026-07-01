import { afterEach, describe, expect, test } from "bun:test"
import { getQStashMetrics } from "./qstash.ts"
import type { QStashCreds } from "./qstash.ts"

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

describe("getQStashMetrics", () => {
  test("returns all nulls without making any network call", async () => {
    let fetchCalled = false
    global.fetch = (() => {
      fetchCalled = true
      throw new Error("getQStashMetrics should not call fetch: no accessible usage endpoint exists")
    }) as unknown as typeof fetch

    const creds: QStashCreds = { token: "test-token" }
    const result = await getQStashMetrics(creds)

    expect(result).toEqual({ messages: null, bandwidthBytes: null, cost: null })
    expect(fetchCalled).toBe(false)
  })

  test("returns nulls regardless of a custom baseUrl", async () => {
    const creds: QStashCreds = { token: "test-token", baseUrl: "https://qstash-us-east-1.upstash.io" }
    const result = await getQStashMetrics(creds)

    expect(result).toEqual({ messages: null, bandwidthBytes: null, cost: null })
  })
})
