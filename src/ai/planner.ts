import type { OperationPlan } from "../types.ts"
import { validatePlan } from "../operations/validate.ts"

export type PlannerContext = {
  selectedDatabase?: { id: string; name: string; region: string } | null
  regions?: string[]
}

export type ChatFn = (system: string, user: string) => Promise<string>

// Some models ignore response_format and wrap JSON in prose or ```json fences.
// Pull out the JSON object so the planner works across models.
function extractJson(raw: string): string {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence && fence[1]) s = fence[1].trim()
  const first = s.indexOf("{")
  const last = s.lastIndexOf("}")
  if (first !== -1 && last > first) s = s.slice(first, last + 1)
  return s
}

const SYSTEM_PROMPT_HEADER = `You are the planning engine behind an Upstash Redis TUI command bar. Given a
natural-language request from the user, you produce a single JSON object describing an
"operation plan" to be previewed and confirmed by the user before anything runs. You never
execute anything yourself, and you never see or need credentials.

Reply with ONLY a JSON object - no prose, no markdown fences. The object must match exactly
one of these two shapes:

1. A valid operation plan:
{
  "title": string,
  "summary": string,
  "risk": "safe" | "paid" | "destructive",
  "requiresConfirmation": boolean,
  "operations": [ ...one or more operation objects, see below... ],
  "generatedFiles": [ { "path": string, "content": string }, ... ]  // optional, omit if unused
}

2. An error, if the request cannot be turned into a supported plan:
{ "error": "short human-readable reason" }

Allowed operation object shapes (the "type" field is required and must be exactly one of these):
- { "type": "redis.create", "name": string, "region"?: string, "plan"?: string }
- { "type": "redis.rename", "databaseId": string, "newName": string }
- { "type": "redis.toggleEviction", "databaseId": string, "enabled": boolean }
- { "type": "redis.updateBudget", "databaseId": string, "budget": number }
- { "type": "redis.generateEnv", "databaseId": string }

Risk rules (set "risk" and "requiresConfirmation" accordingly):
- "redis.create" -> risk "paid", requiresConfirmation true.
- "redis.rename", "redis.toggleEviction", "redis.updateBudget", "redis.generateEnv" -> risk
  "safe", requiresConfirmation true.
- There is NO delete/destroy operation type available to you. Deleting a database is NOT
  supported by this planner - if the user asks to delete/destroy a database, reply with the
  error shape instead of inventing an operation.
- Never invent operation types or fields beyond what is listed above. If the request doesn't
  map cleanly onto the allowed operations, reply with the error shape.`

function buildSystemPrompt(context: PlannerContext): string {
  const lines = [SYSTEM_PROMPT_HEADER, "", "Current context:"]

  if (context.selectedDatabase) {
    const { id, name, region } = context.selectedDatabase
    lines.push(`- Selected database: id=${id}, name=${JSON.stringify(name)}, region=${region}`)
  } else {
    lines.push("- No database is currently selected.")
  }

  if (context.regions && context.regions.length > 0) {
    lines.push(`- Available regions: ${context.regions.join(", ")}`)
  }

  lines.push(
    "",
    "When the user refers to \"this database\", \"it\", or similar without naming one, use the" +
      " selected database's id. If there is no selected database and the request needs one," +
      " reply with the error shape explaining that a database must be selected first.",
  )

  return lines.join("\n")
}

export async function planFromCommand(
  command: string,
  context: PlannerContext,
  chat: ChatFn,
): Promise<OperationPlan> {
  const system = buildSystemPrompt(context)

  const raw = await chat(system, command)

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch (error) {
    throw new Error(`Couldn't turn that into a valid plan: response wasn't valid JSON (${(error as Error).message})`)
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    typeof (parsed as { error?: unknown }).error === "string"
  ) {
    throw new Error((parsed as { error: string }).error)
  }

  try {
    return validatePlan(parsed)
  } catch (error) {
    throw new Error(`Couldn't turn that into a valid plan: ${(error as Error).message}`)
  }
}
