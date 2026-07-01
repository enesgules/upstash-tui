# upstash-tui — Live Developer API + AI Command Bar (design)

Turns the static Redis shell into a working console: real credentials, live
Upstash Developer API data, and an AI command bar that produces previewable,
confirmed operation plans. Redis only. Builds on the existing M1 shell.

## Scope

In: credentials/config, live Redis list + details, all Redis mutations
(create, rename, toggle eviction, update budget, generate env, **delete**),
the operation-plan → preview → confirm → execute flow, and an AI command bar
that emits validated operation plans.

Out: QStash/Workflow/Vector/Box, a Redis data browser, charts, pinned actions
(later milestone), multi-account support.

## Decisions (locked)

- **Execution:** all mutations including delete, each gated by a typed
  confirmation scaled to risk.
- **AI:** command → operation plan only. Never chats freely, never executes.
- **No credentials:** a setup screen that also offers a demo (mock) mode.

## Credentials & config

- `.env` (already git-ignored) holds secrets; `.env.example` (committed) documents them.
- Variables: `UPSTASH_EMAIL`, `UPSTASH_API_KEY`, `OPENROUTER_API_KEY`,
  `OPENROUTER_MODEL` (optional; default `anthropic/claude-3.5-sonnet`).
- Bun auto-loads `.env`. `src/config.ts` reads `process.env` and exposes:
  ```ts
  type Config = {
    upstash: { email: string; apiKey: string } | null
    openrouter: { apiKey: string; model: string } | null
  }
  export function loadConfig(): Config
  ```
- Secrets are never logged, never rendered in the UI.

## Live Developer API client — `src/api/upstash.ts`

Base `https://api.upstash.com/v2/redis`. Basic auth: `Authorization: Basic base64(email:apiKey)`.
Pure module, no UI imports. All functions take the `{email, apiKey}` creds.

| Function | Method + path | Body |
| --- | --- | --- |
| `listDatabases` | `GET /databases` | — |
| `getDatabase(id)` | `GET /database/{id}` | — (includes credentials) |
| `createDatabase` | `POST /database` | `{database_name, platform, primary_region, plan?, tls?}` |
| `renameDatabase(id)` | `POST /rename/{id}` | `{name}` |
| `enableEviction(id)` | `POST /enable-eviction/{id}` | — |
| `disableEviction(id)` | `POST /disable-eviction/{id}` | — |
| `updateBudget(id)` | `PATCH /update-budget/{id}` | `{budget}` |
| `deleteDatabase(id)` | `DELETE /database/{id}` | — |

Non-2xx responses throw a typed `UpstashApiError { status, message }`. `401`
is surfaced specially so the UI can route back to setup.

### Raw → `RedisDatabase` mapping (`mapDatabase`)

- `id` ← `database_id`; `name` ← `database_name`; `region` ← `primary_region`.
- `provider` ← `platform` when present, else inferred from region (`us-east-1`→AWS,
  `us-central1`→GCP); default `AWS`.
- `plan` ← human label from `type` (`free`→"Free", `payg`→"Pay as You Go",
  `pro`/`paid`→"Pro").
- `pinned` ← local pins (M7); default `false`.
- Limits: `storage.limitBytes` ← `db_disk_threshold`; `commands.limit` ←
  `db_request_limit` (null when unlimited/payg).
- `cost.budget` ← `budget`.
- **Usage honesty:** the list/get endpoints do not return current
  commands-used / storage-used / month-to-date cost as scalars. Live mode sets
  `commands.used`/`storage.usedBytes`/`cost.current` to `null`, and the UI
  renders `null` usage as `—`. Demo mode keeps the rich mock numbers. (Wiring
  the stats endpoint for real usage is a deferred follow-up.)

`RedisDatabase` gains `| null` on the three "used"/"current" numeric fields;
`formatCount`/`formatStorage`/`formatBudget` render `null` used as `—`.

## Operation plans, validation, execution

`OperationPlan` already exists in `src/types.ts` (unchanged).

- `src/operations/validate.ts` — `validatePlan(raw: unknown): OperationPlan`
  (throws `PlanValidationError` with a readable message). Checks: required
  fields, `risk` enum, every op is a known `type` with correctly-typed params.
  Used for AI output and any externally-built plan.
- `src/operations/execute.ts` — `executePlan(plan, ctx): Promise<ExecuteResult>`.
  Runs each op via `api/upstash`, collects generated files, returns
  `{ ok, messages, files }`. Only ever called on a **confirmed** plan. In demo
  mode it is a no-op returning "would run in live mode".
- `src/generators/env.ts` — `generateEnvSnippet(db, secrets)` builds the
  `.env.local` content (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
  `REDIS_URL`). `redis.generateEnv` fetches `getDatabase(id)` for secrets, then
  writes `generatedFiles`.

### Risk → confirmation (in `OperationPreview`)

- `safe` (rename, eviction, budget, generateEnv) → `y/N`.
- `paid` (create) → type `confirm`.
- `destructive` (delete) → type the exact database name.

The preview modal shows title, summary, a colored risk badge, the operation
list, and any generated file contents. Confirm executes; anything else cancels.
Nothing mutates without passing the gate.

## AI command bar — `src/api/openrouter.ts` + `src/ai/planner.ts`

- `openrouter.ts` — `chatJSON({apiKey, model}, system, user)` POSTs to
  `https://openrouter.ai/api/v1/chat/completions` with
  `response_format: { type: "json_object" }`, returns the assistant string.
  Headers: `Authorization: Bearer`, `HTTP-Referer`/`X-Title` for attribution.
- `planner.ts` — `planFromCommand(command, context): Promise<OperationPlan>`.
  Builds a system prompt describing the allowed operation types, the risk
  rules, and the current context (selected DB id/name/region, available
  regions). Calls `chatJSON`, then `validatePlan`. On invalid JSON or
  unsupported request → throws a helpful message the command bar shows inline.
  The AI never receives credentials and never executes.

## UI changes

- **`SetupView`** (`src/tui/views/SetupView.tsx`) — shown when `upstash` creds
  are absent (or after a 401). Lists the required `.env` vars (never values),
  a "retry" (re-load config) and "continue in demo mode". No secret input
  fields — credentials come from `.env`.
- **App routing** — on launch `loadConfig()`. Home → product as today. Opening
  Redis: if live creds present → live dashboard (fetch on mount); else if user
  chose demo → mock dashboard with a `DEMO` badge; else → `SetupView`.
- **`RedisDashboard`** — fetches `listDatabases` on mount with loading/error
  states (`—`/spinner text, error → message + retry, 401 → SetupView). Adds
  keybindings that build a plan for the selected DB and open the preview:
  `r` refresh · `e` toggle eviction · `g` generate `.env.local` · `d` delete.
  Selection nav (`↑↓/jk`) unchanged.
- **`CommandBar`** — becomes focusable (`i` or `/` to focus, `Esc` to blur).
  On submit → `planFromCommand` (shows "thinking…") → `OperationPreview`, or an
  inline error. Disabled with a hint when `openrouter` creds are absent.
- **`OperationPreview`** (`src/tui/components/OperationPreview.tsx`) — the modal
  described above; the single choke point for every mutation.

## Error handling

- Missing/invalid Upstash creds → SetupView (401 detection).
- Network/5xx → readable error line with retry; never crash the TUI.
- AI: non-JSON or schema-invalid → inline "couldn't build a plan" message; plan
  is never executed.
- Execution failure mid-plan → stop, report which op failed and its message.

## Testing (`bun test`, with fixtures — no live HTTP in tests)

- `mapDatabase`: raw API fixture → `RedisDatabase` (plan labels, region,
  limits, `null` usage).
- `validatePlan`: accepts each valid op; rejects malformed/unknown ops, bad
  risk, missing fields.
- `generateEnvSnippet`: correct `.env.local` content from db + secrets.
- Risk→confirmation rules: `requiresConfirmation` / confirmation kind per risk.
- `config.loadConfig`: presence/absence of each var → correct shape.
- Live HTTP paths and the TUI are verified manually / via the test renderer;
  execution against the real account is exercised by the user with their creds.

## Phasing (for the implementation plan)

1. **Read-first:** `.env.example`, `config.ts`, `api/upstash.ts` (list/get +
   `mapDatabase`), `SetupView`, live/demo wiring in App + RedisDashboard,
   `null`-usage rendering. Ships a working live read-only console.
2. **Write + AI:** `operations/validate` + `execute`, `generators/env`,
   `OperationPreview`, dashboard action keybindings, then
   `api/openrouter` + `ai/planner` + interactive CommandBar.

## File structure (new/changed)

```
.env.example                         (new)
src/config.ts                        (new)
src/api/upstash.ts                   (new)
src/api/openrouter.ts                (new, phase 2)
src/ai/planner.ts                    (new, phase 2)
src/operations/validate.ts           (new, phase 2)
src/operations/execute.ts            (new, phase 2)
src/generators/env.ts                (new, phase 2)
src/tui/views/SetupView.tsx          (new)
src/tui/components/OperationPreview.tsx (new, phase 2)
src/types.ts                         (change: null usage fields)
src/format.ts                        (change: render null used as —)
src/mock.ts                          (unchanged; demo data)
src/tui/App.tsx                      (change: config + routing)
src/tui/views/RedisDashboard.tsx     (change: live fetch, keybindings, preview)
src/tui/components/CommandBar.tsx     (change: interactive)
```
