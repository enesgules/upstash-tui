# Redis Charts & Plan Nudges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add terminal-native sparklines, usage bars, and contextual Prod Pack / Enterprise nudges to the Redis dashboard, built from Unicode block characters and shaped to the `get_database_stats` API.

**Architecture:** Pure block-character helpers live in `src/charts.ts` (unit-tested). Thin presentational components in `src/tui/components/` consume them and map semantic levels to theme colors. Data model extends `RedisDatabase` with `prodPack` and an optional `stats?: RedisStats`; mock data populates it now, the parallel `getDatabaseStats` fetcher populates it later.

**Tech Stack:** Bun, TypeScript, `bun:test`, OpenTUI React bindings (`@opentui/react` + `@opentui/core`).

## Global Constraints

- Runtime: **Bun**. Run tests with `bun test`, typecheck with `bun run typecheck` (`tsc --noEmit`).
- Test framework: `bun:test` — `import { expect, test } from "bun:test"`.
- All imports use explicit `.ts` / `.tsx` extensions (existing convention).
- Pure logic goes in `src/charts.ts` (no theme/JSX imports); components map results to `theme` tokens.
- Sparkline block ramp: `▁▂▃▄▅▆▇█` (8 levels). Usage bar chars: `▓` filled, `░` empty.
- Colors: usage ramp `theme.accent` (<0.75) → `theme.warn` ([0.75, 0.90]) → `theme.danger` (>0.90). Prod Pack purple = `productColors.workflow`. Enterprise amber = `theme.warn`. List/detail sparklines = `theme.accent`.
- Prod Pack nudge copy: `✓ Prod Pack` (active) / `⚡ Enable Prod Pack` (inactive). Enterprise copy: `◆ Enterprise · dedicated · HIPAA · SSO → Request`.

---

### Task 1: Chart primitives (pure)

**Files:**
- Create: `src/charts.ts`
- Test: `src/charts.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `sparkline(values: number[], width?: number): string` (default width 8)
  - `usageRatio(used: number | null, limit: number | null): number | null`
  - `usageBar(ratio: number, width?: number): string` (default width 8)
  - `type UsageLevel = "ok" | "warn" | "danger"`
  - `usageLevel(ratio: number): UsageLevel`

- [ ] **Step 1: Write the failing test**

Create `src/charts.test.ts`:

```ts
import { expect, test } from "bun:test"
import { sparkline, usageRatio, usageBar, usageLevel } from "./charts.ts"

test("sparkline maps an ascending series across the full block ramp", () => {
  expect(sparkline([0, 1, 2, 3, 4, 5, 6, 7], 8)).toBe("▁▂▃▄▅▆▇█")
})

test("sparkline renders a mid baseline for a flat series", () => {
  expect(sparkline([5, 5, 5], 3)).toBe("▄▄▄")
})

test("sparkline returns empty string for no data", () => {
  expect(sparkline([], 8)).toBe("")
})

test("sparkline downsamples to the requested width", () => {
  const values = Array.from({ length: 16 }, (_, i) => i)
  expect(sparkline(values, 8)).toHaveLength(8)
})

test("usageRatio clamps and handles nulls", () => {
  expect(usageRatio(50, 100)).toBe(0.5)
  expect(usageRatio(150, 100)).toBe(1)
  expect(usageRatio(null, 100)).toBeNull()
  expect(usageRatio(50, null)).toBeNull()
  expect(usageRatio(50, 0)).toBeNull()
})

test("usageBar renders filled and empty cells", () => {
  expect(usageBar(0.5, 10)).toBe("▓▓▓▓▓░░░░░")
  expect(usageBar(0, 4)).toBe("░░░░")
  expect(usageBar(1, 4)).toBe("▓▓▓▓")
})

test("usageLevel thresholds at 0.75 and 0.90", () => {
  expect(usageLevel(0.74)).toBe("ok")
  expect(usageLevel(0.75)).toBe("warn")
  expect(usageLevel(0.9)).toBe("warn")
  expect(usageLevel(0.91)).toBe("danger")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/charts.test.ts`
Expected: FAIL — `Cannot find module './charts.ts'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/charts.ts`:

```ts
const BLOCKS = "▁▂▃▄▅▆▇█"

function downsample(values: number[], width: number): number[] {
  if (values.length <= width) return values
  const out: number[] = []
  const size = values.length / width
  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * size)
    const end = Math.max(start + 1, Math.floor((i + 1) * size))
    const slice = values.slice(start, end)
    out.push(slice.reduce((s, v) => s + v, 0) / slice.length)
  }
  return out
}

export function sparkline(values: number[], width = 8): string {
  if (values.length === 0) return ""
  const pts = downsample(values, width)
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min
  return pts
    .map((v) => {
      if (range === 0) return BLOCKS[3]
      const idx = Math.round(((v - min) / range) * (BLOCKS.length - 1))
      return BLOCKS[idx]
    })
    .join("")
}

export function usageRatio(used: number | null, limit: number | null): number | null {
  if (used === null || limit === null || limit <= 0) return null
  return Math.max(0, Math.min(1, used / limit))
}

export function usageBar(ratio: number, width = 8): string {
  const clamped = Math.max(0, Math.min(1, ratio))
  const filled = Math.round(clamped * width)
  return "▓".repeat(filled) + "░".repeat(width - filled)
}

export type UsageLevel = "ok" | "warn" | "danger"

export function usageLevel(ratio: number): UsageLevel {
  if (ratio > 0.9) return "danger"
  if (ratio >= 0.75) return "warn"
  return "ok"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/charts.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/charts.ts src/charts.test.ts
git commit -m "feat: add pure block-char chart primitives"
```

---

### Task 2: Data model — RedisStats, prodPack, mock data

**Files:**
- Modify: `src/types.ts` (add types + fields)
- Modify: `src/api/upstash.ts:51-73` (`mapDatabase` sets `prodPack`)
- Modify: `src/mock.ts` (add `prodPack` + `stats` per database)
- Test: `src/mock.test.ts` (append an invariant test)

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces:
  - `type MetricPoint = { x: number; y: number }`
  - `type RedisStats = { throughput: MetricPoint[] }`
  - `RedisDatabase.prodPack: boolean`, `RedisDatabase.stats?: RedisStats`

- [ ] **Step 1: Write the failing test**

Append to `src/mock.test.ts`:

```ts
test("every database has a prodPack flag and non-empty throughput stats", () => {
  for (const db of databases) {
    expect(typeof db.prodPack).toBe("boolean")
    expect(db.stats?.throughput.length ?? 0).toBeGreaterThan(0)
    for (const point of db.stats!.throughput) {
      expect(typeof point.x).toBe("number")
      expect(typeof point.y).toBe("number")
    }
  }
})

test("at least one database has prodPack enabled and one disabled", () => {
  expect(databases.some((d) => d.prodPack)).toBe(true)
  expect(databases.some((d) => !d.prodPack)).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/mock.test.ts`
Expected: FAIL — `db.prodPack` is `undefined` (not `"boolean"`) and `db.stats` is `undefined`.

- [ ] **Step 3: Add the types**

In `src/types.ts`, add above `RedisDatabase`:

```ts
export type MetricPoint = { x: number; y: number }
export type RedisStats = { throughput: MetricPoint[] }
```

In the `RedisDatabase` type, add after `eviction: boolean`:

```ts
  prodPack: boolean
  stats?: RedisStats
```

- [ ] **Step 4: Map prodPack in the API layer**

In `src/api/upstash.ts`, inside `mapDatabase`'s returned object, add after `pinned: false,`:

```ts
    prodPack: Boolean(raw.prod_pack),
```

(`raw.prod_pack` is a best-guess raw key reachable via `RawRedisDatabase`'s index signature; defaults to `false`. The parallel API branch adjusts the key when the real payload is confirmed. `stats` is intentionally left `undefined` here — it is fetched separately.)

- [ ] **Step 5: Populate mock data**

In `src/mock.ts`, add `prodPack` and `stats` to each database object. Use these exact values (spiky / ramping / flat shapes so sparklines differ):

```ts
// context7-prod (after eviction: false,)
    prodPack: true,
    stats: { throughput: [40, 120, 90, 200, 160, 240, 180, 260, 210, 300, 250, 320].map((y, x) => ({ x, y })) },
```
```ts
// context7-prod-ratelimit
    prodPack: false,
    stats: { throughput: [10, 60, 20, 80, 30, 90, 40, 100, 50, 110, 45, 95].map((y, x) => ({ x, y })) },
```
```ts
// context7-mcp-sessions
    prodPack: false,
    stats: { throughput: [5, 6, 5, 7, 6, 6, 7, 6, 5, 6, 7, 6].map((y, x) => ({ x, y })) },
```
```ts
// context7-analytics
    prodPack: true,
    stats: { throughput: [80, 90, 140, 130, 200, 190, 260, 240, 300, 280, 340, 360].map((y, x) => ({ x, y })) },
```

- [ ] **Step 6: Run tests + typecheck to verify they pass**

Run: `bun test src/mock.test.ts && bun run typecheck`
Expected: PASS (mock tests green; `tsc --noEmit` reports no errors).

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/api/upstash.ts src/mock.ts src/mock.test.ts
git commit -m "feat: add prodPack flag and throughput stats to data model"
```

---

### Task 3: Sparkline component + ResourceList wiring

**Files:**
- Create: `src/tui/components/Sparkline.tsx`
- Modify: `src/tui/components/ResourceList.tsx:46-71` (add sparkline per row)

**Interfaces:**
- Consumes: `sparkline` (Task 1); `RedisDatabase.stats` (Task 2); `theme`.
- Produces: `Sparkline({ values, color?, width? })` component.

- [ ] **Step 1: Write the Sparkline component**

Create `src/tui/components/Sparkline.tsx`:

```tsx
import { theme } from "../../theme.ts"
import { sparkline } from "../../charts.ts"

export function Sparkline({
  values,
  color = theme.accent,
  width = 8,
}: {
  values: number[]
  color?: string
  width?: number
}) {
  return <text fg={color}>{sparkline(values, width)}</text>
}
```

- [ ] **Step 2: Wire it into ResourceList**

In `src/tui/components/ResourceList.tsx`, add the import after the existing imports:

```tsx
import { Sparkline } from "./Sparkline.tsx"
```

Replace the row `<box>` (currently lines 50-68, the `databases.map` body) with:

```tsx
            <box
              key={db.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: selected ? theme.accentDim : theme.bgPanel,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <box style={{ flexDirection: "row", flexShrink: 1 }}>
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
              <Sparkline values={db.stats?.throughput.map((p) => p.y) ?? []} width={7} />
            </box>
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no `tsc` errors.

- [ ] **Step 4: Visual smoke check**

Run: `bun index.tsx` (Ctrl+C to exit). Navigate to the Redis dashboard.
Expected: each database row shows a small block-char sparkline on the right; the flat `context7-mcp-sessions` row shows a nearly level line, `context7-prod` a rising one.

- [ ] **Step 5: Commit**

```bash
git add src/tui/components/Sparkline.tsx src/tui/components/ResourceList.tsx
git commit -m "feat: show per-database throughput sparklines in the list"
```

---

### Task 4: UsageBar component + DetailsPanel bars

**Files:**
- Create: `src/tui/components/UsageBar.tsx`
- Modify: `src/tui/components/DetailsPanel.tsx` (replace the three `Row`s with `UsageBar`s)

**Interfaces:**
- Consumes: `usageRatio`, `usageBar`, `usageLevel` (Task 1); `formatCount`/`formatStorage`/`formatBudget` (existing `src/format.ts`); `theme`.
- Produces: `UsageBar({ label, used, limit, format, width? })` component.

- [ ] **Step 1: Write the UsageBar component**

Create `src/tui/components/UsageBar.tsx`:

```tsx
import { theme } from "../../theme.ts"
import { usageRatio, usageBar, usageLevel, type UsageLevel } from "../../charts.ts"

const LEVEL_COLOR: Record<UsageLevel, string> = {
  ok: theme.accent,
  warn: theme.warn,
  danger: theme.danger,
}

export function UsageBar({
  label,
  used,
  limit,
  format,
  width = 10,
}: {
  label: string
  used: number | null
  limit: number | null
  format: (used: number | null, limit: number | null) => string
  width?: number
}) {
  const ratio = usageRatio(used, limit)
  return (
    <box style={{ flexDirection: "row", gap: 1 }}>
      <text fg={theme.textDim}>{label.padEnd(9)}</text>
      <text fg={theme.textBright}>{format(used, limit).padEnd(18)}</text>
      {ratio === null ? (
        <text fg={theme.textFaint}>{"░".repeat(width)}</text>
      ) : (
        <text fg={LEVEL_COLOR[usageLevel(ratio)]}>{usageBar(ratio, width)}</text>
      )}
    </box>
  )
}
```

- [ ] **Step 2: Replace the rows in DetailsPanel**

In `src/tui/components/DetailsPanel.tsx`: delete the `Row` helper function (lines 5-12) and its uses. Replace the whole file body with:

```tsx
import { theme } from "../../theme.ts"
import { formatBudget, formatCount, formatStorage } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"
import { UsageBar } from "./UsageBar.tsx"

export function DetailsPanel({ db }: { db: RedisDatabase }) {
  return (
    <box
      title={db.name}
      titleColor={theme.accent}
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
        <UsageBar label="Commands" used={db.commands.used} limit={db.commands.limit} format={formatCount} />
        <UsageBar label="Storage" used={db.storage.usedBytes} limit={db.storage.limitBytes} format={formatStorage} />
        <UsageBar label="Cost" used={db.cost.current} limit={db.cost.budget} format={formatBudget} />
      </box>
    </box>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no `tsc` errors.

- [ ] **Step 4: Visual smoke check**

Run: `bun index.tsx` (Ctrl+C to exit).
Expected: the details panel shows Commands/Storage/Cost each with a `▓░` bar. `context7-mcp-sessions` storage (0.4 GB / 0.25 GB → over limit) shows a full `danger`-colored bar; `Unlimited` commands rows show a dim empty bar.

- [ ] **Step 5: Commit**

```bash
git add src/tui/components/UsageBar.tsx src/tui/components/DetailsPanel.tsx
git commit -m "feat: show usage-vs-limit bars in the details panel"
```

---

### Task 5: Prod Pack / Enterprise nudges + details throughput spark

**Files:**
- Create: `src/tui/components/ProdPackBadge.tsx`
- Create: `src/tui/components/EnterpriseNudge.tsx`
- Modify: `src/tui/components/DetailsPanel.tsx` (add throughput spark + nudge row)

**Interfaces:**
- Consumes: `theme`, `productColors`; `Sparkline` (Task 3); `RedisDatabase.prodPack` / `.stats` (Task 2).
- Produces: `ProdPackBadge({ active })`, `EnterpriseNudge()` components.

- [ ] **Step 1: Write ProdPackBadge**

Create `src/tui/components/ProdPackBadge.tsx`:

```tsx
import { theme, productColors } from "../../theme.ts"

export function ProdPackBadge({ active }: { active: boolean }) {
  return active ? (
    <text fg={productColors.workflow}>✓ Prod Pack</text>
  ) : (
    <text fg={theme.textFaint}>⚡ Enable Prod Pack</text>
  )
}
```

- [ ] **Step 2: Write EnterpriseNudge**

Create `src/tui/components/EnterpriseNudge.tsx`:

```tsx
import { theme } from "../../theme.ts"

export function EnterpriseNudge() {
  return <text fg={theme.warn}>◆ Enterprise · dedicated · HIPAA · SSO → Request</text>
}
```

- [ ] **Step 3: Wire spark + nudges into DetailsPanel**

In `src/tui/components/DetailsPanel.tsx`, add imports after the existing ones:

```tsx
import { Sparkline } from "./Sparkline.tsx"
import { ProdPackBadge } from "./ProdPackBadge.tsx"
import { EnterpriseNudge } from "./EnterpriseNudge.tsx"
```

Add, immediately after the closing `</box>` of the usage-bars column and before the panel's closing `</box>`:

```tsx
      <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
        <text fg={theme.textDim}>Throughput</text>
        <Sparkline values={db.stats?.throughput.map((p) => p.y) ?? []} width={24} />
      </box>
      <box style={{ flexDirection: "row", gap: 3, marginTop: 1 }}>
        <ProdPackBadge active={db.prodPack} />
        <EnterpriseNudge />
      </box>
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS — no `tsc` errors.

- [ ] **Step 5: Visual smoke check**

Run: `bun index.tsx` (Ctrl+C to exit).
Expected: the details panel now shows a wide throughput sparkline, a purple `✓ Prod Pack` (for `context7-prod` / `context7-analytics`) or dim `⚡ Enable Prod Pack` (for the others), and an amber `◆ Enterprise …` line on every database.

- [ ] **Step 6: Full test + typecheck sweep**

Run: `bun test && bun run typecheck`
Expected: all tests PASS; no `tsc` errors.

- [ ] **Step 7: Commit**

```bash
git add src/tui/components/ProdPackBadge.tsx src/tui/components/EnterpriseNudge.tsx src/tui/components/DetailsPanel.tsx
git commit -m "feat: add Prod Pack and Enterprise nudges with details throughput spark"
```
