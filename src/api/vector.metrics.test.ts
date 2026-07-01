import { describe, expect, test } from "bun:test"
import { mapGlobalStats } from "./vector.ts"
import type { RawVectorGlobalStats } from "./vector.ts"

describe("mapGlobalStats", () => {
  test("maps a realistic GlobalStats fixture to VectorMetrics", () => {
    const raw: RawVectorGlobalStats = {
      record_count: 10,
      request: 10,
      bandwidth: 750,
      storage: 950,
      billing: 0.001,
      rerank_count: 0,
    }

    expect(mapGlobalStats(raw)).toEqual({
      count: 10,
      requests: 10,
      bandwidthBytes: 750,
      reranks: 0,
      storageBytes: 950,
      cost: 0.001,
    })
  })

  test("maps missing fields to null instead of fabricating values", () => {
    const raw: RawVectorGlobalStats = {}

    expect(mapGlobalStats(raw)).toEqual({
      count: null,
      requests: null,
      bandwidthBytes: null,
      reranks: null,
      storageBytes: null,
      cost: null,
    })
  })

  test("treats zero as a real value, not missing", () => {
    const raw: RawVectorGlobalStats = {
      record_count: 0,
      request: 0,
      bandwidth: 0,
      storage: 0,
      billing: 0,
      rerank_count: 0,
    }

    expect(mapGlobalStats(raw)).toEqual({
      count: 0,
      requests: 0,
      bandwidthBytes: 0,
      reranks: 0,
      storageBytes: 0,
      cost: 0,
    })
  })
})
