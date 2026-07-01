import { apiRequest } from "./http.ts"
import type { QStashCreds } from "./qstash.ts"

const DEFAULT_BASE_URL = "https://qstash.upstash.io/v2"

function auth(creds: QStashCreds): string {
  return `Bearer ${creds.token}`
}

// Workflow runs live under the same QStash management API; an override
// (e.g. a regional URL) is normalized to include the /v2 path segment.
function base(creds: QStashCreds): string {
  const url = creds.baseUrl?.replace(/\/+$/, "")
  if (!url) return DEFAULT_BASE_URL
  return url.endsWith("/v2") ? url : `${url}/v2`
}

/**
 * Raw shape returned by `GET /v2/workflows/logs`, per
 * https://upstash.com/docs/workflow/api-reference/logs/list-workflow-run-logs
 */
export type RawWorkflowRun = {
  workflowRunId: string
  workflowUrl: string
  workflowState: string
  workflowRunCreatedAt?: number
  workflowRunCompletedAt?: number
  workflowRunCallerIp?: string
  labels?: string[]
  flowControlKey?: string
  dlqId?: string
  [key: string]: unknown
}

export type WorkflowRun = {
  id: string
  url: string
  state: string // e.g. "RUN_STARTED" | "RUN_SUCCESS" | "RUN_FAILED"
  createdAt: number | null
}

export function mapWorkflowRun(raw: RawWorkflowRun): WorkflowRun {
  return {
    id: raw.workflowRunId,
    url: raw.workflowUrl,
    state: raw.workflowState,
    createdAt: raw.workflowRunCreatedAt ?? null,
  }
}

/**
 * List workflow runs via `GET /v2/workflows/logs`. Workflow runs are QStash
 * messages, so this uses the same token/base-url convention as the rest of
 * the QStash management API (see ./qstash.ts).
 */
export async function listWorkflowRuns(creds: QStashCreds): Promise<WorkflowRun[]> {
  const raw = await apiRequest<{ runs?: RawWorkflowRun[] } | RawWorkflowRun[]>({
    method: "GET",
    url: `${base(creds)}/workflows/logs`,
    auth: auth(creds),
  })
  const runs = Array.isArray(raw) ? raw : (raw.runs ?? [])
  return runs.map(mapWorkflowRun)
}
