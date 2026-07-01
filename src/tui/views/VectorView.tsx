import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme, layout, productColors } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost, truncate } from "../../format.ts"
import type { UpstashCreds } from "../../config.ts"
import type { VectorIndex, VectorMetrics } from "../../api/vector.ts"
import { listIndexes, getVectorMetrics } from "../../api/vector.ts"
import { mockIndexes, mockVectorMetrics } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { MetricCards, type MetricItem } from "../components/MetricCards.tsx"

const ACCENT = productColors.vector

export function VectorView({
  creds,
  onHome,
  onCycle,
}: {
  creds: UpstashCreds | null
  onHome: () => void
  onCycle: (delta: number) => void
}) {
  const live = !!creds
  const [indexes, setIndexes] = useState<VectorIndex[]>(live ? [] : mockIndexes)
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const [liveMetrics, setLiveMetrics] = useState<VectorMetrics | null>(null)

  const [search, setSearch] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  // Bumping this remounts the search input, which is how we clear its text.
  const [searchResetKey, setSearchResetKey] = useState(0)

  async function load() {
    if (!creds) return
    setLoading(true)
    setError(null)
    void getVectorMetrics(creds).then(setLiveMetrics).catch(() => {})
    try {
      const result = await listIndexes(creds)
      setIndexes(result)
      setSelectedIndex((i) => Math.min(i, Math.max(0, result.length - 1)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Vector indexes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const query = search.trim().toLowerCase()
  const visibleIndexes = query
    ? indexes.filter((idx) => idx.name.toLowerCase().includes(query))
    : indexes

  function onSearchInput(value: string) {
    setSearch(value)
    setSelectedIndex(0)
  }

  function onSearchSubmit() {
    // Keep the filter, hand keyboard focus back to the list for navigation.
    setSearchFocused(false)
  }

  function clearSearch() {
    setSearch("")
    setSelectedIndex(0)
    setSearchFocused(false)
    setSearchResetKey((k) => k + 1)
  }

  useKeyboard((key) => {
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
    else if (key.name === "up" || key.name === "k") setSelectedIndex((i) => Math.max(0, i - 1))
    else if (key.name === "down" || key.name === "j") setSelectedIndex((i) => Math.min(visibleIndexes.length - 1, i + 1))
  })

  const selected = visibleIndexes[selectedIndex]
  const v = mockVectorMetrics
  const lm = liveMetrics
  const num = (n: number | null | undefined, fmt: (x: number) => string) => (n == null ? "—" : fmt(n))
  const metrics: MetricItem[] = live
    ? [
        { label: "Count", value: num(lm?.count, formatCompactNumber), color: ACCENT },
        { label: "Requests", value: num(lm?.requests, formatCompactNumber), color: ACCENT },
        { label: "Bandwidth", value: num(lm?.bandwidthBytes, formatBytes), color: ACCENT },
        { label: "Reranks", value: num(lm?.reranks, String), color: ACCENT },
        { label: "Storage", value: num(lm?.storageBytes, formatBytes), color: ACCENT },
        { label: "Cost", value: num(lm?.cost, formatCost), color: theme.warn },
      ]
    : [
        { label: "Count", value: formatCompactNumber(v.count), color: ACCENT },
        { label: "Requests", value: formatCompactNumber(v.requests), color: ACCENT },
        { label: "Bandwidth", value: formatBytes(v.bandwidthBytes), color: ACCENT },
        { label: "Reranks", value: String(v.reranks) },
        { label: "Storage", value: formatBytes(v.storageBytes), color: ACCENT },
        { label: "Cost", value: formatCost(v.cost), color: theme.warn },
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
      <ProductNav activeKey="vector" />

      <box style={{ flexDirection: "row", gap: 1, paddingLeft: 1 }}>
        <text fg={ACCENT} attributes={TextAttributes.BOLD}>
          Vector
        </text>
        <text fg={theme.textDim}>· Serverless vector database for high-performance search</text>
      </box>

      <MetricCards metrics={metrics} />

      {error ? <text fg={theme.danger}>{error} — press r to retry.</text> : null}

      {loading ? (
        <text fg={theme.textDim}>Loading Vector indexes…</text>
      ) : (
        <box style={{ flexDirection: "row", gap: layout.gap, flexGrow: 1 }}>
          <box
            title="Indexes"
            titleColor={ACCENT}
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

            {query ? (
              <text fg={theme.textFaint}>
                {visibleIndexes.length} {visibleIndexes.length === 1 ? "match" : "matches"}
              </text>
            ) : null}

            {visibleIndexes.length === 0 ? (
              <text fg={theme.textFaint}>{query ? "No matches" : "No indexes yet"}</text>
            ) : (
              visibleIndexes.map((idx, i) => {
                const sel = i === selectedIndex
                const rowBg = sel ? theme.accentDim : theme.bgPanel
                // Single line per index: region/type/etc. live in the details
                // panel, so repeating them per row (identical across indexes) is
                // just noise. The selection bar glyph is always rendered and only
                // recolored so the name column never shifts.
                return (
                  <box
                    key={idx.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: rowBg,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    <text fg={sel ? ACCENT : rowBg}>{"▎"}</text>
                    <text fg={sel ? theme.textBright : theme.textDim} attributes={sel ? TextAttributes.BOLD : 0}>
                      {" " + truncate(idx.name, 30)}
                    </text>
                  </box>
                )
              })
            )}
          </box>

          <box
            title={selected ? selected.name : "Details"}
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
            {selected ? (
              <box style={{ flexDirection: "column", gap: 1 }}>
                <box style={{ flexDirection: "column" }}>
                  <SectionLabel text="CONFIGURATION" />
                  <Row label="Dimensions" value={selected.dimensions === null ? "—" : String(selected.dimensions)} />
                  <Row label="Similarity" value={selected.similarityFunction ?? "—"} />
                  <Row label="Index type" value={selected.indexType ?? "—"} />
                  <Row label="Embedding" value={selected.embeddingModel ?? "custom / none"} />
                </box>

                <box style={{ flexDirection: "column" }}>
                  <SectionLabel text="LIMITS" />
                  <Row label="Max vectors" value={num(selected.maxVectorCount, formatCompactNumber)} />
                  <Row label="Daily queries" value={num(selected.maxDailyQueries, formatCompactNumber)} />
                  <Row label="Daily updates" value={num(selected.maxDailyUpdates, formatCompactNumber)} />
                </box>

                <box style={{ flexDirection: "column" }}>
                  <SectionLabel text="CONNECTION" />
                  <Row label="Region" value={selected.region} />
                  <Row label="Plan" value={selected.type ?? "—"} />
                  <Row label="Endpoint" value={selected.endpoint ?? "—"} />
                  <Row label="Created" value={fmtDate(selected.createdAt)} />
                </box>
              </box>
            ) : (
              <text fg={theme.textDim}>No index selected.</text>
            )}
          </box>
        </box>
      )}

      <text fg={theme.textFaint}>
        ↑↓ select · s search · tab switch product · r refresh · esc {query ? "clear" : "home"}
        {live ? "" : "  ·  demo data — set UPSTASH creds for live"}
      </text>
    </box>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <box style={{ flexDirection: "row" }}>
      <text fg={theme.textDim}>{label.padEnd(15)}</text>
      <text fg={theme.textBright}>{value}</text>
    </box>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <text fg={theme.textFaint} attributes={TextAttributes.BOLD}>
      {text}
    </text>
  )
}

// Vector's creation_time is epoch milliseconds; render just the date.
function fmtDate(ms: number | null): string {
  if (ms == null) return "—"
  return new Date(ms).toISOString().slice(0, 10)
}
