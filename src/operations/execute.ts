import type { UpstashCreds } from "../config.ts"
import type { OperationPlan } from "../types.ts"
import * as realApi from "../api/upstash.ts"
import { generateEnvSnippet as realGenerateEnv } from "../generators/env.ts"

export type ExecuteDeps = {
  api: {
    getDatabase: (creds: UpstashCreds, id: string) => Promise<any>
    createDatabase: (creds: UpstashCreds, input: any) => Promise<any>
    renameDatabase: (creds: UpstashCreds, id: string, name: string) => Promise<void>
    enableEviction: (creds: UpstashCreds, id: string) => Promise<void>
    disableEviction: (creds: UpstashCreds, id: string) => Promise<void>
    updateBudget: (creds: UpstashCreds, id: string, budget: number) => Promise<void>
    deleteDatabase: (creds: UpstashCreds, id: string) => Promise<void>
  }
  generateEnv: typeof realGenerateEnv
  writeFile: (path: string, content: string) => Promise<void>
}

export type ExecuteContext = {
  mode: "live" | "demo"
  creds: UpstashCreds | null
  deps?: Partial<ExecuteDeps>
}

export type ExecuteResult = {
  ok: boolean
  messages: string[]
  files: { path: string; content: string }[]
}

const defaultDeps: ExecuteDeps = {
  api: {
    getDatabase: realApi.getDatabase,
    createDatabase: realApi.createDatabase,
    renameDatabase: realApi.renameDatabase,
    enableEviction: realApi.enableEviction,
    disableEviction: realApi.disableEviction,
    updateBudget: realApi.updateBudget,
    deleteDatabase: realApi.deleteDatabase,
  },
  generateEnv: realGenerateEnv,
  writeFile: async (path: string, content: string) => {
    await Bun.write(path, content)
  },
}

function resolveDeps(partial: Partial<ExecuteDeps> | undefined): ExecuteDeps {
  return {
    api: { ...defaultDeps.api, ...(partial?.api ?? {}) },
    generateEnv: partial?.generateEnv ?? defaultDeps.generateEnv,
    writeFile: partial?.writeFile ?? defaultDeps.writeFile,
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

  if (!ctx.creds) {
    return { ok: false, messages: ["No Upstash credentials."], files: [] }
  }

  const creds = ctx.creds
  const deps = resolveDeps(ctx.deps)
  const messages: string[] = []
  const files: { path: string; content: string }[] = []

  for (const op of plan.operations) {
    try {
      switch (op.type) {
        case "redis.rename": {
          await deps.api.renameDatabase(creds, op.databaseId, op.newName)
          messages.push(`Renamed to "${op.newName}"`)
          break
        }
        case "redis.toggleEviction": {
          if (op.enabled) {
            await deps.api.enableEviction(creds, op.databaseId)
            messages.push("Eviction enabled")
          } else {
            await deps.api.disableEviction(creds, op.databaseId)
            messages.push("Eviction disabled")
          }
          break
        }
        case "redis.updateBudget": {
          await deps.api.updateBudget(creds, op.databaseId, op.budget)
          messages.push(`Budget set to $${op.budget}`)
          break
        }
        case "redis.generateEnv": {
          const raw = await deps.api.getDatabase(creds, op.databaseId)
          const secrets = {
            endpoint: raw.endpoint ?? "",
            port: raw.port ?? 0,
            password: raw.password ?? "",
            restToken: raw.rest_token ?? "",
          }
          const content = deps.generateEnv(raw.database_name ?? "", secrets)
          const path = ".env.local"
          await deps.writeFile(path, content)
          files.push({ path, content })
          messages.push(`Wrote ${path}`)
          break
        }
        case "redis.create": {
          const created = await deps.api.createDatabase(creds, {
            name: op.name,
            platform: "aws",
            primaryRegion: op.region,
            plan: op.plan,
          })
          messages.push(`Created database "${op.name ?? created?.name}"`)
          break
        }
        case "redis.delete": {
          await deps.api.deleteDatabase(creds, op.databaseId)
          messages.push(`Deleted "${op.name}"`)
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
