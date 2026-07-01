# upstash-tui
---
layout: cover
subtitle: Your Upstash resources, without leaving the terminal
author: Upstash
date: 2026
---

A terminal-native console — powered by Bun + OpenTUI.

# The Problem
---
layout: statement
---

Developers live in the terminal.

The web console is a context switch — new tab, click through menus, lose your flow.

# Meet upstash-tui
---
layout: section
subtitle: A full TUI for managing Upstash — built on Bun + OpenTUI React
---

Your databases, usage, and actions. All keyboard-driven, all in the terminal.

# The Dashboard
---
layout: two-cols
subtitle: Everything keyboard-driven
---

Resource list

- databases at a glance
- per-DB sparklines &nbsp; ▁▂▃▄▅▆▇█
- live traffic shape

::right::

Details panel

- usage-vs-limit bars
- commands · storage · cost
- select and act — no mouse

# Cost & Limit Awareness
---
layout: default
subtitle: Notice limits before billing does
---

Usage bars ramp with pressure: &nbsp; ▓▓▓▓▓▓▓░░ &nbsp; green → amber → red

- budgets tracked per database
- contextual Prod Pack / Enterprise nudges

:::tip Stay ahead
See you're near a limit without ever opening the billing page.
:::

# Env Generation
---
layout: code
subtitle: Bridge the console to your codebase
---

```ini [.env] lines title="Generated for you"
# Upstash Redis — my-cache
UPSTASH_REDIS_REST_URL=https://apn1-lively-cat-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX…redacted
REDIS_URL=rediss://default:••••@apn1-lively-cat-12345.upstash.io:6379
```

One action turns a database into paste-ready credentials.

# The AI Command Bar
---
layout: section
subtitle: Type what you want. Confirm what runs.
---

The headline feature — and its whole point is what it *won't* do.

# From English to a Plan
---
layout: statement
---

"Rename this database to prod-cache and set a $50 budget."

→ becomes an operation plan you preview and confirm. Nothing runs unprompted.

# Safeguard 1 — Credential-Free
---
layout: default
subtitle: The model never touches your secrets
---

The LLM only emits a JSON plan. It never sees — and never needs — your credentials.

:::tip Credentials stay local
Auth happens on your machine, after you confirm. The planner works blind.
:::

# Safeguard 2 — Strict Allowlist
---
layout: code
subtitle: The model can't invent operations
---

```ts [src/operations/validate.ts] {1-8,11} lines title="Every plan is validated"
const OP_TYPES = [
  "redis.create",
  "redis.rename",
  "redis.toggleEviction",
  "redis.updateBudget",
  "redis.generateEnv",
  "redis.delete",
] as const

// LLM output is checked against this fixed list — nothing else runs
if (!OP_TYPES.includes(type)) fail(`unknown op type: ${type}`)
```

Anything outside this list is rejected before it can execute.

# Safeguard 3 — The AI Can't Delete
---
layout: default
subtitle: Destructive power stays in human hands
---

Deleting a database is a real operation — tagged `destructive`, "cannot be undone."
But the planner is explicitly forbidden from ever generating one.

| Risk | Example | Confirm |
| --- | --- | --- |
| safe | rename · set budget | yes |
| paid | create database | yes |
| destructive | delete database | yes — human-only |

:::warning The model can't reach the sharp edge
Delete happens only through a deliberate human action, never from a prompt.
:::

# The Flow, End to End
---
layout: center
subtitle: Preview and confirm before anything happens
---

```mermaid
flowchart LR
NL[Natural language] --> Planner[LLM planner]
Planner --> Plan[JSON plan]
Plan --> Validate[Allowlist validate]
Validate --> Preview[Preview + risk]
Preview --> Confirm[You confirm]
Confirm --> Execute[Execute]
```

# How It's Built
---
layout: two-cols
subtitle: Small, testable modules
---

Stack

- Bun runtime
- OpenTUI + React 19
- Developer API (Basic auth)
- OpenRouter for the planner

::right::

Modules

| dir | role |
| --- | --- |
| api/ | Upstash + provider clients |
| ai/ | natural language → plan |
| operations/ | validate · build · execute |
| generators/ | env snippets |
| tui/ | views + components |

# One More Thing
---
layout: quote
---

> Build the console the way developers already work.
