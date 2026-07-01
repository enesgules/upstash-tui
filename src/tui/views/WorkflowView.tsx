import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme, layout, productColors } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost } from "../../format.ts"
import type { QStashCreds } from "../../config.ts"
import type { WorkflowRun } from "../../api/workflow.ts"
import { listWorkflowRuns } from "../../api/workflow.ts"
import { mockWorkflowRuns, mockWorkflowMetrics } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { MetricCards, type MetricItem } from "../components/MetricCards.tsx"

const ACCENT = productColors.workflow

function host(url: string): string {
  return url.replace(/^https?:\/\//, "")
}

function stateColor(state: string): string {
  if (state.includes("FAIL")) return theme.danger
  if (state.includes("SUCCESS")) return theme.accent
  return theme.warn
}

export function WorkflowView({
  creds,
  onHome,
  onCycle,
}: {
  creds: QStashCreds | null
  onHome: () => void
  onCycle: (delta: number) => void
}) {
  const live = !!creds
  const [runs, setRuns] = useState<WorkflowRun[]>(live ? [] : mockWorkflowRuns)
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!creds) return
    setLoading(true)
    setError(null)
    try {
      setRuns(await listWorkflowRuns(creds))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workflow runs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useKeyboard((key) => {
    if (key.name === "escape") onHome()
    else if (key.name === "tab") onCycle(key.shift ? -1 : 1)
    else if (key.name === "r") void load()
  })

  const w = mockWorkflowMetrics
  const metrics: MetricItem[] = live
    ? [
        { label: "Workflow Messages", value: "—" },
        { label: "Workflow Runs", value: String(runs.length), color: ACCENT },
        { label: "Bandwidth", value: "—" },
        { label: "Cost", value: "—" },
      ]
    : [
        { label: "Workflow Messages", value: String(w.messages) },
        { label: "Workflow Runs", value: String(w.runs), color: ACCENT },
        { label: "Bandwidth", value: formatBytes(w.bandwidthBytes) },
        { label: "Cost", value: formatCost(w.cost), color: theme.warn },
      ]

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
      <ProductNav activeKey="workflow" />

      <box style={{ flexDirection: "row", gap: 1, paddingLeft: 1 }}>
        <text fg={ACCENT} attributes={TextAttributes.BOLD}>
          Workflow
        </text>
        <text fg={theme.textDim}>· Durable serverless functions</text>
      </box>

      <MetricCards metrics={metrics} />

      {error ? <text fg={theme.danger}>{error} — press r to retry.</text> : null}

      {loading ? (
        <text fg={theme.textDim}>Loading workflow runs…</text>
      ) : (
        <box
          title="Recent runs"
          titleColor={ACCENT}
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
          {runs.length === 0 ? (
            <text fg={theme.textFaint}>No workflow runs yet</text>
          ) : (
            runs.map((run) => (
              <box key={run.id} style={{ flexDirection: "row", gap: 2 }}>
                <text fg={stateColor(run.state)}>{run.state.padEnd(12)}</text>
                <text fg={theme.textDim}>{host(run.url)}</text>
              </box>
            ))
          )}
        </box>
      )}

      <text fg={theme.textFaint}>
        tab switch product · r refresh · esc home{live ? "" : "  ·  demo data — set QSTASH_TOKEN in .env for live"}
      </text>
    </box>
  )
}
