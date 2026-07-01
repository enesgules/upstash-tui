import { describe, expect, test } from "bun:test"
import { mapIndex } from "./vector.ts"
import type { RawVectorIndex } from "./vector.ts"

describe("mapIndex", () => {
  test("maps a dense payg index with a similarity function and dimension count", () => {
    const raw: RawVectorIndex = {
      customer_id: "user@example.com",
      id: "idx-123",
      name: "my-index",
      similarity_function: "COSINE",
      dimension_count: 1536,
      embedding_model: "BGE_SMALL_EN_V1_5",
      endpoint: "my-index-1234-us-east-1-vector.upstash.io",
      token: "secret-token",
      read_only_token: "secret-ro-token",
      type: "payg",
      region: "us-east-1",
      max_vector_count: 1000000,
      max_daily_updates: 100000,
      max_daily_queries: 100000,
      max_monthly_bandwidth: -1,
      max_writes_per_second: 1000,
      max_query_per_second: 1000,
      max_reads_per_request: 1000,
      max_writes_per_request: 1000,
      max_total_metadata_size: 48000,
      reserved_price: 0,
      creation_time: 1700000000,
      index_type: "DENSE",
      throughput_vector: [],
    }

    expect(mapIndex(raw)).toEqual({
      id: "idx-123",
      name: "my-index",
      region: "us-east-1",
      dimensions: 1536,
      similarityFunction: "COSINE",
      type: "payg",
      endpoint: "my-index-1234-us-east-1-vector.upstash.io",
    })
  })

  test("maps a sparse index with no similarity function or dimension count to null", () => {
    const raw: RawVectorIndex = {
      customer_id: "user@example.com",
      id: "idx-sparse",
      name: "sparse-index",
      sparse_embedding_model: "BM25",
      type: "free",
      region: "eu-west-1",
      creation_time: 1700000001,
      index_type: "SPARSE",
    }

    const mapped = mapIndex(raw)
    expect(mapped.dimensions).toBeNull()
    expect(mapped.similarityFunction).toBeNull()
    expect(mapped).toEqual({
      id: "idx-sparse",
      name: "sparse-index",
      region: "eu-west-1",
      dimensions: null,
      similarityFunction: null,
      type: "free",
      endpoint: null,
    })
  })

  test("maps type to null when absent", () => {
    const raw: RawVectorIndex = {
      customer_id: "user@example.com",
      id: "idx-untyped",
      name: "untyped-index",
      region: "us-central1",
    }
    expect(mapIndex(raw).type).toBeNull()
  })
})
