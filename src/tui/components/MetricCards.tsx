import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"

export type MetricItem = { label: string; value: string; sub?: string; color?: string }

// A row of console-style summary cards: UPPERCASE label, big value, sub line.
export function MetricCards({ metrics }: { metrics: MetricItem[] }) {
  return (
    <box style={{ flexDirection: "row", gap: layout.gap }}>
      {metrics.map((m) => (
        <box
          key={m.label}
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
          }}
        >
          <text fg={theme.textFaint}>{m.label.toUpperCase()}</text>
          <text fg={m.color ?? theme.textBright} attributes={TextAttributes.BOLD}>
            {m.value}
          </text>
          <text fg={theme.textFaint}>{m.sub ?? ""}</text>
        </box>
      ))}
    </box>
  )
}
