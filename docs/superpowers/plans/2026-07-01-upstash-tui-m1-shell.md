# upstash-tui Milestone 1 — Static Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the beautiful static Upstash Redis dashboard shell in OpenTUI with mock data and live list selection.

**Architecture:** React + OpenTUI (`@opentui/react`). Pure presentational components in `src/tui/`, shared types in `src/types.ts`, visual tokens in `src/theme.ts`, pure formatting helpers in `src/format.ts`, mock data in `src/mock.ts`. The `RedisDashboard` view holds selection state and a keyboard handler; everything else is stateless and driven by props.

**Tech Stack:** Bun, TypeScript, React 19, `@opentui/react` + `@opentui/core`.

## Global Constraints

- Runtime: **Bun**. Entry point: `index.tsx`.
- UI: **OpenTUI React bindings** (`@opentui/react`), `.tsx` files, JSX intrinsics (`<box>`, `<text>`, `<input>`).
- Emerald accent color is exactly `#00E9A3`.
- Redis only. No QStash/Workflow/Vector/Box implementation — placeholder tabs only.
- No hardcoded secrets. (M1 uses no credentials at all.)
- `tsconfig.json` has `verbatimModuleSyntax: true` → import types with `import type { ... }`.
- `tsconfig.json` has `allowImportingTsExtensions: true` → local imports MUST include the file extension (e.g. `import { theme } from "../theme.ts"`).
- Typecheck command for verification: `bun run typecheck` (added in Task 1).

---

### Task 1: Formatting helpers (TDD)

Pure functions for rendering numbers, bytes, and cost/limit lines. These are the only genuinely testable units in M1, so they get real red-green tests.

**Files:**
- Create: `src/format.ts`
- Test: `src/format.test.ts`
- Modify: `package.json` (add `typecheck` script + typescript dev dep)

**Interfaces:**
- Produces:
  - `formatCompactNumber(n: number): string` — `12_400_000 → "12M"`, `999 → "999"`
  - `formatBytes(bytes: number): string` — `8589934592 → "8 GB"`
  - `formatCost(dollars: number): string` — `41.2 → "$41.20"`
  - `formatCount(used: number, limit: number | null): string` — `(2_000_000, null) → "2M / Unlimited"`
  - `formatStorage(usedBytes: number, limitBytes: number | null): string` — `→ "3 GB / 100 GB"`
  - `formatBudget(current: number, budget: number | null): string` — `→ "$4.14 / $5000.00"`, budget `null → "$4.14 / No budget"`

- [ ] **Step 1: Add typescript dev dependency and typecheck script**

Run:
```bash
bun add -d typescript
```

Then edit `package.json` `scripts` to add:
```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Write the failing test**

Create `src/format.test.ts`:
```ts
import { expect, test } from "bun:test"
import {
  formatCompactNumber,
  formatBytes,
  formatCost,
  formatCount,
  formatStorage,
  formatBudget,
} from "./format.ts"

test("formatCompactNumber", () => {
  expect(formatCompactNumber(999)).toBe("999")
  expect(formatCompactNumber(2_000_000)).toBe("2M")
  expect(formatCompactNumber(12_400_000)).toBe("12M")
  expect(formatCompactNumber(45_000_000)).toBe("45M")
  expect(formatCompactNumber(1_500)).toBe("1.5K")
  expect(formatCompactNumber(3_200_000_000)).toBe("3.2B")
})

test("formatBytes", () => {
  expect(formatBytes(512)).toBe("512 B")
  expect(formatBytes(3 * 1024 ** 3)).toBe("3 GB")
  expect(formatBytes(100 * 1024 ** 3)).toBe("100 GB")
})

test("formatCost", () => {
  expect(formatCost(41.2)).toBe("$41.20")
  expect(formatCost(4.14)).toBe("$4.14")
})

test("formatCount", () => {
  expect(formatCount(2_000_000, null)).toBe("2M / Unlimited")
  expect(formatCount(2_000_000, 10_000_000)).toBe("2M / 10M")
})

test("formatStorage", () => {
  expect(formatStorage(3 * 1024 ** 3, 100 * 1024 ** 3)).toBe("3 GB / 100 GB")
  expect(formatStorage(3 * 1024 ** 3, null)).toBe("3 GB / Unlimited")
})

test("formatBudget", () => {
  expect(formatBudget(4.14, 5000)).toBe("$4.14 / $5000.00")
  expect(formatBudget(4.14, null)).toBe("$4.14 / No budget")
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test src/format.test.ts`
Expected: FAIL — cannot resolve `./format.ts` / functions not defined.

- [ ] **Step 4: Write minimal implementation**

Create `src/format.ts`:
```ts
export function formatCompactNumber(n: number): string {
  const units = [
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ]
  for (const u of units) {
    if (n >= u.v) {
      const val = n / u.v
      const rounded = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10
      return `${rounded}${u.s}`
    }
  }
  return String(n)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let val = bytes / 1024
  let i = 0
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  const rounded = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10
  return `${rounded} ${units[i]}`
}

export function formatCost(dollars: number): string {
  return `$${dollars.toFixed(2)}`
}

export function formatCount(used: number, limit: number | null): string {
  const right = limit === null ? "Unlimited" : formatCompactNumber(limit)
  return `${formatCompactNumber(used)} / ${right}`
}

export function formatStorage(usedBytes: number, limitBytes: number | null): string {
  const right = limitBytes === null ? "Unlimited" : formatBytes(limitBytes)
  return `${formatBytes(usedBytes)} / ${right}`
}

export function formatBudget(current: number, budget: number | null): string {
  const right = budget === null ? "No budget" : formatCost(budget)
  return `${formatCost(current)} / ${right}`
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/format.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/format.ts src/format.test.ts package.json bun.lock
git commit -m "feat: add formatting helpers for numbers, bytes, and limits"
```

---

### Task 2: Types, theme tokens, and mock data

Shared contracts and the visual token set that every component reads from.

**Files:**
- Create: `src/types.ts`
- Create: `src/theme.ts`
- Create: `src/mock.ts`
- Test: `src/mock.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `Risk`, `RedisDatabase`, `OperationPlan`
  - `theme.ts`: `theme` object (`bg`, `bgPanel`, `accent`, `accentDim`, `border`, `borderSubtle`, `textBright`, `textDim`, `textFaint`, `danger`, `warn`) and `layout` object (`listWidth`, `gap`, `pad`)
  - `mock.ts`: `databases: RedisDatabase[]`, `redisSummary: { commands: number; storageBytes: number; cost: number }`

- [ ] **Step 1: Create the shared types**

Create `src/types.ts`:
```ts
export type Risk = "safe" | "paid" | "destructive"

export type RedisDatabase = {
  id: string
  name: string
  plan: string
  provider: string
  region: string
  pinned: boolean
  commands: { used: number; limit: number | null }
  storage: { usedBytes: number; limitBytes: number | null }
  cost: { current: number; budget: number | null }
}

export type OperationPlan = {
  title: string
  summary: string
  risk: Risk
  requiresConfirmation: boolean
  operations: Array<
    | { type: "redis.create"; name: string; region?: string; plan?: string }
    | { type: "redis.rename"; databaseId: string; newName: string }
    | { type: "redis.toggleEviction"; databaseId: string; enabled: boolean }
    | { type: "redis.updateBudget"; databaseId: string; budget: number }
    | { type: "redis.generateEnv"; databaseId: string }
  >
  generatedFiles?: Array<{ path: string; content: string }>
}
```

- [ ] **Step 2: Create the theme tokens**

Create `src/theme.ts`:
```ts
export const theme = {
  bg: "#0A0A0A",
  bgPanel: "#111111",
  accent: "#00E9A3",
  accentDim: "#0C3B2E",
  border: "#2A2A2A",
  borderSubtle: "#1E1E1E",
  textBright: "#F4F4F5",
  textDim: "#8A8A8A",
  textFaint: "#5A5A5A",
  danger: "#F87171",
  warn: "#FBBF24",
} as const

export const layout = {
  listWidth: 34,
  gap: 1,
  pad: 1,
} as const
```

- [ ] **Step 3: Write the failing mock-data test**

Create `src/mock.test.ts`:
```ts
import { expect, test } from "bun:test"
import { databases, redisSummary } from "./mock.ts"

test("databases have unique ids and required fields", () => {
  expect(databases.length).toBeGreaterThanOrEqual(3)
  const ids = new Set(databases.map((d) => d.id))
  expect(ids.size).toBe(databases.length)
  for (const db of databases) {
    expect(db.name.length).toBeGreaterThan(0)
    expect(db.region.length).toBeGreaterThan(0)
  }
})

test("at least one database is pinned", () => {
  expect(databases.some((d) => d.pinned)).toBe(true)
})

test("redisSummary aggregates the databases", () => {
  const commands = databases.reduce((s, d) => s + d.commands.used, 0)
  const storage = databases.reduce((s, d) => s + d.storage.usedBytes, 0)
  const cost = databases.reduce((s, d) => s + d.cost.current, 0)
  expect(redisSummary.commands).toBe(commands)
  expect(redisSummary.storageBytes).toBe(storage)
  expect(redisSummary.cost).toBeCloseTo(cost, 5)
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun test src/mock.test.ts`
Expected: FAIL — cannot resolve `./mock.ts`.

- [ ] **Step 5: Create the mock data**

Create `src/mock.ts`:
```ts
import type { RedisDatabase } from "./types.ts"

const GB = 1024 ** 3

export const databases: RedisDatabase[] = [
  {
    id: "db_prod",
    name: "context7-prod",
    plan: "Pay as You Go",
    provider: "AWS",
    region: "us-east-1",
    pinned: true,
    commands: { used: 12_400_000, limit: null },
    storage: { usedBytes: 8 * GB, limitBytes: 100 * GB },
    cost: { current: 41.2, budget: 5000 },
  },
  {
    id: "db_ratelimit",
    name: "context7-prod-ratelimit",
    plan: "Pay as You Go",
    provider: "AWS",
    region: "us-east-1",
    pinned: true,
    commands: { used: 2_000_000, limit: null },
    storage: { usedBytes: 3 * GB, limitBytes: 100 * GB },
    cost: { current: 4.14, budget: 5000 },
  },
  {
    id: "db_sessions",
    name: "context7-mcp-sessions",
    plan: "Free",
    provider: "AWS",
    region: "eu-west-1",
    pinned: false,
    commands: { used: 480_000, limit: 10_000_000 },
    storage: { usedBytes: 0.4 * GB, limitBytes: 0.25 * GB },
    cost: { current: 0, budget: null },
  },
  {
    id: "db_analytics",
    name: "context7-analytics",
    plan: "Pay as You Go",
    provider: "GCP",
    region: "us-central1",
    pinned: false,
    commands: { used: 30_100_000, limit: null },
    storage: { usedBytes: 199 * GB, limitBytes: 1000 * GB },
    cost: { current: 160.21, budget: 500 },
  },
]

export const redisSummary = {
  commands: databases.reduce((s, d) => s + d.commands.used, 0),
  storageBytes: databases.reduce((s, d) => s + d.storage.usedBytes, 0),
  cost: databases.reduce((s, d) => s + d.cost.current, 0),
}
```

- [ ] **Step 6: Run test + typecheck to verify they pass**

Run: `bun test src/mock.test.ts && bun run typecheck`
Expected: PASS (3 tests) and no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/theme.ts src/mock.ts src/mock.test.ts
git commit -m "feat: add shared types, theme tokens, and mock redis data"
```

---

### Task 3: ProductNav component

Top navigation bar. Redis active (emerald), others faint; Box carries a `NEW` badge.

**Files:**
- Create: `src/tui/components/ProductNav.tsx`

**Interfaces:**
- Consumes: `theme` from `src/theme.ts`.
- Produces: `ProductNav()` — a zero-prop component.

- [ ] **Step 1: Write the component**

Create `src/tui/components/ProductNav.tsx`:
```tsx
import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"

const PRODUCTS = [
  { name: "Redis", active: true, badge: "" },
  { name: "QStash", active: false, badge: "" },
  { name: "Workflow", active: false, badge: "" },
  { name: "Vector", active: false, badge: "" },
  { name: "Box", active: false, badge: "NEW" },
]

export function ProductNav() {
  return (
    <box
      title="Upstash"
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        paddingLeft: 2,
        paddingRight: 2,
        flexDirection: "row",
        gap: 3,
      }}
    >
      {PRODUCTS.map((p) => (
        <text
          key={p.name}
          fg={p.active ? theme.accent : theme.textFaint}
          attributes={p.active ? TextAttributes.BOLD : 0}
        >
          {p.badge ? `${p.name} ${p.badge}` : p.name}
        </text>
      ))}
    </box>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui/components/ProductNav.tsx
git commit -m "feat: add ProductNav component"
```

---

### Task 4: SummaryCard component

Redis header card with subtitle and three summary metrics.

**Files:**
- Create: `src/tui/components/SummaryCard.tsx`

**Interfaces:**
- Consumes: `theme` from `src/theme.ts`; `formatCompactNumber`, `formatBytes`, `formatCost` from `src/format.ts`.
- Produces: `SummaryCard(props: { commands: number; storageBytes: number; cost: number })`.

- [ ] **Step 1: Write the component**

Create `src/tui/components/SummaryCard.tsx`:
```tsx
import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost } from "../../format.ts"

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <box style={{ flexDirection: "row", gap: 1 }}>
      <text fg={theme.textDim}>{label}</text>
      <text fg={theme.textBright} attributes={TextAttributes.BOLD}>
        {value}
      </text>
    </box>
  )
}

export function SummaryCard({
  commands,
  storageBytes,
  cost,
}: {
  commands: number
  storageBytes: number
  cost: number
}) {
  return (
    <box
      title="Redis · Low-latency serverless key-value store"
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        paddingLeft: 2,
        paddingRight: 2,
        flexDirection: "row",
        gap: 6,
      }}
    >
      <Metric label="Commands" value={formatCompactNumber(commands)} />
      <Metric label="Storage" value={formatBytes(storageBytes)} />
      <Metric label="Cost" value={formatCost(cost)} />
    </box>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui/components/SummaryCard.tsx
git commit -m "feat: add SummaryCard component"
```

---

### Task 5: ResourceList component

Left "Databases" card: an inert search field plus the selectable list with pinned `★` markers and a highlighted selected row.

**Files:**
- Create: `src/tui/components/ResourceList.tsx`

**Interfaces:**
- Consumes: `theme`, `layout` from `src/theme.ts`; `RedisDatabase` type from `src/types.ts`.
- Produces: `ResourceList(props: { databases: RedisDatabase[]; selectedId: string })`.

- [ ] **Step 1: Write the component**

Create `src/tui/components/ResourceList.tsx`:
```tsx
import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"
import type { RedisDatabase } from "../../types.ts"

export function ResourceList({
  databases,
  selectedId,
}: {
  databases: RedisDatabase[]
  selectedId: string
}) {
  return (
    <box
      title="Databases"
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        width: layout.listWidth,
        flexShrink: 0,
        flexDirection: "column",
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
      }}
    >
      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: theme.borderSubtle,
          height: 3,
          marginBottom: 1,
        }}
      >
        <input
          placeholder="Search..."
          focused={false}
          textColor={theme.textBright}
          backgroundColor={theme.bgPanel}
        />
      </box>

      <box style={{ flexDirection: "column" }}>
        {databases.map((db) => {
          const selected = db.id === selectedId
          return (
            <box
              key={db.id}
              style={{
                flexDirection: "row",
                backgroundColor: selected ? theme.accentDim : theme.bgPanel,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <text fg={db.pinned ? theme.accent : theme.textFaint}>
                {db.pinned ? "★ " : "  "}
              </text>
              <text
                fg={selected ? theme.textBright : theme.textDim}
                attributes={selected ? TextAttributes.BOLD : 0}
              >
                {db.name}
              </text>
            </box>
          )
        })}
      </box>
    </box>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui/components/ResourceList.tsx
git commit -m "feat: add ResourceList component with selection highlight"
```

---

### Task 6: DetailsPanel component

Right panel: selected database header (plan · provider · region) plus Commands / Storage / Cost rows with limits.

**Files:**
- Create: `src/tui/components/DetailsPanel.tsx`

**Interfaces:**
- Consumes: `theme` from `src/theme.ts`; `formatCount`, `formatStorage`, `formatBudget` from `src/format.ts`; `RedisDatabase` type.
- Produces: `DetailsPanel(props: { db: RedisDatabase })`.

- [ ] **Step 1: Write the component**

Create `src/tui/components/DetailsPanel.tsx`:
```tsx
import { theme } from "../../theme.ts"
import { formatBudget, formatCount, formatStorage } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <box style={{ flexDirection: "row" }}>
      <text fg={theme.textDim}>{label.padEnd(12)}</text>
      <text fg={theme.textBright}>{value}</text>
    </box>
  )
}

export function DetailsPanel({ db }: { db: RedisDatabase }) {
  return (
    <box
      title={db.name}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      <text fg={theme.textDim}>{`${db.plan} · ${db.provider} · ${db.region}`}</text>
      <box style={{ flexDirection: "column", marginTop: 1 }}>
        <Row label="Commands" value={formatCount(db.commands.used, db.commands.limit)} />
        <Row label="Storage" value={formatStorage(db.storage.usedBytes, db.storage.limitBytes)} />
        <Row label="Cost" value={formatBudget(db.cost.current, db.cost.budget)} />
      </box>
    </box>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui/components/DetailsPanel.tsx
git commit -m "feat: add DetailsPanel component"
```

---

### Task 7: CommandBar component

Bottom "Ask Upstash" bar. Emerald border, inert input in M1.

**Files:**
- Create: `src/tui/components/CommandBar.tsx`

**Interfaces:**
- Consumes: `theme` from `src/theme.ts`.
- Produces: `CommandBar()` — a zero-prop component.

- [ ] **Step 1: Write the component**

Create `src/tui/components/CommandBar.tsx`:
```tsx
import { theme } from "../../theme.ts"

export function CommandBar() {
  return (
    <box
      title="Ask Upstash"
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.accent,
        backgroundColor: theme.bgPanel,
        paddingLeft: 1,
        paddingRight: 1,
        height: 3,
      }}
    >
      <input
        placeholder="create a redis db for a nextjs rate limiter"
        focused={false}
        textColor={theme.textBright}
        backgroundColor={theme.bgPanel}
      />
    </box>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui/components/CommandBar.tsx
git commit -m "feat: add CommandBar component"
```

---

### Task 8: RedisDashboard view

Composes the components, holds `selectedIndex` state, and wires `↑/↓` and `j/k` navigation via `useKeyboard`.

**Files:**
- Create: `src/tui/views/RedisDashboard.tsx`

**Interfaces:**
- Consumes: `theme`, `layout`; `databases`, `redisSummary` from `src/mock.ts`; all five components from Tasks 3–7; `useKeyboard` from `@opentui/react`; `useState` from `react`.
- Produces: `RedisDashboard()` — a zero-prop component.

- [ ] **Step 1: Write the view**

Create `src/tui/views/RedisDashboard.tsx`:
```tsx
import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { theme } from "../../theme.ts"
import { databases, redisSummary } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { SummaryCard } from "../components/SummaryCard.tsx"
import { ResourceList } from "../components/ResourceList.tsx"
import { DetailsPanel } from "../components/DetailsPanel.tsx"
import { CommandBar } from "../components/CommandBar.tsx"

export function RedisDashboard() {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    if (key.name === "up" || key.name === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.name === "down" || key.name === "j") {
      setSelectedIndex((i) => Math.min(databases.length - 1, i + 1))
    }
  })

  const selected = databases[selectedIndex]!

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
        padding: 1,
        gap: 1,
      }}
    >
      <ProductNav />
      <SummaryCard
        commands={redisSummary.commands}
        storageBytes={redisSummary.storageBytes}
        cost={redisSummary.cost}
      />
      <box style={{ flexDirection: "row", gap: 1, flexGrow: 1 }}>
        <ResourceList databases={databases} selectedId={selected.id} />
        <DetailsPanel db={selected} />
      </box>
      <CommandBar />
    </box>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui/views/RedisDashboard.tsx
git commit -m "feat: add RedisDashboard view with keyboard selection"
```

---

### Task 9: App root + entry wiring + visual verification

Wire the dashboard into an `App` root and the renderer entry point, then run the app to verify it renders correctly.

**Files:**
- Create: `src/tui/App.tsx`
- Modify: `index.tsx` (replace scaffold placeholder)

**Interfaces:**
- Consumes: `RedisDashboard` from `src/tui/views/RedisDashboard.tsx`.
- Produces: `App()` — root component; updated `index.tsx` entry.

- [ ] **Step 1: Create the App root**

Create `src/tui/App.tsx`:
```tsx
import { RedisDashboard } from "./views/RedisDashboard.tsx"

export function App() {
  return <RedisDashboard />
}
```

- [ ] **Step 2: Rewrite the entry point**

Replace the entire contents of `index.tsx` with:
```tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./src/tui/App.tsx"

const renderer = await createCliRenderer({ exitOnCtrlC: true })
createRoot(renderer).render(<App />)
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 4: Run the app and verify visually**

Run: `bun run index.tsx`

Verify (use the `run` skill or run manually; Ctrl+C to exit):
- Top nav shows `Upstash` title, `Redis` in emerald/bold, other products faint, `Box NEW`.
- Summary card shows Commands / Storage / Cost totals.
- Left "Databases" card shows the search field and the 4 databases, with `★` on the two pinned ones; the first row is highlighted.
- Right panel shows `context7-prod` details (Pay as You Go · AWS · us-east-1) with Commands/Storage/Cost lines.
- Pressing `↓`/`j` and `↑`/`k` moves the highlight and updates the right panel.
- Bottom "Ask Upstash" bar has an emerald border and placeholder text.

- [ ] **Step 5: Commit**

```bash
git add src/tui/App.tsx index.tsx
git commit -m "feat: wire App root and render Redis dashboard shell"
```

---

## Self-Review Notes

- **Spec coverage:** ProductNav (Redis active, others disabled, Box NEW) ✓; SummaryCard ✓; ResourceList with search + pinned + selection ✓; DetailsPanel ✓; CommandBar (inert) ✓; live `↑/↓` `j/k` selection ✓; theme tokens ✓; mock data mirroring reference names ✓; types defined up front ✓; format helpers unit-tested ✓.
- **Deferred (correctly out of M1):** credentials/AuthView, API client, real actions, operation preview, OpenRouter, pins — all in later milestones per the spec.
- **Type consistency:** `RedisDatabase` shape is identical across `types.ts`, `mock.ts`, and every component prop; `redisSummary` field names (`commands`, `storageBytes`, `cost`) match `SummaryCard` props.
