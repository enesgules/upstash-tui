# upstash-tui — Design

A terminal-native Upstash console built with OpenTUI. It reflects the current
Upstash web console but is optimized for terminal workflows. Scope for v1 is
intentionally small: **Redis only**, with other products shown as disabled
placeholder tabs.

## Goals

- Make the first screen impressive even with mock data.
- Feel like Upstash: clean, dark, emerald accent, subtle gray borders, sharp.
- Prefer polish over breadth. Build incrementally.
- Never let the AI execute actions directly — it only produces a previewable
  operation plan. Every mutation requires user confirmation.

## Non-goals (v1)

- QStash, Workflow, Vector, Box (placeholder tabs only — not implemented).
- A full Redis data browser.
- Charts beyond very simple summaries.
- Deleting databases (deferred until everything else is stable).

## Runtime & stack

- **Bun** runtime, TypeScript, `.tsx` throughout.
- **OpenTUI React bindings** (`@opentui/react` + `@opentui/core`), matching the
  existing scaffold (`index.tsx`, `jsxImportSource: @opentui/react`).
  Rationale: the app is stateful and view-switching (auth screen, product tabs,
  list selection, confirmation modals). React's declarative state model fits
  this far better than the imperative core API.

## Architecture & module boundaries

```
index.tsx                      # entry: createCliRenderer + render <App/>
src/
  config.ts                    # loads env creds, resolves config state
  theme.ts                     # colors, spacing, border tokens (the Upstash look)
  types.ts                     # RedisDatabase, OperationPlan, Risk, etc.
  mock.ts                      # mock Redis data for M1
  api/upstash.ts               # Developer API client (M3)
  api/openrouter.ts            # AI client (M6)
  ai/planner.ts                # NL -> OperationPlan (M6)
  operations/validate.ts       # plan validation (M4/M5)
  operations/execute.ts        # plan execution against the API (M4/M5)
  pins/store.ts                # ~/.upstash-tui/actions.json (M7)
  generators/env.ts            # .env.local snippet (M4)
  tui/
    App.tsx                    # root: routes Auth vs Dashboard, global keymap
    views/AuthView.tsx         # credential screen (M2)
    views/RedisDashboard.tsx   # the main screen
    components/ProductNav.tsx
    components/SummaryCard.tsx
    components/ResourceList.tsx
    components/DetailsPanel.tsx
    components/CommandBar.tsx
    components/OperationPreview.tsx   # confirm modal (M5)
```

**Boundary rule:** `tui/*` is pure presentation plus local React state. All I/O
(`api/`, `pins/`, `generators/`) is non-React and independently unit-testable.
The `OperationPlan` type is the contract between the AI planner, the preview
modal, and the executor. Nothing mutates without first producing a plan.

## Data flow

```
env / AuthView  ->  config  ->  api/upstash (M3)  ->  RedisDatabase[]
                                                         |
                                                RedisDashboard state
                                                         |
              user action / AI command  ->  OperationPlan
                                                         |
                                        OperationPreview (confirm gate)
                                                         |
                                          operations/execute  ->  api/upstash
```

## Types

`src/types.ts` defines the shared contracts up front so mock data stays honest
and later milestones slot in without reshaping data.

```ts
type Risk = "safe" | "paid" | "destructive";

type RedisDatabase = {
  id: string;
  name: string;
  plan: string;         // e.g. "Pay as You Go", "Free"
  provider: string;     // e.g. "AWS"
  region: string;       // e.g. "us-east-1"
  pinned: boolean;
  commands: { used: number; limit: number | null };   // null = Unlimited
  storage: { usedBytes: number; limitBytes: number | null };
  cost: { current: number; budget: number | null };
};

type OperationPlan = {
  title: string;
  summary: string;
  risk: Risk;
  requiresConfirmation: boolean;
  operations: Array<
    | { type: "redis.create"; name: string; region?: string; plan?: string }
    | { type: "redis.rename"; databaseId: string; newName: string }
    | { type: "redis.toggleEviction"; databaseId: string; enabled: boolean }
    | { type: "redis.updateBudget"; databaseId: string; budget: number }
    | { type: "redis.generateEnv"; databaseId: string }
  >;
  generatedFiles?: Array<{ path: string; content: string }>;
};
```

## Theme

`src/theme.ts` centralizes every visual token — no hardcoded colors scattered
across components. This is what keeps the Upstash look consistent as milestones
are added.

- `bg`: dark background
- `accent`: emerald `#00E9A3` (active tab, highlights, selection)
- `border`: subtle gray
- `textBright`, `textDim`: primary / secondary text
- spacing constants (padding, gaps, list column width)

## Milestone 1 — the static beautiful shell (build first)

This is the only milestone in the first implementation plan.

**Layout** — full-screen flexbox column:

- `ProductNav` — top bar. `Redis` active (emerald); `QStash`, `Workflow`,
  `Vector` dimmed gray; `Box` dimmed with a `NEW` badge. Non-Redis tabs are
  visibly disabled.
- `SummaryCard` — Redis header row with a subtitle
  ("Low-latency serverless key-value store") and three summary figures:
  Commands, Storage, Cost (mock totals).
- Middle row (`flexDirection: row`, grows to fill height):
  - `ResourceList` (left, ~34 cols): a "Databases" card with a search field
    (visible but inert in M1) and the list of databases. Pinned rows show `★`.
  - `DetailsPanel` (right, `flexGrow`): details for the selected database —
    plan · provider · region header, then Commands / Storage / Cost with their
    limits.
- `CommandBar` — bottom "Ask Upstash" input box. Focusable but inert in M1.

**Interactivity (M1):**

- `useKeyboard` at the dashboard level.
- `↑ / ↓` or `j / k` move the selection in the database list.
- Selected database drives `DetailsPanel` (live selection).
- Product tabs render but only Redis is active.
- `Ctrl+C` exits.

**Mock data** — `src/mock.ts` exports ~3–5 `RedisDatabase` objects mirroring the
reference mockup (e.g. `context7-prod`, `context7-prod-ratelimit`,
`context7-mcp-sessions`) with all fields the details panel and summary card
need.

## Later milestones (order + gates, unchanged from spec)

2. **Credentials.** Read `UPSTASH_EMAIL`, `UPSTASH_API_KEY`,
   `OPENROUTER_API_KEY` from env. If Upstash creds are missing, show
   `AuthView`. Never hardcode secrets.
3. **Developer API client** (`api/upstash.ts`). Basic auth (email + developer
   API key). List Redis databases; get details as needed. API code isolated
   here.
4. **Safe Redis actions.** refresh list, create database, rename, enable/disable
   eviction, update budget, generate `.env.local` snippet for the selected
   database. No delete yet.
5. **Operation preview.** Every mutation first builds an `OperationPlan`, shown
   in `OperationPreview`. Confirmation gates by risk:
   - `safe` → `y/N`
   - `paid` → type `confirm`
   - `destructive` → type the database name
6. **OpenRouter AI command bar.** NL command + selected-DB context → OpenRouter
   → strict JSON. Validate JSON before rendering. AI only produces an
   `OperationPlan`; it never executes. Unsupported commands produce a helpful
   message.
7. **Pinned actions.** Pin useful command prompts, stored locally in
   `~/.upstash-tui/actions.json`. Pinned actions run through the same
   AI → preview → confirmation flow. Keep it simple.

## Testing

- Logic modules (`operations/validate`, `generators/env`, `ai/planner` JSON
  parsing, `pins/store`) get `bun test` unit tests as they land.
- TUI components are validated visually (run the app / screenshots). No snapshot
  tests for M1.

## Key principles (carried through every milestone)

- Preview before mutations, always.
- Paid and destructive actions feel safe and intentional.
- AI never executes directly.
- Redis only. Keep the code simple. Avoid overengineering.
