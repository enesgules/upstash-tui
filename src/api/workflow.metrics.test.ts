import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { getWorkflowMetrics } from "./workflow.ts"
import type { QStashCreds } from "./qstash.ts"

const creds: QStashCreds = { token: "test-token" }

let responseBody = ""
const originalFetch = globalThis.fetch

beforeEach(() => {
  responseBody = ""
  globalThis.fetch = (async () => {
    return new Response(responseBody, { status: 200 })
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("getWorkflowMetrics", () => {
  test("counts runs from the logs endpoint and leaves unavailable fields null", async () => {
    responseBody = JSON.stringify({
      cursor: "",
      runs: [
        {
          workflowRunId: "wfr_1",
          workflowUrl: "https://my-endpoint.com/workflow",
          workflowState: "RUN_SUCCESS",
          workflowRunCreatedAt: 1735689600000,
        },
        {
          workflowRunId: "wfr_2",
          workflowUrl: "https://my-endpoint.com/workflow",
          workflowState: "RUN_STARTED",
          workflowRunCreatedAt: 1735689700000,
        },
        {
          workflowRunId: "wfr_3",
          workflowUrl: "https://my-endpoint.com/workflow",
          workflowState: "RUN_FAILED",
          workflowRunCreatedAt: 1735689800000,
        },
      ],
    })

    const metrics = await getWorkflowMetrics(creds)

    expect(metrics).toEqual({
      messages: null,
      runs: 3,
      bandwidthBytes: null,
      cost: null,
    })
  })

  test("counts zero runs when the logs endpoint returns an empty list", async () => {
    responseBody = JSON.stringify({ cursor: "", runs: [] })

    const metrics = await getWorkflowMetrics(creds)

    expect(metrics).toEqual({
      messages: null,
      runs: 0,
      bandwidthBytes: null,
      cost: null,
    })
  })

  test("handles a bare array response shape", async () => {
    responseBody = JSON.stringify([
      {
        workflowRunId: "wfr_1",
        workflowUrl: "https://my-endpoint.com/workflow",
        workflowState: "RUN_SUCCESS",
      },
    ])

    const metrics = await getWorkflowMetrics(creds)

    expect(metrics.runs).toBe(1)
    expect(metrics.messages).toBeNull()
    expect(metrics.bandwidthBytes).toBeNull()
    expect(metrics.cost).toBeNull()
  })
})
