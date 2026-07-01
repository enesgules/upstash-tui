# upstash-tui Internal Demo Deck (talktui) — Design

A terminal-native slide deck, authored for [talktui](https://github.com/nexxeln/talktui),
that presents the `upstash-tui` project to the **Upstash team** as an internal
demo. It headlines the **AI command bar**, covers **product vision / UX**, and
touches **architecture + libraries** lightly. Structure follows a
Problem → Product → AI-spotlight arc, with a live demo expected after the deck.

## Goals

- Give the team a clear mental model of what `upstash-tui` is and why it exists.
- Make the **AI command bar** land as the standout: natural-language → a
  previewed, confirmed, credential-free *operation plan*, guarded by a strict
  allowlist and with no destructive operation available.
- Show the terminal-native UX (sparklines, usage bars, env-snippet generation)
  and cost/limit awareness.
- Keep architecture to a light touch (stack + module map + libraries).
- Be robust for a live presentation: no fragile dependencies.

## Non-goals

- The "how it was built with AI / SDD workflow" meta-story (deliberately cut).
- Deep architecture (per-module internals, testing strategy) beyond one slide.
- Teaching what Redis/QStash/Vector are — the audience knows Upstash products.
- Native terminal images (Kitty-protocol dependent; too fragile for live demo).
  Content uses code fences, tables, callouts, and one Mermaid diagram instead.

## Deliverables

- `presentation/upstash-tui.md` — the single deck file (theme-agnostic).
- `presentation/README.md` — one-paragraph "how to run + how to switch themes".
- Optionally a `present` script entry (see "How to run").

## How talktui works (constraints this design is built on)

- **Runtime: Bun.** talktui is a separate repo you clone once; you present any
  `.md` file with `bun run deck <path> [--theme <name>]`.
- **Slides** are separated by top-level `#` headings. The first slide may omit
  the heading and open directly with a frontmatter block.
- **Per-slide frontmatter** is a `---` YAML block placed *immediately after* the
  heading (note the ordering: `# Heading` then `---...---`). Fields used here:
  `layout`, `subtitle`, `title`, `author`, `date`, `hideHeader`, `hideFooter`.
- **Layouts:** `default, center, cover, section, statement, quote, fact,
  two-cols, code`.
- **Fragments:** `<!-- stop -->` reveals content blocks sequentially.
- **Two-column:** body is the left column; `::right::` starts the right column.
- **Callouts:** `:::note` / `:::tip` / `:::warning` / `:::danger` … `:::`.
- **Code fences** carry metadata on the fence line:
  ` ```ts [src/operations/validate.ts] {2,5-8} lines title="..." `.
- **Spacer:** `::space:2::`. **Tables:** standard Markdown pipe tables.
- **Mermaid:** ` ```mermaid ` flowcharts render as terminal diagrams.

### Theming (important)

The theme is a **runtime `--theme` flag**, not written into the deck file. One
deck file therefore supports all three requested themes; the presenter compares
them by re-running with a different flag:

```bash
bun run deck presentation/upstash-tui.md --theme tokyonight
bun run deck presentation/upstash-tui.md --theme ember
bun run deck presentation/upstash-tui.md --theme catppuccin
```

talktui has no green/emerald Upstash-brand theme; these three dark developer
themes are the shortlist. Final theme choice is deferred to the presenter.

## Slide outline (~14 slides)

| # | Slide | Layout | Content |
|---|-------|--------|---------|
| 1 | Title | `cover` | "upstash-tui — your Upstash resources, without leaving the terminal." `subtitle`, `author`, `date`. |
| 2 | The problem | `statement` | Developers live in the terminal; the web console is a context switch. `<!-- stop -->` reveal of the cost (tab-switching, clicking, losing flow). |
| 3 | Meet upstash-tui | `section` | One line: a full TUI for managing Upstash resources, built on Bun + OpenTUI React. |
| 4 | The dashboard | `two-cols` | Left col: resource list with per-DB **sparklines** (`▁▂▃▄▅▆▇█`). Right col (`::right::`): details panel with **usage-vs-limit bars**. Keyboard-driven. |
| 5 | Cost & limit awareness | `default` | Usage bars use a semantic color ramp (green → amber → red near the limit); budgets tracked; contextual Prod Pack / Enterprise nudges. `:::tip` callout: "notice you're near a limit without opening billing." |
| 6 | Env generation | `code` | `bash`/`ini` fence showing a generated `.env` snippet (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REDIS_URL`). Point: bridges console → codebase. |
| 7 | The AI Command Bar | `section` | Section divider — the spotlight begins. |
| 8 | What it does | `statement` | Type a request in plain English → the tool produces an **operation plan** you preview and confirm. Nothing runs unprompted. `<!-- stop -->` for the punchline. |
| 9 | Safeguard 1 — credential-free | `default` | The LLM never sees or needs credentials; it only emits a JSON plan. `:::tip Credentials never leave your machine`. |
| 10 | Safeguard 2 — strict allowlist | `code` | Real `OP_TYPES` snippet from `src/operations/validate.ts` with `lines` + `title`. Anything outside the fixed list is rejected — the model can't invent operations. |
| 11 | Safeguard 3 — the AI can't delete | `default` | Destructive ops *do* exist (deleting a database, `risk: "destructive"`, "cannot be undone"), but only through a deliberate human action — the AI planner is explicitly barred from generating one. Every op is tagged `safe` / `paid` / `destructive` and requires confirmation. `:::warning` on the destructive tag; small pipe table of the three risk levels. |
| 12 | End-to-end flow | `center` | `mermaid` flowchart: Natural language → LLM planner → JSON plan → allowlist validate → preview + risk → user confirms → execute. |
| 13 | Close | `quote` | Vision line, e.g. "Build the console the way developers already work." |

## Content sourcing (facts to pull from the codebase, verbatim where quoted)

- **Stack / libs:** `package.json` — `@opentui/core` & `@opentui/react` `^0.4.2`,
  `react` 19. Bun runtime (`bun run`, `bun.lock`).
- **Wired flow (slides 4-12):** the AI command bar, live/demo Redis dashboard,
  `OperationPreview` modal and `SetupView` are implemented and wired
  (`src/tui/App.tsx`, `src/tui/components/CommandBar.tsx`,
  `src/tui/components/OperationPreview.tsx`, `src/tui/views/SetupView.tsx`) — the
  demo shows real behavior, not scaffolding.
- **AI planner:** `src/ai/planner.ts` (system prompt, plan/error shapes) and
  `src/api/openrouter.ts` (OpenRouter, default model
  `anthropic/claude-3.5-sonnet`). "never sees or needs credentials" is stated in
  the planner's own system prompt.
- **Allowlist (slide 10 code):** `src/operations/validate.ts` — the `OP_TYPES`
  array: `redis.create`, `redis.rename`, `redis.toggleEviction`,
  `redis.updateBudget`, `redis.generateEnv`, `redis.delete`.
- **Delete nuance (slide 11):** `redis.delete` is a real operation
  (`src/operations/plans.ts` `deletePlan()`, `risk: "destructive"`, executed via
  `src/operations/execute.ts` `deleteDatabase`) — but `src/ai/planner.ts`
  explicitly forbids the LLM from generating it ("There is NO delete/destroy
  operation type available to you"). So delete is human-only; the AI can't.
- **Risk levels:** `src/types.ts` — `Risk = "safe" | "paid" | "destructive"`.
  Plan builders in `src/operations/plans.ts` set the tag per operation.
- **Env snippet (slide 6 code):** `src/generators/env.ts` — output lines
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REDIS_URL`.
- **Charts:** design in
  `docs/superpowers/specs/2026-07-01-redis-charts-and-plan-nudges-design.md`
  (sparklines, usage bars, Prod Pack / Enterprise nudges).
- **Developer API auth:** `src/api/http.ts` / `src/config.ts` — Basic auth from
  `UPSTASH_EMAIL` + `UPSTASH_API_KEY`.

All quoted code must be copied from the actual files (trimmed for slide width),
not paraphrased, so the demo stays honest.

## How to run (documented in presentation/README.md)

1. Clone talktui once: `git clone https://github.com/nexxeln/talktui && cd talktui && bun install`.
2. Present: `bun run deck /abs/path/to/upstash-tui/presentation/upstash-tui.md --theme tokyonight`.
3. Swap `--theme` between `tokyonight`, `ember`, `catppuccin` to compare and pick.

Navigation (talktui defaults): `n`/`space`/`→` next, `p`/`←` back, `f` first,
`l` last, `?` help, `q` quit.

## Testing / verification

talktui decks are plain Markdown; there is no unit-test surface. Verification is:

- **Syntax check:** every slide starts with `#` + a `---` frontmatter block
  (slide 1 excepted); `::right::` only inside `two-cols`; callout/`code`/`mermaid`
  fences balanced.
- **Fact check:** each quoted snippet matches its source file.
- **Live render:** run `bun run deck` against a talktui clone and page through all
  ~15 slides in each of the three themes; confirm no layout overflow at a typical
  terminal size and that the Mermaid slide renders.

## Open questions / deferred

- Real screenshots (native images) can be added later if a Kitty-capable
  terminal is available for the demo; out of scope now.
- Exact wording of the closing line (slide 15) — a placeholder is provided; the
  presenter may tweak.
