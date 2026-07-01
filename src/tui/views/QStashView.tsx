import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { theme, layout, productColors } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost } from "../../format.ts"
import type { QStashCreds } from "../../config.ts"
import type { QStashSchedule, QStashUrlGroup, QStashDlqMessage } from "../../api/qstash.ts"
import { listSchedules, listUrlGroups, listDlqMessages } from "../../api/qstash.ts"
import { mockSchedules, mockUrlGroups, mockDlq, mockQStashMetrics } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { MetricCards, type MetricItem } from "../components/MetricCards.tsx"

const ACCENT = productColors.qstash

function host(url: string): string {
  return url.replace(/^https?:\/\//, "")
}

export function QStashView({
  creds,
  onHome,
  onCycle,
}: {
  creds: QStashCreds | null
  onHome: () => void
  onCycle: (delta: number) => void
}) {
  const live = !!creds
  const [schedules, setSchedules] = useState<QStashSchedule[]>(live ? [] : mockSchedules)
  const [groups, setGroups] = useState<QStashUrlGroup[]>(live ? [] : mockUrlGroups)
  const [dlq, setDlq] = useState<QStashDlqMessage[]>(live ? [] : mockDlq)
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!creds) return
    setLoading(true)
    setError(null)
    try {
      const [s, g, d] = await Promise.all([
        listSchedules(creds),
        listUrlGroups(creds),
        listDlqMessages(creds),
      ])
      setSchedules(s)
      setGroups(g)
      setDlq(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load QStash resources")
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

  const m = mockQStashMetrics
  const metrics: MetricItem[] = live
    ? [
        { label: "Messages", value: "—" },
        { label: "Workflow Runs", value: "—" },
        { label: "Bandwidth", value: "—" },
        { label: "Cost", value: "—" },
      ]
    : [
        { label: "Messages", value: formatCompactNumber(m.messages), sub: `Today: ${m.messages} / Unlimited` },
        { label: "Workflow Runs", value: String(m.workflowRuns), sub: "Today: 0" },
        { label: "Bandwidth", value: formatBytes(m.bandwidthBytes), sub: `Today: ${formatBytes(m.bandwidthBytes)}` },
        { label: "Cost", value: formatCost(m.cost), sub: "Budget: not set" },
      ]

  const activeCount = schedules.filter((s) => !s.paused).length
  const pausedCount = schedules.length - activeCount

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
      <ProductNav activeKey="qstash" />

      <box style={{ flexDirection: "row", gap: 1, paddingLeft: 1 }}>
        <text fg={ACCENT} attributes={1}>
          QStash
        </text>
        <text fg={theme.textDim}>· Message queue & scheduler</text>
      </box>

      <MetricCards metrics={metrics} />

      {error ? <text fg={theme.danger}>{error} — press r to retry.</text> : null}

      {loading ? (
        <text fg={theme.textDim}>Loading QStash resources…</text>
      ) : (
        <box style={{ flexDirection: "row", gap: layout.gap, flexGrow: 1 }}>
          <ListCard
            title={`Schedules · ${activeCount} active / ${pausedCount} paused`}
            items={schedules.map((s) => `${s.paused ? "⏸" : "▶"} ${s.cron}  ${host(s.destination)}`)}
          />
          <ListCard
            title="URL Groups"
            items={groups.map((g) => `${g.name}  ·  ${g.endpointCount} endpoint${g.endpointCount === 1 ? "" : "s"}`)}
          />
          <ListCard
            title="Dead-letter queue"
            items={dlq.map((d) => `${d.responseStatus ?? "—"}  ${host(d.url)}`)}
          />
        </box>
      )}

      <text fg={theme.textFaint}>
        tab switch product · r refresh · esc home{live ? "" : "  ·  demo data — set QSTASH_TOKEN in .env for live"}
      </text>
    </box>
  )
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <box
      title={title}
      titleColor={ACCENT}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        flexGrow: 1,
        flexBasis: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      {items.length === 0 ? (
        <text fg={theme.textFaint}>None yet</text>
      ) : (
        items.map((line, i) => (
          <text key={i} fg={theme.textDim}>
            {line}
          </text>
        ))
      )}
    </box>
  )
}
