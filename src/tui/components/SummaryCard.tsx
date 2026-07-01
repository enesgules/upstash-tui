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
  synthetic,
}: {
  commands: number | null
  storageBytes: number | null
  cost: number | null
  synthetic?: boolean
}) {
  return (
    <box
      title="Redis · Low-latency serverless key-value store"
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
      <Metric label="Commands" value={commands === null ? "—" : formatCompactNumber(commands)} />
      <Metric label="Storage" value={storageBytes === null ? "—" : formatBytes(storageBytes)} />
      <Metric label="Cost" value={cost === null ? "—" : formatCost(cost)} />
      {synthetic ? <text fg={theme.textFaint}>~ sample metrics</text> : null}
    </box>
  )
}
