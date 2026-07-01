# Redis Dashboard — Charts & Plan Nudges — Design

Adds terminal-native data-viz and contextual plan upsells to the Redis
dashboard, drawn from the real Upstash web console. Everything maps onto fields
returned by the `get_database_stats` developer API, so mock data introduced here
is replaced by the live API later with no UI changes.

## Goals

- Show per-database traffic at a glance (sparklines) and usage-vs-limit
  (progress bars), matching the web console's look.
- Surface Prod Pack and Enterprise upsells at suitable, contextual places.
- Keep every visual as a small, pure, independently testable component built
  from Unicode block characters — no new dependencies.
- Shape all new data to the `get_database_stats` response so the live-API branch
  drops in cleanly.

## Non-goals

- Full multi-series charts (Top Commands, Throughput read/write/total bands,
  Daily-by-Region stacked bars). Deferred; the data model leaves room for them.
- Charting in `SummaryCard` — its aggregates are mostly "Unlimited" so a bar is
  not meaningful there.
- Wiring the real API (done in parallel on another branch).

## Rendering approach

Unicode block characters rendered as plain `<text>`:

- **Sparklines:** `▁▂▃▄▅▆▇█` — normalize a numeric series across its min..max and
  map each point to one of 8 block heights.
- **Bars:** `▓` (filled) / `░` (empty) for usage progress.

Chosen over OpenTUI's `frame-buffer` (pixel rendering — more complex, higher
fidelity than needed) and third-party TUI chart libs (dependency risk, poor fit
with the JSX model). Block-character rendering is the terminal-native idiom,
trivially unit-testable as pure string functions, and clean at small sizes.

## Builds on existing API scaffolding

The parallel API branch already added `src/api/upstash.ts` with `RawRedisDatabase`,
`mapDatabase(raw)`, and list/get/create/rename/eviction/budget/delete calls. This
feature aligns to that layer rather than inventing a separate shape:

- `types.ts` already carries `eviction`; operations already include `redis.delete`.
- There is **no** stats endpoint yet. This feature defines the shared stats type;
  the actual `getDatabaseStats` fetcher is the parallel branch's integration point.

## Data model changes

`src/types.ts` — add a shared stats type and extend `RedisDatabase`:

```ts
export type MetricPoint = { x: number; y: number }   // get_database_stats point shape
export type RedisStats = { throughput: MetricPoint[] }  // room for latency/hits/etc later

// on RedisDatabase:
prodPack: boolean            // Prod Pack activated (from get_database raw payload)
stats?: RedisStats           // optional: mock now, getDatabaseStats() later
```

- `MetricPoint` uses `{ x, y }` because that is the actual shape the Upstash stats
  API returns for time-series arrays. The sparkline reads `y`.
- `stats` is **optional** so the list can render synchronously; components treat
  `stats === undefined` as "no data" (blank spark). The live dashboard populates
  it via the parallel `getDatabaseStats` fetcher.
- Usage bars need **no** new fields — they reuse the existing
  `commands` / `storage` / `cost` `{ used, limit }` pairs.

`src/api/upstash.ts` — `mapDatabase` sets `prodPack` from the raw payload
(default `false`) so the type stays satisfied. One-line addition; `stats` is left
`undefined` there (fetched separately).

`src/mock.ts` — add `prodPack` and a short `stats.throughput` series (~14 points)
to each mock database. Give them distinct shapes (spiky, ramping, flat) so the
sparklines visibly differ. Set `prodPack: true` on at least one DB and `false` on
others, mirroring the console screenshots.

## New components (all pure / presentational)

All live in `src/tui/components/` and take only props (no data imports), so each
is testable in isolation.

### `Sparkline`
- Props: `values: number[]`, `color: string`, `width?: number`.
- Normalizes `values` across `min..max`; maps each to a block char. Flat series
  (min === max) renders a mid-height baseline. Empty / missing series (`stats`
  undefined → `values: []`) renders blanks.
- If `values.length > width`, sample/bucket down to `width` points.
- Renders a single `<text fg={color}>`.

### `UsageBar`
- Props: `label: string`, `used: number | null`, `limit: number | null`,
  `format: (used, limit) => string`, `width?: number`.
- Renders: `label` (padded) · formatted `used / limit` · `▓▓▓▓▓░░░` bar.
- Fill ratio = `used / limit`, clamped 0..1. Color ramp:
  - `< 0.75` → `theme.accent`
  - `0.75..0.90` → `theme.warn`
  - `> 0.90` → `theme.danger`
- `limit === null` → render "Unlimited", no bar (dim placeholder).
- `used === null` → render "—", no bar.

### `ProdPackBadge`
- Props: `active: boolean`.
- `active` → `✓ Prod Pack` in purple (`productColors.workflow`, `#8B5CF6`),
  matching the console's Prod Pack color.
- `!active` → dim `⚡ Enable Prod Pack` nudge.

### `EnterpriseNudge`
- No conditional props — shown on **every** database (per product decision).
- Amber (`theme.warn`) single line:
  `◆ Enterprise · dedicated · HIPAA · SSO → Request`.

## Wiring

### `ResourceList`
- Append a right-aligned `Sparkline` after each DB name in the row.
- List width is `layout.listWidth` (34). Name column truncates to leave ~8 chars
  for the spark. Sparkline color: `theme.accent` (emerald — reads as healthy
  traffic, matches the console's green lines).

### `DetailsPanel`
- Replace the three plain `Row`s with three `UsageBar`s:
  - Commands → `formatCount`
  - Storage → `formatStorage`
  - Cost → `formatBudget`
- Below the bars: a wider throughput `Sparkline` (emerald), then a row holding
  `ProdPackBadge` and `EnterpriseNudge`.

### `SummaryCard`
- Unchanged. (Deliberate: aggregate limits are mostly "Unlimited".)

## Color decisions

1. Sparklines: `theme.accent` emerald (healthy-traffic read; matches console),
   not the Redis product red.
2. Prod Pack: `productColors.workflow` purple. Enterprise: `theme.warn` amber.
   Usage bars: semantic ramp (`accent`/`warn`/`danger`) above.

## Testing

Pure helpers get unit tests (block-char output for known inputs):

- Sparkline normalization: known series → expected block string; flat series;
  empty series; downsampling when `values.length > width`.
- UsageBar: fill ratio → filled/empty counts; color thresholds at 0.74 / 0.75 /
  0.90 / 0.91 boundaries; `null` limit and `null` used cases.

Components render via existing OpenTUI React patterns; no snapshot infra added.

## Files touched

- `src/types.ts` — add `MetricPoint` / `RedisStats`; extend `RedisDatabase` with
  `prodPack` + optional `stats`.
- `src/api/upstash.ts` — `mapDatabase` sets `prodPack` (default `false`).
- `src/mock.ts` — add `prodPack` + `stats.throughput` per DB.
- `src/tui/components/Sparkline.tsx` — new.
- `src/tui/components/UsageBar.tsx` — new.
- `src/tui/components/ProdPackBadge.tsx` — new.
- `src/tui/components/EnterpriseNudge.tsx` — new.
- `src/tui/components/ResourceList.tsx` — add sparkline column.
- `src/tui/components/DetailsPanel.tsx` — bars + throughput spark + nudges.
- Test files for the pure block-char helpers.
