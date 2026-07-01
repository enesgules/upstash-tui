import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme, layout, productColors } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost, truncate } from "../../format.ts"
import type { QStashCreds } from "../../config.ts"
import type { OperationPlan } from "../../types.ts"
import type { QStashSchedule, QStashUrlGroup, QStashDlqMessage } from "../../api/qstash.ts"
import { listSchedules, listUrlGroups, listDlqMessages } from "../../api/qstash.ts"
import { mockSchedules, mockUrlGroups, mockDlq, mockQStashMetrics } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { MetricCards, type MetricItem } from "../components/MetricCards.tsx"
import { OperationPreview, type ConfirmSpec } from "../components/OperationPreview.tsx"
import { PublishForm } from "../components/PublishForm.tsx"
import { publishPlan, pauseSchedulePlan, resumeSchedulePlan, deleteSchedulePlan } from "../../operations/plans.ts"
import { executePlan } from "../../operations/execute.ts"

const ACCENT = productColors.qstash

function host(url: string): string {
  return url.replace(/^https?:\/\//, "")
}

function scheduleName(s: QStashSchedule): string {
  return s.destination.split("/").filter(Boolean).pop() ?? s.id
}

function confirmFor(plan: OperationPlan): ConfirmSpec {
  if (plan.risk === "paid") return { kind: "phrase", phrase: "confirm", label: 'Type "confirm" to proceed' }
  if (plan.risk === "destructive") {
    const op = plan.operations.find((o) => "name" in o) as { name: string } | undefined
    const name = op?.name ?? ""
    return { kind: "phrase", phrase: name, label: `Type "${name}" to confirm` }
  }
  return { kind: "yesno" }
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
  const mode = live ? "live" : "demo"
  const [schedules, setSchedules] = useState<QStashSchedule[]>(live ? [] : mockSchedules)
  const [groups, setGroups] = useState<QStashUrlGroup[]>(live ? [] : mockUrlGroups)
  const [dlq, setDlq] = useState<QStashDlqMessage[]>(live ? [] : mockDlq)
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState(0)

  const [search, setSearch] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  // Bumping this remounts the search input, which is how we clear its text.
  const [searchResetKey, setSearchResetKey] = useState(0)

  const [publishing, setPublishing] = useState(false)
  const [preview, setPreview] = useState<{ plan: OperationPlan; confirm: ConfirmSpec } | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewResult, setPreviewResult] = useState<string[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  async function load() {
    if (!creds) return
    setLoading(true)
    setError(null)
    try {
      const [s, g, d] = await Promise.all([listSchedules(creds), listUrlGroups(creds), listDlqMessages(creds)])
      setSchedules(s)
      setGroups(g)
      setDlq(d)
      setSelected((i) => Math.min(i, Math.max(0, s.length - 1)))
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

  const query = search.trim().toLowerCase()
  const visibleSchedules = query
    ? schedules.filter(
        (s) => scheduleName(s).toLowerCase().includes(query) || s.destination.toLowerCase().includes(query),
      )
    : schedules
  const current = visibleSchedules[selected]

  function onSearchInput(value: string) {
    setSearch(value)
    setSelected(0)
  }

  function onSearchSubmit() {
    // Keep the filter, hand keyboard focus back to the list for navigation.
    setSearchFocused(false)
  }

  function clearSearch() {
    setSearch("")
    setSelected(0)
    setSearchFocused(false)
    setSearchResetKey((k) => k + 1)
  }

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
      const res = await executePlan(preview.plan, { mode, creds: null, qstash: creds })
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
    if (hadResult && live) void load()
  }

  useKeyboard((key) => {
    if (preview || publishing) return
    if (searchFocused) {
      if (key.name === "escape") clearSearch()
      return // typing flows to the search input
    }
    if (key.name === "escape") {
      if (query) clearSearch()
      else onHome()
    } else if (key.name === "tab") onCycle(key.shift ? -1 : 1)
    else if (key.name === "s") setSearchFocused(true)
    else if (key.name === "r") void load()
    else if (key.name === "p") setPublishing(true)
    else if (key.name === "up" || key.name === "k") setSelected((i) => Math.max(0, i - 1))
    else if (key.name === "down" || key.name === "j") setSelected((i) => Math.min(visibleSchedules.length - 1, i + 1))
    else if (current && key.name === "space") {
      const name = scheduleName(current)
      openPreview(current.paused ? resumeSchedulePlan(current.id, name) : pauseSchedulePlan(current.id, name))
    } else if (current && key.name === "d") {
      openPreview(deleteSchedulePlan(current.id, scheduleName(current)))
    }
  })

  const m = mockQStashMetrics
  const metrics: MetricItem[] = live
    ? ["Messages", "Workflow Runs", "Bandwidth", "Cost"].map((label) => ({ label, value: "—" }))
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
        <text fg={ACCENT} attributes={TextAttributes.BOLD}>
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
          <box
            title={`Schedules · ${activeCount} active / ${pausedCount} paused`}
            titleColor={ACCENT}
            style={{
              border: true,
              borderStyle: "rounded",
              borderColor: theme.border,
              backgroundColor: theme.bgPanel,
              flexGrow: 1,
              flexBasis: 1,
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
                borderColor: searchFocused ? ACCENT : theme.borderSubtle,
                height: 3,
                marginBottom: 1,
              }}
            >
              <input
                key={searchResetKey}
                placeholder="Search…  (s)"
                focused={searchFocused}
                textColor={theme.textBright}
                backgroundColor={theme.bgPanel}
                onInput={onSearchInput}
                onSubmit={onSearchSubmit}
              />
            </box>

            {visibleSchedules.length === 0 ? (
              <text fg={theme.textFaint}>{query ? "No matches" : "None yet"}</text>
            ) : (
              visibleSchedules.map((s, i) => {
                const sel = i === selected
                return (
                  <box
                    key={s.id}
                    style={{
                      backgroundColor: sel ? theme.accentDim : theme.bgPanel,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    <text
                      fg={sel ? theme.textBright : theme.textDim}
                      attributes={sel ? TextAttributes.BOLD : 0}
                    >
                      {truncate(`${s.paused ? "⏸" : "▶"} ${s.cron}  ${scheduleName(s)}`, 30)}
                    </text>
                  </box>
                )
              })
            )}
          </box>

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
        ↑↓ select · s search · space pause/resume · d delete · p publish · tab switch product · r refresh · esc{" "}
        {query ? "clear" : "home"}
        {live ? "" : "  ·  demo — set QSTASH_TOKEN for live"}
      </text>

      {publishing ? (
        <PublishForm
          onCancel={() => setPublishing(false)}
          onSubmit={(destination, body) => {
            setPublishing(false)
            openPreview(publishPlan({ destination, body }))
          }}
        />
      ) : null}

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
            {truncate(line, 30)}
          </text>
        ))
      )}
    </box>
  )
}
