import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"

export type MetricItem = { label: string; value: string; sub?: string; color?: string }

// A row of console-style summary cards: UPPERCASE label, big value, sub line.
export function MetricCards({ metrics }: { metrics: MetricItem[] }) {
  return (
    // Wrap so many-metric views (e.g. Vector's 6 cards) flow onto multiple rows
    // instead of overflowing and clipping the rightmost card off-screen.
    <box style={{ flexDirection: "row", flexWrap: "wrap", gap: layout.gap }}>
      {metrics.map((m) => (
        <box
          key={m.label}
          style={{
            border: true,
            borderStyle: "rounded",
            borderColor: theme.border,
            backgroundColor: theme.bgPanel,
            flexGrow: 1,
            flexBasis: 18,
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
