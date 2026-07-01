import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme, layout, productColors } from "../../theme.ts"
import type { UpstashCreds } from "../../config.ts"
import type { VectorIndex } from "../../api/vector.ts"
import { listIndexes } from "../../api/vector.ts"
import { mockIndexes } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"

const ACCENT = productColors.vector

export function VectorView({ creds, onHome }: { creds: UpstashCreds | null; onHome: () => void }) {
  const live = !!creds
  const [indexes, setIndexes] = useState<VectorIndex[]>(live ? [] : mockIndexes)
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  async function load() {
    if (!creds) return
    setLoading(true)
    setError(null)
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

  useKeyboard((key) => {
    if (key.name === "escape") onHome()
    else if (key.name === "r") void load()
    else if (key.name === "up" || key.name === "k") setSelectedIndex((i) => Math.max(0, i - 1))
    else if (key.name === "down" || key.name === "j") setSelectedIndex((i) => Math.min(indexes.length - 1, i + 1))
  })

  const selected = indexes[selectedIndex]

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

      <box
        title="Vector · Serverless vector database"
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
        <text fg={theme.textDim}>Indexes</text>
        <text fg={theme.textBright} attributes={TextAttributes.BOLD}>
          {String(indexes.length)}
        </text>
      </box>

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
              padding: 1,
            }}
          >
            {indexes.length === 0 ? (
              <text fg={theme.textFaint}>No indexes yet</text>
            ) : (
              indexes.map((idx, i) => {
                const sel = i === selectedIndex
                return (
                  <box
                    key={idx.id}
                    style={{
                      backgroundColor: sel ? theme.accentDim : theme.bgPanel,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    <text fg={sel ? theme.textBright : theme.textDim} attributes={sel ? TextAttributes.BOLD : 0}>
                      {idx.name}
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
              <box style={{ flexDirection: "column" }}>
                <Row label="Region" value={selected.region} />
                <Row label="Type" value={selected.type ?? "—"} />
                <Row label="Dimensions" value={selected.dimensions === null ? "—" : String(selected.dimensions)} />
                <Row label="Similarity" value={selected.similarityFunction ?? "—"} />
                <Row label="Endpoint" value={selected.endpoint ?? "—"} />
              </box>
            ) : (
              <text fg={theme.textDim}>No index selected.</text>
            )}
          </box>
        </box>
      )}

      <text fg={theme.textFaint}>↑↓ select · r refresh · esc home{live ? "" : "  ·  demo data — set UPSTASH creds in .env for live"}</text>
    </box>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <box style={{ flexDirection: "row" }}>
      <text fg={theme.textDim}>{label.padEnd(12)}</text>
      <text fg={theme.textBright}>{value}</text>
    </box>
  )
}
