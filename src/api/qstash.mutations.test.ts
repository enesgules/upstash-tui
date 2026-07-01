import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  deleteDlqMessage,
  deleteSchedule,
  pauseSchedule,
  publishMessage,
  resumeSchedule,
} from "./qstash.ts"
import type { QStashCreds } from "./qstash.ts"

const creds: QStashCreds = { token: "test-token" }

type FetchCall = {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

let calls: FetchCall[] = []
let responseBody = ""
let responseStatus = 200
const originalFetch = globalThis.fetch

beforeEach(() => {
  calls = []
  responseBody = ""
  responseStatus = 200
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const headers: Record<string, string> = {}
    if (init?.headers) {
      for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
        headers[key] = value
      }
    }
    calls.push({ url, method: init?.method ?? "GET", headers, body: init?.body })
    return new Response(responseBody, { status: responseStatus })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("publishMessage", () => {
  test("posts to /publish/<destination> with the raw body string", async () => {
    responseBody = JSON.stringify({ messageId: "msg-1" })

    const result = await publishMessage(creds, {
      destination: "https://example.com/x",
      body: "hello world",
    })

    expect(calls).toHaveLength(1)
    const call = calls[0]!
    expect(call.method).toBe("POST")
    expect(call.url).toBe("https://qstash.upstash.io/v2/publish/https://example.com/x")
    expect(call.body).toBe("hello world")
    expect(call.headers.Authorization).toBe("Bearer test-token")
    expect(call.headers["Content-Type"]).toBe("text/plain")
    expect(result).toEqual({ messageId: "msg-1" })
  })

  test("sets Content-Type from input and Upstash-Delay header when delaySeconds is set", async () => {
    responseBody = JSON.stringify({ messageId: "msg-2" })

    await publishMessage(creds, {
      destination: "https://example.com/x",
      body: '{"a":1}',
      contentType: "application/json",
      delaySeconds: 10,
    })

    const call = calls[0]!
    expect(call.headers["Content-Type"]).toBe("application/json")
    expect(call.headers["Upstash-Delay"]).toBe("10s")
    expect(call.body).toBe('{"a":1}')
  })

  test("does not set Upstash-Delay header when delaySeconds is absent", async () => {
    responseBody = JSON.stringify({ messageId: "msg-3" })

    await publishMessage(creds, { destination: "https://example.com/x", body: "hi" })

    expect(calls[0]!.headers["Upstash-Delay"]).toBeUndefined()
  })

  test("handles an array response and returns the first messageId", async () => {
    responseBody = JSON.stringify([{ messageId: "msg-4", url: "https://endpoint-1.com" }])

    const result = await publishMessage(creds, {
      destination: "my-url-group",
      body: "hi",
    })

    expect(result).toEqual({ messageId: "msg-4" })
  })

  test("throws UpstashApiError on non-2xx response", async () => {
    responseStatus = 400
    responseBody = "bad request"

    await expect(
      publishMessage(creds, { destination: "https://example.com/x", body: "hi" }),
    ).rejects.toThrow("bad request")
  })
})

describe("pauseSchedule", () => {
  test("POSTs to /schedules/<id>/pause", async () => {
    await pauseSchedule(creds, "scd-123")

    expect(calls).toHaveLength(1)
    expect(calls[0]!.method).toBe("POST")
    expect(calls[0]!.url).toBe("https://qstash.upstash.io/v2/schedules/scd-123/pause")
  })
})

describe("resumeSchedule", () => {
  test("POSTs to /schedules/<id>/resume", async () => {
    await resumeSchedule(creds, "scd-123")

    expect(calls).toHaveLength(1)
    expect(calls[0]!.method).toBe("POST")
    expect(calls[0]!.url).toBe("https://qstash.upstash.io/v2/schedules/scd-123/resume")
  })
})

describe("deleteSchedule", () => {
  test("DELETEs /schedules/<id>", async () => {
    await deleteSchedule(creds, "scd-123")

    expect(calls).toHaveLength(1)
    expect(calls[0]!.method).toBe("DELETE")
    expect(calls[0]!.url).toBe("https://qstash.upstash.io/v2/schedules/scd-123")
  })
})

describe("deleteDlqMessage", () => {
  test("DELETEs /dlq/<id>", async () => {
    await deleteDlqMessage(creds, "dlq-123")

    expect(calls).toHaveLength(1)
    expect(calls[0]!.method).toBe("DELETE")
    expect(calls[0]!.url).toBe("https://qstash.upstash.io/v2/dlq/dlq-123")
  })
})
