import { theme } from "../../theme.ts"
import { barChart } from "../../charts.ts"

// A multi-row vertical bar chart rendered from block characters. Each row is a
// plain <text>, so it composes anywhere in the TUI grid.
export function BarChart({
  values,
  width = 44,
  height = 6,
  color = theme.accent,
}: {
  values: number[]
  width?: number
  height?: number
  color?: string
}) {
  const rows = barChart(values, width, height)
  return (
    <box style={{ flexDirection: "column" }}>
      {rows.map((row, i) => (
        <text key={i} fg={color}>
          {row}
        </text>
      ))}
    </box>
  )
}
