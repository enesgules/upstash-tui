import { theme, layout } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost } from "../../format.ts"
import { MetricCards } from "./MetricCards.tsx"

export function SummaryCard({
  commands,
  storageBytes,
  cost,
}: {
  commands: number | null
  storageBytes: number | null
  cost: number | null
}) {
  return (
    <box style={{ flexDirection: "column", gap: layout.gap }}>
      <box style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 1, paddingRight: 1 }}>
        <text fg={theme.title}>Redis · Low-latency serverless key-value store</text>
      </box>
      <MetricCards
        metrics={[
          { label: "Commands", value: commands === null ? "—" : formatCompactNumber(commands), sub: "total" },
          { label: "Storage", value: storageBytes === null ? "—" : formatBytes(storageBytes), sub: "used" },
          { label: "Cost", value: cost === null ? "—" : formatCost(cost), sub: "this month" },
        ]}
      />
    </box>
  )
}
