import type { UpstashCreds, QStashCreds } from "../config.ts"
import type { OperationPlan } from "../types.ts"
import * as realApi from "../api/upstash.ts"
import * as realQstash from "../api/qstash.ts"

// Upstash's create API requires a region; the AI planner may omit it, so we
// fall back to a sensible default rather than sending an undefined region.
const DEFAULT_CREATE_REGION = "us-east-1"

export type ExecuteDeps = {
  api: {
    createDatabase: (creds: UpstashCreds, input: any) => Promise<any>
    renameDatabase: (creds: UpstashCreds, id: string, name: string) => Promise<void>
    enableEviction: (creds: UpstashCreds, id: string) => Promise<void>
    disableEviction: (creds: UpstashCreds, id: string) => Promise<void>
    updateBudget: (creds: UpstashCreds, id: string, budget: number) => Promise<void>
    deleteDatabase: (creds: UpstashCreds, id: string) => Promise<void>
  }
  qstash: {
    publishMessage: (
      creds: QStashCreds,
      input: { destination: string; body: string; delaySeconds?: number },
    ) => Promise<{ messageId: string }>
    pauseSchedule: (creds: QStashCreds, id: string) => Promise<void>
    resumeSchedule: (creds: QStashCreds, id: string) => Promise<void>
    deleteSchedule: (creds: QStashCreds, id: string) => Promise<void>
    deleteDlqMessage: (creds: QStashCreds, id: string) => Promise<void>
  }
}

export type ExecuteContext = {
  mode: "live" | "demo"
  creds: UpstashCreds | null
  qstash?: QStashCreds | null
  deps?: Partial<ExecuteDeps>
}

export type ExecuteResult = {
  ok: boolean
  messages: string[]
  files: { path: string; content: string }[]
}

const defaultDeps: ExecuteDeps = {
  api: {
    createDatabase: realApi.createDatabase,
    renameDatabase: realApi.renameDatabase,
    enableEviction: realApi.enableEviction,
    disableEviction: realApi.disableEviction,
    updateBudget: realApi.updateBudget,
    deleteDatabase: realApi.deleteDatabase,
  },
  qstash: {
    publishMessage: realQstash.publishMessage,
    pauseSchedule: realQstash.pauseSchedule,
    resumeSchedule: realQstash.resumeSchedule,
    deleteSchedule: realQstash.deleteSchedule,
    deleteDlqMessage: realQstash.deleteDlqMessage,
  },
}

function resolveDeps(partial: Partial<ExecuteDeps> | undefined): ExecuteDeps {
  return {
    api: { ...defaultDeps.api, ...(partial?.api ?? {}) },
    qstash: { ...defaultDeps.qstash, ...(partial?.qstash ?? {}) },
  }
}

export async function executePlan(plan: OperationPlan, ctx: ExecuteContext): Promise<ExecuteResult> {
  if (ctx.mode === "demo") {
    return {
      ok: true,
      messages: [
        `Demo mode — would run ${plan.operations.length} operation(s) against your account in live mode.`,
      ],
      files: [],
    }
  }

  const needsUpstash = plan.operations.some((o) => o.type.startsWith("redis."))
  const needsQstash = plan.operations.some((o) => o.type.startsWith("qstash."))
  if (needsUpstash && !ctx.creds) {
    return { ok: false, messages: ["No Upstash credentials."], files: [] }
  }
  if (needsQstash && !ctx.qstash) {
    return { ok: false, messages: ["No QStash credentials."], files: [] }
  }

  const creds = ctx.creds
  const qstash = ctx.qstash
  const deps = resolveDeps(ctx.deps)
  const messages: string[] = []
  const files: { path: string; content: string }[] = []

  for (const op of plan.operations) {
    try {
      switch (op.type) {
        case "redis.rename": {
          await deps.api.renameDatabase(creds!, op.databaseId, op.newName)
          messages.push(`Renamed to "${op.newName}"`)
          break
        }
        case "redis.toggleEviction": {
          if (op.enabled) {
            await deps.api.enableEviction(creds!, op.databaseId)
            messages.push("Eviction enabled")
          } else {
            await deps.api.disableEviction(creds!, op.databaseId)
            messages.push("Eviction disabled")
          }
          break
        }
        case "redis.updateBudget": {
          await deps.api.updateBudget(creds!, op.databaseId, op.budget)
          messages.push(`Budget set to $${op.budget}`)
          break
        }
        case "redis.create": {
          const created = await deps.api.createDatabase(creds!, {
            name: op.name,
            platform: "aws",
            primaryRegion: op.region ?? DEFAULT_CREATE_REGION,
            plan: op.plan,
          })
          messages.push(`Created database "${op.name ?? created?.name}"`)
          break
        }
        case "redis.delete": {
          await deps.api.deleteDatabase(creds!, op.databaseId)
          messages.push(`Deleted "${op.name}"`)
          break
        }
        case "qstash.publish": {
          const res = await deps.qstash.publishMessage(qstash!, {
            destination: op.destination,
            body: op.body,
            delaySeconds: op.delaySeconds,
          })
          messages.push(`Published to ${op.destination} (${res.messageId})`)
          break
        }
        case "qstash.pauseSchedule": {
          await deps.qstash.pauseSchedule(qstash!, op.scheduleId)
          messages.push(`Paused schedule ${op.name}`)
          break
        }
        case "qstash.resumeSchedule": {
          await deps.qstash.resumeSchedule(qstash!, op.scheduleId)
          messages.push(`Resumed schedule ${op.name}`)
          break
        }
        case "qstash.deleteSchedule": {
          await deps.qstash.deleteSchedule(qstash!, op.scheduleId)
          messages.push(`Deleted schedule ${op.name}`)
          break
        }
        case "qstash.deleteDlq": {
          await deps.qstash.deleteDlqMessage(qstash!, op.dlqId)
          messages.push(`Deleted DLQ message ${op.name}`)
          break
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      messages.push(`Failed: ${op.type} — ${reason}`)
      return { ok: false, messages, files }
    }
  }

  return { ok: true, messages, files }
}
