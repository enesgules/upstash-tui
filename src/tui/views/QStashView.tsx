import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme, layout, productColors } from "../../theme.ts"
import type { QStashCreds } from "../../config.ts"
import type { QStashSchedule, QStashUrlGroup, QStashDlqMessage } from "../../api/qstash.ts"
import { listSchedules, listUrlGroups, listDlqMessages } from "../../api/qstash.ts"
import { mockSchedules, mockUrlGroups, mockDlq } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"

const ACCENT = productColors.qstash

function host(url: string): string {
  return url.replace(/^https?:\/\//, "")
}

export function QStashView({ creds, onHome }: { creds: QStashCreds | null; onHome: () => void }) {
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
    else if (key.name === "r") void load()
  })

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

      <box
        title="QStash · Message queue & scheduler"
        titleColor={theme.title}
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
        <Metric label="Schedules" value={String(schedules.length)} />
        <Metric label="URL Groups" value={String(groups.length)} />
        <Metric label="DLQ" value={String(dlq.length)} />
      </box>

      {error ? <text fg={theme.danger}>{error} — press r to retry.</text> : null}

      {loading ? (
        <text fg={theme.textDim}>Loading QStash resources…</text>
      ) : (
        <box style={{ flexDirection: "row", gap: layout.gap, flexGrow: 1 }}>
          <ListCard
            title="Schedules"
            items={schedules.map((s) => `${s.paused ? "⏸" : "▶"} ${s.cron}  ${host(s.destination)}`)}
          />
          <ListCard
            title="URL Groups"
            items={groups.map((g) => `${g.name}  ·  ${g.endpointCount} endpoint${g.endpointCount === 1 ? "" : "s"}`)}
          />
          <ListCard
            title="Dead-letter queue"
            items={dlq.map((m) => `${m.responseStatus ?? "—"}  ${host(m.url)}`)}
          />
        </box>
      )}

      <text fg={theme.textFaint}>r refresh · esc home{live ? "" : "  ·  demo data — set QSTASH_TOKEN in .env for live"}</text>
    </box>
  )
}

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
