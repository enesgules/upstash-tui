import type { OperationPlan } from "../types.ts"
import { validatePlan } from "../operations/validate.ts"

// A compact, read-only snapshot of a database so the planner can *answer*
// questions ("which db costs the most?") from data already loaded client-side,
// with no extra API calls.
export type PlannerDatabase = {
  id: string
  name: string
  region: string
  plan: string
  eviction: boolean
  prodPack: boolean
  commandsUsed: number | null
  storageUsedBytes: number | null
  costCurrent: number | null
  costBudget: number | null
}

export type PlannerContext = {
  selectedDatabase?: { id: string; name: string; region: string } | null
  regions?: string[]
  databases?: PlannerDatabase[]
}

// The command bar has two lanes: the planner either answers a read-only
// question, or produces a mutation plan to preview and confirm.
export type PlannerResult =
  | { kind: "answer"; text: string }
  | { kind: "plan"; plan: OperationPlan }

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

const SYSTEM_PROMPT_HEADER = `You are the assistant behind an Upstash Redis TUI command bar. You either ANSWER a
read-only question, or produce a mutation PLAN that the user previews and confirms before
anything runs. You never execute anything yourself, and you never see or need credentials.

Reply with ONLY a JSON object - no prose, no markdown fences. The object must match exactly
one of these two shapes:

1. An answer (use this for questions, summaries, "what can you do?", and anything that does
   NOT change infrastructure). Answer from the database data provided in context - do not
   make up numbers. Keep it to 1-3 short sentences.
{ "kind": "answer", "text": "..." }

2. An operation plan (use this ONLY when the user asks to change something):
{
  "kind": "plan",
  "title": string,
  "summary": string,
  "risk": "safe" | "paid" | "destructive",
  "requiresConfirmation": boolean,
  "operations": [ ...one or more operation objects, see below... ]
}

Default to the answer shape whenever you are unsure. Prefer answering over refusing: if a
request isn't a supported mutation, answer with what you CAN do instead.

Allowed operation object shapes (the "type" field is required and must be exactly one of these):
- { "type": "redis.create", "name": string, "region"?: string, "plan"?: string }
- { "type": "redis.rename", "databaseId": string, "newName": string }
- { "type": "redis.toggleEviction", "databaseId": string, "enabled": boolean }
- { "type": "redis.updateBudget", "databaseId": string, "budget": number }

Risk rules (set "risk" and "requiresConfirmation" accordingly):
- "redis.create" -> risk "paid", requiresConfirmation true. Always set "region"; if the user
  doesn't specify one, pick a sensible default from the available regions in context (use
  "us-east-1" if none are listed).
- "redis.rename", "redis.toggleEviction", "redis.updateBudget" -> risk
  "safe", requiresConfirmation true.
- There is NO delete/destroy operation type available to you. Deleting a database is NOT
  supported here - if the user asks to delete/destroy a database, use the answer shape to say
  they should select it and press d instead.
- Never invent operation types or fields beyond what is listed above.`

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

  if (context.databases && context.databases.length > 0) {
    lines.push("", "Databases (use this data to answer questions - never invent values):")
    for (const db of context.databases) {
      lines.push(`- ${JSON.stringify(db)}`)
    }
  } else {
    lines.push("- No databases are loaded.")
  }

  lines.push(
    "",
    "When the user refers to \"this database\", \"it\", or similar without naming one, use the" +
      " selected database's id. If there is no selected database and the request needs one," +
      " answer explaining that a database must be selected first.",
  )

  return lines.join("\n")
}

export async function planFromCommand(
  command: string,
  context: PlannerContext,
  chat: ChatFn,
): Promise<PlannerResult> {
  const system = buildSystemPrompt(context)

  const raw = await chat(system, command)

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch (error) {
    throw new Error(`Couldn't turn that into a valid plan: response wasn't valid JSON (${(error as Error).message})`)
  }

  const obj =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}

  // Answer lane: read-only replies and soft refusals.
  if (obj.kind === "answer" && typeof obj.text === "string") {
    return { kind: "answer", text: obj.text }
  }

  // Legacy/hard error shape still surfaces as a thrown error (red).
  if (typeof obj.error === "string") {
    throw new Error(obj.error)
  }

  let plan: OperationPlan
  try {
    plan = validatePlan(parsed)
  } catch (error) {
    throw new Error(`Couldn't turn that into a valid plan: ${(error as Error).message}`)
  }

  // Deletion is deliberately unreachable from the AI command bar: even if the
  // model ignores the prompt and emits a delete op, we refuse it here. Deleting
  // stays a code-driven, name-confirmed action (press `d` on a database).
  if (plan.operations.some((op) => op.type === "redis.delete")) {
    throw new Error("Deleting a database isn't supported from the command bar — select it and press d instead.")
  }

  return { kind: "plan", plan }
}
