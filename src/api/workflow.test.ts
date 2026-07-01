import { describe, expect, test } from "bun:test"
import { mapWorkflowRun } from "./workflow.ts"
import type { RawWorkflowRun } from "./workflow.ts"

describe("mapWorkflowRun", () => {
  test("maps a realistic workflow run from the docs", () => {
    const raw: RawWorkflowRun = {
      workflowRunId: "wfr_abc123",
      workflowUrl: "https://my-endpoint.com/workflow",
      workflowState: "RUN_SUCCESS",
      workflowRunCreatedAt: 1735689600000,
      workflowRunCompletedAt: 1735689660000,
      workflowRunCallerIp: "127.0.0.1",
      labels: ["my-workflow"],
      flowControlKey: "USER_GIVEN_KEY",
    }

    expect(mapWorkflowRun(raw)).toEqual({
      id: "wfr_abc123",
      url: "https://my-endpoint.com/workflow",
      state: "RUN_SUCCESS",
      createdAt: 1735689600000,
    })
  })

  test("defaults createdAt to null when absent", () => {
    const raw: RawWorkflowRun = {
      workflowRunId: "wfr_def456",
      workflowUrl: "https://another-endpoint.com/workflow",
      workflowState: "RUN_STARTED",
    }

    expect(mapWorkflowRun(raw)).toEqual({
      id: "wfr_def456",
      url: "https://another-endpoint.com/workflow",
      state: "RUN_STARTED",
      createdAt: null,
    })
  })

  test("maps a failed workflow run", () => {
    const raw: RawWorkflowRun = {
      workflowRunId: "wfr_ghi789",
      workflowUrl: "https://failing-endpoint.com/workflow",
      workflowState: "RUN_FAILED",
      workflowRunCreatedAt: 1735776000000,
      dlqId: "dlq-123",
    }

    expect(mapWorkflowRun(raw)).toEqual({
      id: "wfr_ghi789",
      url: "https://failing-endpoint.com/workflow",
      state: "RUN_FAILED",
      createdAt: 1735776000000,
    })
  })
})
