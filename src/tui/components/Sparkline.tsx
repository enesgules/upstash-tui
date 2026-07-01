import { theme } from "../../theme.ts"
import { sparkline } from "../../charts.ts"

export function Sparkline({
  values,
  color = theme.accent,
  width = 8,
}: {
  values: number[]
  color?: string
  width?: number
}) {
  return <text fg={color}>{sparkline(values, width)}</text>
}
