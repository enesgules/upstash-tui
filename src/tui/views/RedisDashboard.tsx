import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { theme, layout } from "../../theme.ts"
import { databases as mockDatabases } from "../../mock.ts"
import type { RedisDatabase, OperationPlan } from "../../types.ts"
import type { UpstashCreds, OpenRouterCreds } from "../../config.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { SummaryCard } from "../components/SummaryCard.tsx"
import { ResourceList } from "../components/ResourceList.tsx"
import { DetailsPanel } from "../components/DetailsPanel.tsx"
import { CommandBar } from "../components/CommandBar.tsx"
import { OperationPreview, type ConfirmSpec } from "../components/OperationPreview.tsx"
import { listDatabases } from "../../api/upstash.ts"
import { chatJSON } from "../../api/openrouter.ts"
import { planFromCommand } from "../../ai/planner.ts"
import { executePlan } from "../../operations/execute.ts"
import { toggleEvictionPlan, generateEnvPlan, deletePlan } from "../../operations/plans.ts"

type Mode = "live" | "demo"

const REGIONS = ["us-east-1", "us-west-1", "eu-west-1", "eu-central-1", "ap-northeast-1"]

function confirmFor(plan: OperationPlan): ConfirmSpec {
  if (plan.risk === "paid") {
    return { kind: "phrase", phrase: "confirm", label: 'Type "confirm" to proceed' }
  }
  if (plan.risk === "destructive") {
    const del = plan.operations.find((o) => o.type === "redis.delete")
    const name = del && "name" in del ? del.name : ""
    return { kind: "phrase", phrase: name, label: `Type "${name}" to confirm deletion` }
  }
  return { kind: "yesno" }
}

export function RedisDashboard({
  mode,
  creds,
  openrouter,
  onHome,
  onCycle,
}: {
  mode: Mode
  creds: UpstashCreds | null
  openrouter: OpenRouterCreds | null
  onHome: () => void
  onCycle: (delta: number) => void
}) {
  const [databases, setDatabases] = useState<RedisDatabase[]>(mode === "demo" ? mockDatabases : [])
  const [loading, setLoading] = useState(mode === "live")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const [preview, setPreview] = useState<{ plan: OperationPlan; confirm: ConfirmSpec } | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewResult, setPreviewResult] = useState<string[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [commandFocused, setCommandFocused] = useState(false)
  const [commandBusy, setCommandBusy] = useState(false)
  const [commandError, setCommandError] = useState<string | null>(null)

  async function loadLive() {
    if (mode !== "live" || !creds) return
    setLoading(true)
    setLoadError(null)
    try {
      const dbs = await listDatabases(creds)
      setDatabases(dbs)
      setSelectedIndex((i) => Math.min(i, Math.max(0, dbs.length - 1)))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load databases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected: RedisDatabase | undefined = databases[selectedIndex]

  function openPreview(plan: OperationPlan) {
    setPreviewResult(null)
    setPreviewError(null)
    setPreviewBusy(false)
    setPreview({ plan, confirm: confirmFor(plan) })
  }

  async function runPlan() {
    if (!preview) return
    setPreviewBusy(true)
    try {
      const res = await executePlan(preview.plan, { mode, creds })
      if (res.ok) setPreviewResult(res.messages)
      else setPreviewError(res.messages.join(" · "))
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Execution failed")
    } finally {
      setPreviewBusy(false)
    }
  }

  function closePreview() {
    const hadResult = previewResult !== null
    setPreview(null)
    setPreviewResult(null)
    setPreviewError(null)
    if (hadResult && mode === "live") void loadLive()
  }

  async function submitCommand(text: string) {
    const command = text.trim()
    if (!command || !openrouter) return
    setCommandBusy(true)
    setCommandError(null)
    try {
      const chat = (system: string, user: string) => chatJSON(openrouter, system, user)
      const context = {
        selectedDatabase: selected
          ? { id: selected.id, name: selected.name, region: selected.region }
          : null,
        regions: REGIONS,
      }
      const plan = await planFromCommand(command, context, chat)
      setCommandFocused(false)
      openPreview(plan)
    } catch (e) {
      setCommandError(e instanceof Error ? e.message : "Couldn't build a plan")
    } finally {
      setCommandBusy(false)
    }
  }

  useKeyboard((key) => {
    if (preview) return // the preview modal owns keyboard while open
    if (commandBusy) return
    if (commandFocused) {
      if (key.name === "escape") setCommandFocused(false)
      return // typing flows to the command input
    }

    if (key.name === "escape") {
      onHome()
    } else if (key.name === "tab") {
      onCycle(key.shift ? -1 : 1)
    } else if (key.name === "up" || key.name === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.name === "down" || key.name === "j") {
      setSelectedIndex((i) => Math.min(databases.length - 1, i + 1))
    } else if (key.name === "r") {
      void loadLive()
    } else if ((key.name === "slash" || key.sequence === "/" || key.name === "i") && openrouter) {
      setCommandError(null)
      setCommandFocused(true)
    } else if (selected && key.name === "e") {
      openPreview(toggleEvictionPlan(selected, !selected.eviction))
    } else if (selected && key.name === "g") {
      openPreview(generateEnvPlan(selected))
    } else if (selected && key.name === "d") {
      openPreview(deletePlan(selected))
    }
  })

  const summary =
    mode === "demo"
      ? {
          commands: databases.reduce((s, d) => s + (d.commands.used ?? 0), 0),
          storageBytes: databases.reduce((s, d) => s + (d.storage.usedBytes ?? 0), 0),
          cost: databases.reduce((s, d) => s + (d.cost.current ?? 0), 0),
        }
      : { commands: null, storageBytes: null, cost: null }

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
        padding: layout.pad,
        gap: layout.gap,
      }}
    >
      <ProductNav activeKey="redis" />
      <SummaryCard commands={summary.commands} storageBytes={summary.storageBytes} cost={summary.cost} />

      <box style={{ flexDirection: "row", gap: layout.gap, flexGrow: 1 }}>
        <ResourceList databases={databases} selectedId={selected?.id ?? ""} />
        <RightPanel loading={loading} loadError={loadError} selected={selected} />
      </box>

      <text fg={theme.textFaint}>
        ↑↓ select · tab switch product · e eviction · g env · d delete · r refresh{openrouter ? " · / ask AI" : ""} · esc home
      </text>

      <CommandBar
        focused={commandFocused}
        disabled={!openrouter}
        busy={commandBusy}
        error={commandError}
        onSubmit={submitCommand}
      />

      {preview ? (
        <OperationPreview
          plan={preview.plan}
          confirm={preview.confirm}
          busy={previewBusy}
          error={previewError}
          result={previewResult}
          onConfirm={runPlan}
          onCancel={closePreview}
        />
      ) : null}
    </box>
  )
}

function RightPanel({
  loading,
  loadError,
  selected,
}: {
  loading: boolean
  loadError: string | null
  selected: RedisDatabase | undefined
}) {
  if (loading) {
    return (
      <Panel>
        <text fg={theme.textDim}>Loading databases…</text>
      </Panel>
    )
  }
  if (loadError) {
    return (
      <Panel>
        <text fg={theme.danger}>{loadError}</text>
        <text fg={theme.textFaint}>Press r to retry.</text>
      </Panel>
    )
  }
  if (!selected) {
    return (
      <Panel>
        <text fg={theme.textDim}>No databases yet.</text>
        <text fg={theme.textFaint}>Use the AI command bar to create one.</text>
      </Panel>
    )
  }
  return <DetailsPanel db={selected} />
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <box
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
        gap: 1,
      }}
    >
      {children}
    </box>
  )
}
