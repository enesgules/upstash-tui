import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { formatBytes, formatCompactNumber, formatCost } from "../../format.ts"

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

export function SummaryCard({
  commands,
  storageBytes,
  cost,
}: {
  commands: number
  storageBytes: number
  cost: number
}) {
  return (
    <box
      title="Redis · Low-latency serverless key-value store"
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
      <Metric label="Commands" value={formatCompactNumber(commands)} />
      <Metric label="Storage" value={formatBytes(storageBytes)} />
      <Metric label="Cost" value={formatCost(cost)} />
    </box>
  )
}
